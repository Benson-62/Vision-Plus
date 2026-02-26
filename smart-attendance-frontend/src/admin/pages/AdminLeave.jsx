import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import "../styles/admin.css"; // Reuse admin styles

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminLeave() {
    const [requests, setRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending");

    useEffect(() => {
        if (activeTab === "pending") {
            fetchPendingLeaves();
        } else {
            fetchLeaveHistory();
        }
    }, [activeTab]);

    async function fetchPendingLeaves() {
        setLoading(true);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${BASE_URL}/leave/admin/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchLeaveHistory() {
        setLoading(true);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${BASE_URL}/leave/admin/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setHistory(data);
            } else {
                setHistory([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(requestId, action) {
        const endpoint = action === "approve" ? "/leave/admin/approve" : "/leave/admin/reject";
        try {
            const formData = new URLSearchParams();
            formData.append("request_id", requestId);

            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Bearer ${token}`
                },
                body: formData.toString()
            });

            const result = await res.json();
            if (result.status === "success") {
                fetchPendingLeaves();
            } else {
                alert("Failed to process request: " + result.detail);
            }
        } catch (err) {
            console.error(err);
            alert("Error processing leave request.");
        }
    }

    return (
        <Layout title="Leave Requests">
            <div className="dashboard-container">
                <div style={{ display: "flex", gap: "20px", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                        onClick={() => setActiveTab("pending")}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: activeTab === "pending" ? "var(--primary)" : "var(--muted)",
                            fontSize: "18px",
                            fontWeight: activeTab === "pending" ? "700" : "500",
                            paddingBottom: "10px",
                            borderBottom: activeTab === "pending" ? "3px solid var(--primary)" : "3px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Pending Requests
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: activeTab === "history" ? "var(--primary)" : "var(--muted)",
                            fontSize: "18px",
                            fontWeight: activeTab === "history" ? "700" : "500",
                            paddingBottom: "10px",
                            borderBottom: activeTab === "history" ? "3px solid var(--primary)" : "3px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        History Log
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: "var(--muted)" }}>Loading...</p>
                ) : activeTab === "pending" ? (
                    requests.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <p style={{ color: "var(--muted)" }}>No pending leave requests.</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "16px" }}>
                            {requests.map(req => (
                                <div key={req._id} style={{
                                    background: "var(--card-bg)",
                                    border: "1px solid var(--border)",
                                    padding: "20px",
                                    borderRadius: "12px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                                }}>
                                    <div>
                                        <h3 style={{ margin: "0 0 8px 0", color: "var(--text)" }}>{req.employee_name} ({req.employee_email})</h3>
                                        <p style={{ margin: "0 0 4px 0", color: "var(--muted)" }}><strong>Type:</strong> {req.leave_type}</p>
                                        <p style={{ margin: "0 0 4px 0", color: "var(--muted)" }}><strong>Date:</strong> {req.date}</p>
                                        <p style={{ margin: "0", color: "var(--muted)" }}><strong>Reason:</strong> {req.reason}</p>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => handleAction(req._id, "approve")}
                                            style={{ padding: "8px 16px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(req._id, "reject")}
                                            style={{ padding: "8px 16px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    history.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                            <p style={{ color: "var(--muted)" }}>No past leave requests yet.</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: "20px", overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", color: "var(--text)" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                        <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Employee</th>
                                        <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Date</th>
                                        <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Type</th>
                                        <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Status</th>
                                        <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Processed By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(req => (
                                        <tr key={req._id} style={{ borderBottom: "1px solid var(--border)" }}>
                                            <td style={{ padding: "12px 10px" }}>
                                                <div style={{ fontWeight: 600 }}>{req.employee_name}</div>
                                                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{req.employee_email}</div>
                                            </td>
                                            <td style={{ padding: "12px 10px" }}>{req.date}</td>
                                            <td style={{ padding: "12px 10px" }}>{req.leave_type}</td>
                                            <td style={{ padding: "12px 10px" }}>
                                                <span style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    background: req.status === "Approved" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                    color: req.status === "Approved" ? "#10b981" : "#ef4444"
                                                }}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 10px", fontSize: "13px", color: "var(--muted)" }}>
                                                {req.approved_by || req.rejected_by || "--"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </Layout>
    );
}
