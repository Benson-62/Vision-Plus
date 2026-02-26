import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, ShieldAlert } from "lucide-react";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function AdminAudit() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (localStorage.getItem("role") !== "admin") {
            navigate("/");
            return;
        }
        fetchAuditLogs();
    }, [navigate]);

    async function fetchAuditLogs() {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/admin/audit?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(isoString) {
        if (!isoString) return "";
        const d = new Date(isoString);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return (
        <Layout title="System Audit Logs">
            <div className="attendance-page">
                <div className="attendance-card" style={{ maxWidth: 900, margin: "0 auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                        <ShieldAlert size={28} color="var(--danger)" />
                        <div>
                            <h3 className="section-title" style={{ margin: 0 }}>Modification Audit Trail</h3>
                            <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "14px" }}>
                                Tracks all manual edits made to attendance records by administrators.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p>Loading trace logs...</p>
                    ) : logs.length === 0 ? (
                        <p className="empty-text">No modifications have been recorded.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {logs.map((log, index) => (
                                <div key={index} style={{
                                    padding: "16px",
                                    background: "var(--bg)",
                                    borderRadius: "12px",
                                    borderLeft: "4px solid var(--danger)",
                                    borderTop: "1px solid var(--border)",
                                    borderRight: "1px solid var(--border)",
                                    borderBottom: "1px solid var(--border)"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <History size={16} color="var(--muted)" />
                                            <span style={{ fontSize: "14px", color: "var(--muted)" }}>{formatTime(log.timestamp || log.edited_at)}</span>
                                        </div>
                                        <span style={{ fontSize: "13px", background: "rgba(220,38,38,0.1)", color: "#dc2626", padding: "4px 8px", borderRadius: "12px", fontWeight: 600 }}>
                                            Edited by: {log.edited_by}
                                        </span>
                                    </div>

                                    {log.old_data && log.new_data ? (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                            <div style={{ background: "rgba(239,68,68,0.05)", padding: 12, borderRadius: 8, border: "1px solid rgba(239,68,68,0.1)" }}>
                                                <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>Previous Data</p>
                                                <pre style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                                                    {JSON.stringify(log.old_data, null, 2)}
                                                </pre>
                                            </div>
                                            <div style={{ background: "rgba(16,185,129,0.05)", padding: 12, borderRadius: 8, border: "1px solid rgba(16,185,129,0.1)" }}>
                                                <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600, color: "var(--success)" }}>New Data</p>
                                                <pre style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                                                    {JSON.stringify(log.new_data, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8 }}>
                                            <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Raw Log (Legacy)</p>
                                            <pre style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                                                {JSON.stringify(log.before || log, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
