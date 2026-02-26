import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, KeyRound } from "lucide-react";
import Layout from "../components/Layout";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
    }, [location]);

    async function handleResetPassword(e) {
        e.preventDefault();
        setError("");

        if (!email || !otp || !newPassword) {
            setError("All fields are required");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, otp, new_password: newPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Failed to reset password");
            }

            setSuccess(true);
            setTimeout(() => navigate("/"), 2000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="auth-container">
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-sub">Enter the OTP and your new password</p>

                {success ? (
                    <div style={{ textAlign: "center", padding: "2rem 0" }}>
                        <p style={{ color: "var(--success, #28a745)", fontSize: 16, marginBottom: "1rem" }}>
                            Password reset successfully!
                        </p>
                        <p>Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="input-icon">
                            <Mail size={18} />
                            <input
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={!!location.state?.email}
                            />
                        </div>

                        <div className="input-icon">
                            <KeyRound size={18} />
                            <input
                                placeholder="6-digit OTP"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                            />
                        </div>

                        <div className="input-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <p style={{ color: "var(--danger)", fontSize: 14 }}>
                                {error}
                            </p>
                        )}

                        <button disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <div className="auth-alt" style={{ marginTop: "1rem" }}>
                    Back to{" "}
                    <span
                        onClick={() => navigate("/")}
                        style={{ color: "var(--primary)", cursor: "pointer" }}
                    >
                        Login
                    </span>
                </div>
            </div>
        </Layout>
    );
}
