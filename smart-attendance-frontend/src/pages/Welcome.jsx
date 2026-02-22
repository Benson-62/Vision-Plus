import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users } from "lucide-react";
import "../styles/welcome.css";

export default function Welcome() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get role from state or localStorage
    const role = location.state?.role || localStorage.getItem("role");

    useEffect(() => {
        // Redirect after 2 seconds
        const timer = setTimeout(() => {
            if (role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/dashboard");
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigate, role]);

    return (
        <div className="welcome-container">
            <div className="welcome-content">
                <div className="badge-container">
                    <Users size={56} color="white" />
                </div>
                <h1 className="welcome-title">Welcome!✨🎀</h1>
                <p className="welcome-subtitle">Getting everything ready for you...</p>
            </div>
        </div>
    );
}
