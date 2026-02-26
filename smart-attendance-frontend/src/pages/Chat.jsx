import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Send, User, Paperclip, File as FileIcon, Users, Plus, X } from "lucide-react";
import Layout from "../components/Layout";
import { useWebSocket } from "../context/WebSocketContext";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Chat() {
    const navigate = useNavigate();
    const { messages, sendMessage, isConnected } = useWebSocket();
    const [inputText, setInputText] = useState("");
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeMsgMenu, setActiveMsgMenu] = useState(null); // The ID of the message to show menu

    // Create Group Modal State
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const currentUserEmail = localStorage.getItem("email");

    useEffect(() => {
        // Fetch all employees and groups
        const fetchUsersAndGroups = async () => {
            try {
                const token = localStorage.getItem("token");
                const [resUsers, resGroups] = await Promise.all([
                    fetch(`${BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${BASE_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                if (resUsers.status === 401 || resGroups.status === 401) {
                    localStorage.removeItem("token");
                    navigate("/");
                    return;
                }

                if (resUsers.ok) {
                    const data = await resUsers.json();
                    setUsers(data.filter(u => u.email !== currentUserEmail));
                }
                if (resGroups.ok) {
                    const data = await resGroups.json();
                    setGroups(data.map(g => ({ ...g, isGroup: true })));
                }
            } catch (e) {
                console.error("Failed to load users/groups", e);
            }
        };

        const fetchOnlineUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${BASE_URL}/users/online`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setOnlineUsers(data);
                }
            } catch (e) { }
        };

        fetchUsersAndGroups();
        fetchOnlineUsers();
        const onlineInterval = setInterval(fetchOnlineUsers, 10000); // poll every 10s
        return () => clearInterval(onlineInterval);
    }, [currentUserEmail, navigate]);

    useEffect(() => {
        if (!selectedUser) return;

        // Fetch chat history with selected user or group
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem("token");
                const url = selectedUser.isGroup
                    ? `${BASE_URL}/messages?other_email=${selectedUser._id}&is_group=true`
                    : `${BASE_URL}/messages?other_email=${selectedUser.email}`;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
        };
        fetchHistory();
    }, [selectedUser]);

    useEffect(() => {
        // Scroll to bottom on new message
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, messages]);

    const handleSend = (e) => {
        if (e) e.preventDefault();
        if (!isConnected || !selectedUser) return;
        if (!inputText.trim()) return;

        sendMessage(
            selectedUser.isGroup ? selectedUser._id : selectedUser.email,
            inputText,
            null,
            selectedUser.isGroup ? "group" : "user"
        );
        setInputText("");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/messages/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                sendMessage(
                    selectedUser.isGroup ? selectedUser._id : selectedUser.email,
                    inputText,
                    data,
                    selectedUser.isGroup ? "group" : "user"
                );
                setInputText("");
            }
        } catch (err) {
            console.error("File upload failed", err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedMembers.length === 0) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/groups`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newGroupName,
                    members: selectedMembers
                })
            });
            if (res.ok) {
                const data = await res.json();
                setGroups([{ ...data, isGroup: true }, ...groups]);
                setShowCreateGroup(false);
                setNewGroupName("");
                setSelectedMembers([]);
            }
        } catch (e) {
            console.error("Failed to create group", e);
        }
    };

    const handleDeleteMessage = async (msgId, forEveryone) => {
        try {
            const token = localStorage.getItem("token");
            const endpoint = forEveryone ? `/messages/everyone/${msgId}` : `/messages/me/${msgId}`;
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Update local history
                if (forEveryone) {
                    setHistory(prev => prev.map(m => m._id === msgId ? { ...m, is_deleted: true, deleted_for_everyone: true, message: "Message Deleted", file: null } : m));
                } else {
                    setHistory(prev => prev.filter(m => m._id !== msgId));
                }
            }
        } catch (e) {
            console.error("Failed to delete message", e);
        }
        setActiveMsgMenu(null);
    };

    // Combine fetched history with new live messages for this chat
    const liveMessages = messages.filter(
        m => {
            if (m.type !== "chat") return false;
            if (selectedUser?.isGroup) {
                return m.receiver === selectedUser._id && m.receiver_type === "group";
            } else {
                return (m.sender === selectedUser?.email || m.receiver === selectedUser?.email) && m.receiver_type !== "group";
            }
        }
    );

    // Deduplicate by timestamp/content roughly, or just rely on WS for new ones
    // Real-world scenarios would use unique message IDs. 
    // Here we'll identify duplicates if they have the exact same timestamp and content.
    const allMessages = [...history, ...liveMessages];
    const displayMessages = allMessages.filter((msg, index, self) =>
        index === self.findIndex((t) => (
            t.timestamp === msg.timestamp && t.message === msg.message
        ))
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Memoize the sorted arrays to prevent React Concurrent Mode rendering crashes
    const { sortedGroups, sortedUsers } = useMemo(() => {
        const getLatestActivity = (id, type) => {
            let latest = 0; // Default epoch

            // Check new WebSocket messages first
            for (let i = messages.length - 1; i >= 0; i--) {
                const m = messages[i];
                if (type === "group" && m.receiver_type === "group" && m.receiver === id) {
                    return new Date(m.timestamp).getTime();
                }
                if (type === "user" && m.receiver_type !== "group" && (m.sender === id || m.receiver === id)) {
                    return new Date(m.timestamp).getTime();
                }
            }

            // Fallback to group creation date if it exists
            if (type === "group") {
                const grp = groups.find(g => g._id === id);
                if (grp?.created_at) return new Date(grp.created_at).getTime();
            }

            return latest;
        };

        const gSorted = [...groups].sort((a, b) => getLatestActivity(b._id, "group") - getLatestActivity(a._id, "group"));
        const uSorted = [...users].sort((a, b) => getLatestActivity(b.email, "user") - getLatestActivity(a.email, "user"));

        return { sortedGroups: gSorted, sortedUsers: uSorted };
    }, [groups, users, messages]);

    return (
        <Layout title="Messages" maxWidth={1000}>
            <div style={{ display: "flex", height: "75vh", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>

                {/* Sidebar */}
                <div style={{ width: "320px", display: "flex", flexDirection: "column", background: "color-mix(in srgb, var(--card) 60%, transparent)", borderRight: "1px solid var(--border)" }}>
                    <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--text)" }}>Chats</h3>
                        <div
                            title="Create Group"
                            onClick={() => setShowCreateGroup(true)}
                            style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "1px solid var(--border)" }}>
                            <Plus size={16} color="var(--text)" />
                        </div>
                    </div>
                    <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
                        {sortedGroups.map(g => {
                            const isSelected = selectedUser?.isGroup && selectedUser._id === g._id;
                            return (
                                <div
                                    key={g._id}
                                    onClick={() => setSelectedUser({ ...g, isGroup: true })}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "12px",
                                        marginBottom: "4px",
                                        cursor: "pointer",
                                        background: isSelected ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    <div style={{ minWidth: "48px", height: "48px", background: "color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Users size={24} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: "600", fontSize: "15px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                                        <div style={{ fontSize: "13px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.members.length} members</div>
                                    </div>
                                </div>
                            );
                        })}
                        {sortedUsers.map(u => {
                            const isSelected = !selectedUser?.isGroup && selectedUser?.email === u.email;
                            return (
                                <div
                                    key={u.email}
                                    onClick={() => setSelectedUser(u)}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "12px",
                                        marginBottom: "4px",
                                        cursor: "pointer",
                                        background: isSelected ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    <div style={{ minWidth: "48px", height: "48px", background: "color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <User size={24} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: "600", fontSize: "15px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                                        <div style={{ fontSize: "13px", color: onlineUsers.includes(u.email) ? "var(--success)" : "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {onlineUsers.includes(u.email) ? "Online" : u.email}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "color-mix(in srgb, var(--bg) 95%, var(--text) 5%)", position: "relative" }}>
                    {/* Chat Background Pattern (Subtle dots) */}
                    <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(var(--text) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }}></div>

                    {selectedUser ? (
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", zIndex: 1 }}>
                            {/* Header */}
                            <div style={{ padding: "16px 24px", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div
                                    style={{ display: "flex", alignItems: "center", gap: "16px", cursor: selectedUser.isGroup ? "pointer" : "default" }}
                                    onClick={() => selectedUser.isGroup && setShowGroupInfo(true)}
                                >
                                    <div style={{ width: "40px", height: "40px", background: "color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {selectedUser.isGroup ? <Users size={20} color="var(--primary)" /> : <User size={20} color="var(--primary)" />}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: "16px", color: "var(--text)" }}>{selectedUser.name}</h4>
                                        <span style={{ fontSize: "12px", color: selectedUser.isGroup || onlineUsers.includes(selectedUser.email) ? "var(--success)" : "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <div style={{ width: "8px", height: "8px", background: selectedUser.isGroup || onlineUsers.includes(selectedUser.email) ? "var(--success)" : "var(--muted)", borderRadius: "50%" }}></div>
                                            {selectedUser.isGroup ? `${selectedUser.members?.length || 0} Members (Click to view)` : (onlineUsers.includes(selectedUser.email) ? "Online" : "Offline")}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                {displayMessages.map((msg, i) => {
                                    const isMe = msg.sender === currentUserEmail;

                                    // Group messages from same sender (basic logic)
                                    const isLast = i === displayMessages.length - 1;
                                    const nextMsgMe = !isLast && displayMessages[i + 1].sender === currentUserEmail;

                                    return (
                                        <div key={i} style={{
                                            alignSelf: isMe ? "flex-end" : "flex-start",
                                            background: isMe ? "var(--primary)" : "var(--card)",
                                            color: isMe ? "white" : "var(--text)",
                                            padding: "8px 12px",
                                            borderRadius: "16px",
                                            borderBottomRightRadius: isMe ? (nextMsgMe ? "16px" : "4px") : "16px",
                                            borderBottomLeftRadius: !isMe ? (!nextMsgMe ? "4px" : "16px") : "16px",
                                            maxWidth: "65%",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                            position: "relative",
                                            display: "flex",
                                            flexDirection: "column",
                                            minWidth: "120px"
                                        }}>
                                            {selectedUser.isGroup && !isMe && (
                                                <div style={{ fontSize: "12px", fontWeight: "600", color: "color-mix(in srgb, var(--text) 50%, var(--primary) 50%)", marginBottom: "4px" }}>
                                                    {msg.sender.split("@")[0]}
                                                </div>
                                            )}
                                            {msg.file && (
                                                <div style={{ marginBottom: msg.message ? "8px" : "0", borderRadius: "8px", overflow: "hidden" }}>
                                                    {msg.file.type?.startsWith("image/") ? (
                                                        <a href={`${BASE_URL}${msg.file.url}`} target="_blank" rel="noreferrer">
                                                            <img src={`${BASE_URL}${msg.file.url}`} alt="attachment" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", display: "block" }} />
                                                        </a>
                                                    ) : (
                                                        <a href={`${BASE_URL}${msg.file.url}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", color: "inherit", textDecoration: "none", background: "rgba(0,0,0,0.1)", padding: "8px 12px", borderRadius: "8px" }}>
                                                            <FileIcon size={20} />
                                                            <span style={{ fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "150px" }}>{msg.file.filename}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {msg.message && (
                                                <div style={{ fontSize: "15px", lineHeight: "1.4", paddingRight: "30px", paddingBottom: "8px", wordBreak: "break-word", fontStyle: msg.deleted_for_everyone ? "italic" : "normal", opacity: msg.deleted_for_everyone ? 0.7 : 1 }}>
                                                    {msg.message}
                                                </div>
                                            )}
                                            <div style={{
                                                fontSize: "11px",
                                                opacity: isMe ? 0.8 : 0.6,
                                                position: "absolute",
                                                bottom: "6px",
                                                right: "10px",
                                            }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            {/* Delete Menu */}
                                            {msg._id && !msg.deleted_for_everyone && (
                                                <div
                                                    onClick={() => setActiveMsgMenu(activeMsgMenu === msg._id ? null : msg._id)}
                                                    style={{ position: "absolute", top: "5px", right: "5px", cursor: "pointer", opacity: 0.5 }}
                                                >
                                                    ⋮
                                                    {activeMsgMenu === msg._id && (
                                                        <div style={{
                                                            position: "absolute", top: "15px", right: "0", background: "var(--card)",
                                                            border: "1px solid var(--border)", borderRadius: "8px", zIndex: 10,
                                                            width: "150px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", overflow: "hidden"
                                                        }}>
                                                            <div onClick={() => handleDeleteMessage(msg._id, false)} style={{ padding: "8px 12px", color: "var(--text)", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                                                                Delete for me
                                                            </div>
                                                            {isMe && (
                                                                <div onClick={() => handleDeleteMessage(msg._id, true)} style={{ padding: "8px 12px", color: "var(--danger)", fontSize: "13px", cursor: "pointer", background: "var(--bg)" }}>
                                                                    Delete for everyone
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Input */}
                            <div style={{ padding: "16px 24px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: "12px", alignItems: "center" }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!isConnected || isUploading}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--muted)",
                                        cursor: isUploading ? "wait" : "pointer",
                                        padding: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <Paperclip size={24} />
                                </button>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyPress={e => e.key === "Enter" && handleSend(e)}
                                    placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                                    disabled={isUploading}
                                    style={{
                                        flex: 1,
                                        padding: "14px 20px",
                                        borderRadius: "24px",
                                        border: "1px solid var(--border)",
                                        background: "color-mix(in srgb, var(--bg) 50%, var(--card) 50%)",
                                        color: "var(--text)",
                                        outline: "none",
                                        fontSize: "15px",
                                        transition: "border 0.2s"
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!isConnected || isUploading || (!inputText.trim())}
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        minWidth: "48px",
                                        borderRadius: "50%",
                                        border: "none",
                                        background: (!isConnected || (!inputText.trim() && !isUploading)) ? "var(--muted)" : "var(--primary)",
                                        color: "white",
                                        cursor: (!isConnected || (!inputText.trim())) ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "background 0.2s, transform 0.1s",
                                        transform: (!isConnected || !inputText.trim()) ? "scale(0.95)" : "scale(1)"
                                    }}
                                >
                                    <Send size={20} style={{ marginLeft: "2px" }} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", zIndex: 1, gap: "16px" }}>
                            <div style={{ width: "80px", height: "80px", background: "color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Send size={40} color="var(--primary)" opacity={0.5} />
                            </div>
                            <span style={{ fontSize: "18px", fontWeight: "500" }}>Smart Messaging</span>
                            <span style={{ fontSize: "14px", opacity: 0.8 }}>Select a conversation to start chatting</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "var(--card)", padding: "24px", borderRadius: "16px",
                        width: "400px", maxWidth: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0, color: "var(--text)" }}>Create New Group</h3>
                            <X size={20} style={{ cursor: "pointer", color: "var(--muted)" }} onClick={() => setShowCreateGroup(false)} />
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "14px", color: "var(--muted)", marginBottom: "8px" }}>Group Name</label>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                                placeholder="E.g. Engineering Team"
                            />
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "14px", color: "var(--muted)", marginBottom: "8px" }}>Select Members</label>
                            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", background: "var(--bg)" }}>
                                {users.map(u => (
                                    <label key={u.email} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", cursor: "pointer", borderRadius: "6px" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedMembers.includes(u.email)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedMembers([...selectedMembers, u.email]);
                                                else setSelectedMembers(selectedMembers.filter(email => email !== u.email));
                                            }}
                                        />
                                        <span style={{ color: "var(--text)", fontSize: "14px" }}>{u.name}</span>
                                    </label>
                                ))}
                                {users.length === 0 && <div style={{ padding: "8px", fontSize: "14px", color: "var(--muted)" }}>No other users available.</div>}
                            </div>
                        </div>

                        <button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim() || selectedMembers.length === 0}
                            style={{
                                width: "100%", padding: "12px", borderRadius: "8px", background: "var(--primary)", color: "white",
                                border: "none", fontWeight: "600", cursor: (!newGroupName.trim() || selectedMembers.length === 0) ? "not-allowed" : "pointer",
                                opacity: (!newGroupName.trim() || selectedMembers.length === 0) ? 0.5 : 1
                            }}
                        >
                            Create Group
                        </button>
                    </div>
                </div>
            )}
            {/* Group Info Modal */}
            {showGroupInfo && selectedUser?.isGroup && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "var(--card)", padding: "24px", borderRadius: "16px",
                        width: "400px", maxWidth: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0, color: "var(--text)" }}>Members of {selectedUser.name}</h3>
                            <X size={20} style={{ cursor: "pointer", color: "var(--muted)" }} onClick={() => setShowGroupInfo(false)} />
                        </div>

                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", background: "var(--bg)" }}>
                            {selectedUser.members.map(memberEmail => {
                                const matchedUser = users.find(u => u.email === memberEmail);
                                const isMe = memberEmail === currentUserEmail;
                                return (
                                    <div key={memberEmail} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderBottom: "1px solid var(--border)" }}>
                                        <div style={{ minWidth: "32px", height: "32px", background: "color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <User size={16} color="var(--primary)" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {isMe ? "You" : (matchedUser ? matchedUser.name : "Unknown User")}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {memberEmail}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
