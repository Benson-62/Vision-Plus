import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";

export default function NotificationBell() {
    const { notifications, unreadCount, markNotificationsRead } = useWebSocket();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            markNotificationsRead();
        }
    };

    return (
        <div style={{ position: "relative" }} ref={containerRef}>
            <button
                onClick={toggleOpen}
                style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    cursor: "pointer",
                    position: "relative",
                    padding: "8px"
                }}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "2px",
                        right: "2px",
                        background: "red",
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                        borderRadius: "50%",
                        padding: "2px 6px"
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    width: "300px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    zIndex: 999,
                    maxHeight: "400px",
                    overflowY: "auto",
                    marginTop: "10px"
                }}>
                    <div style={{
                        padding: "16px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <h4 style={{ margin: 0, color: "var(--text)" }}>Notifications</h4>
                    </div>

                    <div style={{ padding: "8px" }}>
                        {notifications.length === 0 ? (
                            <p style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0" }}>No new notifications</p>
                        ) : (
                            notifications.map((n, i) => (
                                <div key={i} style={{
                                    padding: "12px",
                                    borderRadius: "8px",
                                    marginBottom: "8px",
                                    background: n.type === "broadcast" ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--card)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)"
                                }}>
                                    <strong style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: n.type === "broadcast" ? "var(--primary)" : "inherit" }}>
                                        {n.title} {n.type === "broadcast" && "📢"}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
