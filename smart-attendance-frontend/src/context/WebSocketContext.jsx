import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import api from '../api';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    // eslint-disable-next-line no-unused-vars
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [messages, setMessages] = useState([]); // Temporary store for active chat
    const [notifications, setNotifications] = useState([]);

    const ws = useRef(null);
    const reconnectTimer = useRef(null);

    useEffect(() => {
        let isMounted = true;
        let localWs = null;

        const fetchInitialData = async (token) => {
            try {
                const notifRes = await api.get('/notifications');
                const data = notifRes.data;
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            } catch (e) {
                console.error("Failed to fetch initial WS data", e);
            }
        };

        const connect = () => {
            const token = localStorage.getItem("token");
            if (!token || !isMounted) return;

            const WS_URL = process.env.REACT_APP_WS_URL || 'ws://127.0.0.1:8000';
            localWs = new WebSocket(`${WS_URL}/ws/${token}`);
            ws.current = localWs;

            localWs.onopen = () => {
                if (!isMounted) return;
                console.log("WebSocket connected");
                setIsConnected(true);
                fetchInitialData(token);
            };

            localWs.onclose = (event) => {
                if (!isMounted) return;
                console.log("WebSocket disconnected", event.code);
                setIsConnected(false);
                clearTimeout(reconnectTimer.current);
                
                if (event.code === 1008) {
                    console.error("WebSocket auth failed. Redirecting to login...");
                    localStorage.removeItem('token');
                    localStorage.removeItem('name');
                    localStorage.removeItem('email');
                    localStorage.removeItem('role');
                    window.location.href = '/';
                } else {
                    reconnectTimer.current = setTimeout(connect, 3000);
                }
            };

            localWs.onerror = (err) => {
                console.error("WS error", err);
            };

            localWs.onmessage = (event) => {
                if (!isMounted) return;
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "chat") {
                        setMessages(prev => [...prev, data]);

                        if (data.sender !== localStorage.getItem("email")) {
                            setNotifications(prev => [{
                                title: `New message from ${data.sender}`,
                                message: data.message,
                                type: "chat",
                                timestamp: data.timestamp
                            }, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        }
                    } else if (data.type === "system" || data.type === "broadcast") {
                        setNotifications(prev => [data, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                } catch (e) {
                    console.error("WS message error", e);
                }
            };
        };

        connect();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimer.current);
            if (localWs) {
                localWs.onclose = null; // nullify before closing so it doesn't try to reconnect
                localWs.close();
            }
            ws.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendMessage = (receiver, text, fileObj = null, receiverType = "user") => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const msg = {
                type: "chat",
                receiver: receiver,
                receiver_type: receiverType,
                message: text,
                file: fileObj
            };
            ws.current.send(JSON.stringify(msg));
            // Successfully dispatched! The backend will echo this payload 
            // back to us dynamically so all multi-tab sessions stay in sync.
        } else {
            console.error("WS not connected");
        }
    };

    const markNotificationsRead = () => {
        setUnreadCount(0);
        // Ideally ping an endpoint to mark all read in DB
    };

    return (
        <WebSocketContext.Provider value={{
            socket: ws.current,
            isConnected,
            messages,
            setMessages,
            sendMessage,
            notifications,
            unreadCount,
            markNotificationsRead
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        // Provide a safe fallback for components rendered outside the provider (e.g. Login page)
        return {
            socket: null,
            isConnected: false,
            messages: [],
            setMessages: () => { },
            sendMessage: () => { },
            notifications: [],
            unreadCount: 0,
            markNotificationsRead: () => { }
        };
    }
    return context;
}
