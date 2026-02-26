import React, { useState } from "react";
import Layout from "../components/Layout";
import { Upload, File } from "lucide-react";
import "../styles/dashboard.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function FileUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

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
            </div>
        </Layout>
    );
}
