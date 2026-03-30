import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Server, ShieldCheck, Database, Fingerprint } from "lucide-react";
import "../styles/welcome.css";

export default function Welcome() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get role from state or localStorage
    const role = location.state?.role || localStorage.getItem("role");
    const name = localStorage.getItem("name") || "User";

    const [loadingText, setLoadingText] = useState("Initializing systems...");

    useEffect(() => {
        const texts = [
            "Authenticating secure session...",
            "Loading employee modules...",
            "Syncing live geolocation data...",
            "Establishing biometric protocols...",
            "Ready."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < texts.length) {
                setLoadingText(texts[i]);
                i++;
            }
        }, 500);

        // Redirect after 3 seconds
        const timer = setTimeout(() => {
            if (role === "admin") {
                navigate("/admin/dashboard");
            } else {
                navigate("/dashboard");
            }
        }, 3000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [navigate, role]);

    return (
        <div className="welcome-container" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

            {/* Background Decorative Scattered Elements */}
            <div style={{ position: 'absolute', top: '15%', left: '10%', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <Server size={64} color="var(--primary)" />
            </div>
            <div style={{ position: 'absolute', bottom: '20%', right: '12%', opacity: 0.1, transform: 'rotate(10deg)' }}>
                <ShieldCheck size={72} color="var(--primary)" />
            </div>
            <div style={{ position: 'absolute', top: '25%', right: '15%', opacity: 0.1, transform: 'rotate(5deg)' }}>
                <Database size={56} color="var(--primary)" />
            </div>
            <div style={{ position: 'absolute', bottom: '15%', left: '15%', opacity: 0.1, transform: 'rotate(-5deg)' }}>
                <Fingerprint size={64} color="var(--primary)" />
            </div>

            {/* Grid Pattern Background */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'radial-gradient(var(--text) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className="welcome-content" style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '40px', background: 'var(--card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%' }}>
                <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', marginBottom: '24px' }}>
                    <img src="/logo512.png" alt="Vision Plus" style={{ width: 64, height: 64, borderRadius: "50%" }} />
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Welcome, {name.split(' ')[0]}!</h1>
                <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '32px', lineHeight: '1.5', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingText}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--primary)' }}>
                    <Loader2 className="spinner" size={18} style={{ animation: "spin 2s linear infinite" }} />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Loading Workspace</span >
                </div>
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}
