import { useState } from "react";
import { Send, Megaphone } from "lucide-react";
import Layout from "../../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminBroadcast() {
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setStatus("Sending...");

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("message", message);

            const res = await fetch(`${BASE_URL}/admin/broadcast`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                setStatus("Broadcast sent successfully to all active clients!");
                setMessage("");
            } else {
                setStatus("Failed to send broadcast.");
            }
        } catch (e) {
            console.error(e);
            setStatus("Error sending broadcast.");
        }

        setTimeout(() => setStatus(""), 4000);
    };

    return (
        <Layout title="Admin Broadcast">
            <div className="dashboard-container" style={{ maxWidth: "600px", margin: "0 auto" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px", padding: "24px", background: "color-mix(in srgb, var(--primary) 15%, transparent)", borderRadius: "20px" }}>
                    <div style={{ padding: "16px", background: "var(--primary)", borderRadius: "50%", color: "white" }}>
                        <Megaphone size={32} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "24px", color: "var(--primary)" }}>System Broadcast</h2>
                        <p style={{ margin: "4px 0 0 0", color: "var(--text)" }}>Send an instant notification to everyone.</p>
                    </div>
                </div>

                <div className="card" style={{ padding: "32px" }}>
                    <form onSubmit={handleBroadcast}>
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Announcement Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your broadcast message here..."
                                style={{
                                    width: "100%",
                                    minHeight: "150px",
                                    padding: "16px",
                                    borderRadius: "12px",
                                    border: "1px solid var(--border)",
                                    background: "var(--bg)",
                                    color: "var(--text)",
                                    resize: "vertical",
                                    fontSize: "15px",
                                    outline: "none",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!message.trim()}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "none",
                                background: "var(--primary)",
                                color: "white",
                                fontSize: "16px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                cursor: message.trim() ? "pointer" : "not-allowed",
                                opacity: message.trim() ? 1 : 0.6
                            }}
                        >
                            <Send size={18} /> Send to All Devices
                        </button>
                    </form>

                    {status && (
                        <div style={{
                            marginTop: "20px",
                            padding: "12px",
                            borderRadius: "8px",
                            background: status.includes("success") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: status.includes("success") ? "#10b981" : "#ef4444",
                            textAlign: "center",
                            fontWeight: "600"
                        }}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
