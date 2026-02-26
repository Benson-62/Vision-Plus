import React, { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css"; // Reuse existing styles

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function LeaveApplication() {
    const navigate = useNavigate();
    const [leaveType, setLeaveType] = useState("Full Day");
    const [date, setDate] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    React.useEffect(() => {
        fetchLeaveHistory();
    }, []);

    const fetchLeaveHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/leave/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "success") {
                setHistory(data.history || []);
            }
        } catch (err) {
            console.error("Failed to fetch leave history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const email = localStorage.getItem("email");

        // Format date as "DD MMM YYYY" like the backend expects
        const dateObj = new Date(date);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/leave/apply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: email,
                    leave_type: leaveType,
                    date: formattedDate,
                    reason: reason
                })
            });

            const data = await res.json();
            if (data.status === "success") {
                setMessage({ type: "success", text: "Leave application submitted successfully!" });
                setLeaveType("Full Day");
                setDate("");
                setReason("");
            } else {
                setMessage({ type: "error", text: data.detail || "Failed to submit application." });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Network error occurred." });
        } finally {
            setLoading(false);
            fetchLeaveHistory();
        }
    };

    return (
        <Layout title="Apply for Leave">
            <div className="dashboard-container" style={{ maxWidth: "600px", margin: "0 auto" }}>

                <div className="card" style={{ padding: "30px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ marginBottom: "20px", marginTop: "0" }}>Leave Application Form</h2>

                    {message && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "8px",
                            marginBottom: "20px",
                            background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: message.type === "success" ? "#10b981" : "#ef4444",
                            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontWeight: "500" }}>Leave Type</label>
                            <select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                                required
                                style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--bg)", border: `1px solid var(--border)`, color: "var(--text)" }}
                            >
                                <option value="Full Day" style={{ color: "#000" }}>Full Day</option>
                                <option value="Half Day" style={{ color: "#000" }}>Half Day</option>
                                <option value="Sick" style={{ color: "#000" }}>Sick</option>
                                <option value="Casual" style={{ color: "#000" }}>Casual</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontWeight: "500" }}>Select Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--bg)", border: `1px solid var(--border)`, color: "var(--text)" }}
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontWeight: "500" }}>Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                rows="4"
                                placeholder="Please state your reason for leave..."
                                style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--bg)", border: `1px solid var(--border)`, color: "var(--text)", resize: "vertical" }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: "10px"
                            }}
                        >
                            {loading ? "Submitting..." : "Submit Leave Application"}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ padding: "30px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", marginTop: "32px", width: "100%" }}>
                    <h2 style={{ marginBottom: "20px", marginTop: "0" }}>My Leave History</h2>
                    {loadingHistory ? (
                        <p style={{ color: "var(--muted)" }}>Loading history...</p>
                    ) : history.length === 0 ? (
                        <p style={{ color: "var(--muted)" }}>No past leave applications found.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                                        <th style={{ padding: "12px 8px" }}>Applied On</th>
                                        <th style={{ padding: "12px 8px" }}>Leave Date</th>
                                        <th style={{ padding: "12px 8px" }}>Type</th>
                                        <th style={{ padding: "12px 8px" }}>Reason</th>
                                        <th style={{ padding: "12px 8px" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((record, idx) => (
                                        <tr key={record._id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                            <td style={{ padding: "12px 8px" }}>{new Date(record.applied_at).toLocaleDateString()}</td>
                                            <td style={{ padding: "12px 8px", fontWeight: "500", color: "var(--text)" }}>{record.date}</td>
                                            <td style={{ padding: "12px 8px" }}>{record.leave_type}</td>
                                            <td style={{ padding: "12px 8px", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{record.reason}</td>
                                            <td style={{ padding: "12px 8px" }}>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    background: record.status === "Approved" ? "rgba(16, 185, 129, 0.1)" : record.status === "Rejected" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                                    color: record.status === "Approved" ? "#10b981" : record.status === "Rejected" ? "#ef4444" : "#f59e0b"
                                                }}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: "20px", textAlign: "center" }}>
                    <button
                        onClick={() => navigate("/dashboard")}
                        style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                        Back to Dashboard
                    </button>
                </div>

            </div>
        </Layout>
    );
}
