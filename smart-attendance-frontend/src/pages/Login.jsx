import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!email || !password) {
      alert("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // ✅ STORE LOGGED-IN USER (CRITICAL)
      localStorage.setItem("email", data.email);
      localStorage.setItem("name", data.name);

      // ✅ GO TO DASHBOARD
      navigate("/dashboard");

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Welcome Back">
      <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => navigate("/signup")}
        >
          Create account
        </button>

      </form>
    </Layout>
  );
}
