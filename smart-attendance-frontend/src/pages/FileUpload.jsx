import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Upload, File, FileText, Download, Clock } from "lucide-react";
import "../styles/dashboard.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [uploadHistory, setUploadHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/upload/history`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUploadHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch upload history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };


    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage({ type: "error", text: "Please select a file first." });
            return;
        }

        setLoading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/upload/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Upload failed");
            }

            setMessage({ type: "success", text: `File uploaded successfully! Available at: ${data.url}` });
            setFile(null);

            // Add to history instantly
            if (data.record) {
                setUploadHistory(prev => [data.record, ...prev]);
            }

            // Reset input
            document.getElementById("file-input").value = "";
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Upload Files">
            <div className="dashboard-container" style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div className="card" style={{ padding: "30px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ marginBottom: "20px", marginTop: "0", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Upload size={24} color="var(--primary)" />
                        Secure File Upload
                    </h2>
                    <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
                        Upload your documents securely. Supported formats: .pdf, .jpg, .png, .docx. Maximum size: 5MB.
                    </p>

                    {message && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "20px",
                            background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: message.type === "success" ? "#10b981" : "#ef4444",
                            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                            wordBreak: "break-all"
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{
                            border: "2px dashed var(--border)",
                            borderRadius: "12px",
                            padding: "40px 20px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "border-color 0.2s",
                            position: "relative"
                        }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                            <input
                                id="file-input"
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.jpg,.jpeg,.png,.docx"
                                style={{
                                    opacity: 0,
                                    position: "absolute",
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    width: "100%", height: "100%", cursor: "pointer"
                                }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", pointerEvents: "none" }}>
                                {file ? (
                                    <>
                                        <File size={48} color="var(--primary)" />
                                        <span style={{ fontWeight: "500", color: "var(--text)" }}>{file.name}</span>
                                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={48} color="var(--muted)" />
                                        <span style={{ fontWeight: "500", color: "var(--text)" }}>Click or drag file to this area to upload</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !file}
                            style={{
                                padding: "12px",
                                borderRadius: "8px",
                                background: (!file || loading) ? "var(--muted)" : "var(--primary)",
                                color: "white",
                                border: "none",
                                fontWeight: "600",
                                cursor: (!file || loading) ? "not-allowed" : "pointer"
                            }}
                        >
                            {loading ? "Uploading..." : "Upload File"}
                        </button>
                    </form>
                </div>

                {/* Upload History Section */}
                <div className="card" style={{ padding: "30px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", marginTop: "30px" }}>
                    <h3 style={{ marginBottom: "20px", marginTop: "0", display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem", fontWeight: "600" }}>
                        <Clock size={20} color="var(--primary)" />
                        Upload History
                    </h3>

                    {loadingHistory ? (
                        <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>Loading history...</p>
                    ) : uploadHistory.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", background: "var(--background)", borderRadius: "8px" }}>
                            <FileText size={40} color="var(--border)" style={{ marginBottom: "10px" }} />
                            <p style={{ margin: 0 }}>No files uploaded yet.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                                        <th style={{ padding: "12px 16px", fontWeight: "600" }}>File Name</th>
                                        <th style={{ padding: "12px 16px", fontWeight: "600" }}>Size</th>
                                        <th style={{ padding: "12px 16px", fontWeight: "600" }}>Uploaded At</th>
                                        <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "right" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadHistory.map((item) => (
                                        <tr key={item._id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--background)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                                <div style={{ background: "rgba(79, 70, 229, 0.1)", padding: "8px", borderRadius: "8px" }}>
                                                    <FileText size={16} color="var(--primary)" />
                                                </div>
                                                <span style={{ fontWeight: "500", color: "var(--text)", wordBreak: "break-all" }}>{item.filename}</span>
                                            </td>
                                            <td style={{ padding: "16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                                                {(item.size / 1024 / 1024).toFixed(2)} MB
                                            </td>
                                            <td style={{ padding: "16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                                                {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                <br />
                                                <span style={{ fontSize: "0.8rem" }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td style={{ padding: "16px", textAlign: "right" }}>
                                                <a
                                                    href={`${BASE_URL}${item.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--primary)", textDecoration: "none", fontWeight: "500", fontSize: "0.9rem", padding: "6px 12px", borderRadius: "6px", background: "rgba(79, 70, 229, 0.05)", transition: "background 0.2s" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(79, 70, 229, 0.15)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(79, 70, 229, 0.05)"}
                                                >
                                                    <Download size={14} /> View
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
