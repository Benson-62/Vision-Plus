import { Navigate, Outlet } from "react-router-dom";
import { WebSocketProvider } from "../context/WebSocketContext";

export default function ProtectedRoute() {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    // Wrap authenticated routes inside a WebSocket Provider so that
    // connections are only spawned when a valid token is present in LocalStorage.
    return (
        <WebSocketProvider>
            <Outlet />
        </WebSocketProvider>
    );
}
