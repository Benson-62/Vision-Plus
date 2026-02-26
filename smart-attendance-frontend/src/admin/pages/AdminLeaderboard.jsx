import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Medal, CheckCircle2 } from "lucide-react";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function AdminLeaderboard() {
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (localStorage.getItem("role") !== "admin") {
            navigate("/");
            return;
        }
        fetchLeaderboard();
    }, [navigate]);

    async function fetchLeaderboard() {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/admin/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
            }
        } catch (err) {
            console.error("Failed to load leaderboard:", err);
        } finally {
            setLoading(false);
        }
    }

    function getBadgeIcon(badge) {
        switch (badge) {
            case "Gold":
                return <Award size={24} color="#fbbf24" />;
            case "Silver":
                return <Medal size={24} color="#9ca3af" />;
            case "Bronze":
                return <Medal size={24} color="#b45309" />;
            default:
                return <CheckCircle2 size={24} color="var(--muted)" />;
        }
    }

    function getBadgeColor(badge) {
        switch (badge) {
            case "Gold":
                return "rgba(251, 191, 36, 0.1)";
            case "Silver":
                return "rgba(156, 163, 175, 0.1)";
            case "Bronze":
                return "rgba(180, 83, 9, 0.1)";
            default:
                return "transparent";
        }
    }

    function getBadgeTextColor(badge) {
        switch (badge) {
            case "Gold":
                return "#fbbf24";
            case "Silver":
                return "#9ca3af";
            case "Bronze":
                return "#b45309";
            default:
                return "var(--muted)";
        }
    }

    return (
        <Layout title="Performance Leaderboard">
            <div className="attendance-page">
                <div className="attendance-card">
                    <h3 className="section-title">Employee Performance Rankings</h3>
                    <p style={{ color: "var(--muted)", marginBottom: 24 }}>
                        Rankings are calculated based on attendance consistency, overtime hours, and penalized for late entries or early exits.
                    </p>

                    {loading ? (
                        <p>Loading leaderboard...</p>
                    ) : leaderboard.length === 0 ? (
                        <p className="empty-text">No data available for this month.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {leaderboard.map((emp, index) => (
                                <div key={emp.email} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "16px 20px",
                                    background: "var(--bg)",
                                    borderRadius: "12px",
                                    border: "1px solid var(--border)"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: "50%",
                                            background: "var(--bg-card)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            fontSize: "18px",
                                            color: index < 3 ? "var(--text)" : "var(--muted)",
                                            border: `2px solid ${getBadgeTextColor(emp.badge)}`
                                        }}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: "16px" }}>{emp.name}</h4>
                                            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
                                                {emp.branch} • {emp.attendance_pct}% Attendance
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "20px", fontWeight: "bold", color: "var(--primary)" }}>
                                                {emp.score} <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "normal" }}>pts</span>
                                            </span>
                                        </div>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            background: getBadgeColor(emp.badge),
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            border: `1px solid ${getBadgeTextColor(emp.badge)}`
                                        }}>
                                            {getBadgeIcon(emp.badge)}
                                            <span style={{ fontWeight: 600, color: getBadgeTextColor(emp.badge) }}>
                                                {emp.badge}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
