import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const adminEmail = localStorage.getItem("admin_email");

      const res = await fetch(
        `${BASE_URL}/admin/users?email=${adminEmail}`
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load users");
      }

      setUsers(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(email, active) {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("active", String(!active));
      formData.append(
        "admin_email",
        localStorage.getItem("admin_email")
      );

      const res = await fetch(`${BASE_URL}/admin/user/toggle`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to update user");
      }

      // 🔄 refresh list
      fetchUsers();
    } catch (err) {
      alert(err.message || "Failed to update user");
    }
  }

  return (
    <Layout title="Manage Employees">
      {loading && <p>Loading employees...</p>}

      {error && (
        <p style={{ color: "var(--danger)", marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="list-container">
        {users.map(u => (
          <div className="list-card" key={u.email}>
            <div>
              <h4>{u.name}</h4>
              <p>{u.email}</p>
            </div>

            <button
              className={u.active ? "btn-danger" : "btn-success"}
              onClick={() => toggleUser(u.email, u.active)}
            >
              {u.active ? "Disable" : "Enable"}
            </button>
          </div>
        ))}

        {!loading && users.length === 0 && (
          <p>No employees found</p>
        )}
      </div>
    </Layout>
  );
}
