import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Layout from "../components/Layout";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault(); // ✅ prevents POST /

    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      // ✅ FIX: send to /auth/login for OAuth2 JWT
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // ✅ STORE USER SESSION
      localStorage.setItem("email", data.email);
      localStorage.setItem("name", data.name);
      localStorage.setItem("role", data.role);
      localStorage.setItem("token", data.access_token);

      // ✅ POOKIE ANIMATION REDIRECT
      if (data.role === "admin") {
        localStorage.setItem("admin_email", data.email);
      }
      navigate("/welcome", { state: { role: data.role } });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout hideNotificationBell>
      <div className="auth-container">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-sub">Login to your account</p>

        <form onSubmit={handleLogin}>
          <div className="input-icon">
            <Mail size={18} />
            <input
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="input-icon">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontSize: 14 }}>
              {error}
            </p>
          )}

          <button disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-alt" style={{ marginBottom: "1rem" }}>
          <span
            onClick={() => navigate("/forgot-password")}
            style={{ color: "var(--primary)", cursor: "pointer" }}
          >
            Forgot Password?
          </span>
        </div>

        <div className="auth-alt">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            style={{ color: "var(--primary)", cursor: "pointer" }}
          >
            Create account
          </span>
        </div>
      </div>
    </Layout>
  );
}
