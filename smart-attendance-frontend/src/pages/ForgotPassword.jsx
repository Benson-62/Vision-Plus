import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import Layout from "../components/Layout";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSendOTP(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email) {
            setError("Email is required");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Failed to generate OTP");
            }

            setSuccess("OTP sent securely to your email.");

            // Delay navigation slightly so user can read message
            setTimeout(() => {
                navigate("/reset-password", { state: { email } });
            }, 4000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout>
            <div className="auth-container">
                <h2 className="auth-title">Forgot Password</h2>
                <p className="auth-sub">Enter your email to receive an OTP</p>

                <form onSubmit={handleSendOTP}>
                    <div className="input-icon">
                        <Mail size={18} />
                        <input
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p style={{ color: "var(--danger)", fontSize: 14 }}>
                            {error}
                        </p>
                    )}

                    {success && (
                        <p style={{ color: "var(--success, #28a745)", fontSize: 14, background: "#d4edda", padding: "8px", borderRadius: "4px" }}>
                            {success}
                        </p>
                    )}

                    <button disabled={loading}>
                        {loading ? "Sending..." : "Send OTP"}
                    </button>
                </form>

                <div className="auth-alt" style={{ marginTop: "1rem" }}>
                    Remember your password?{" "}
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
