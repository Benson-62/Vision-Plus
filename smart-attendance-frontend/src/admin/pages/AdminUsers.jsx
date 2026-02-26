import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    department: "",
    reporting_manager: "",
    leave_balance: 20
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

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
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${BASE_URL}/admin/users`,
        { headers: { Authorization: `Bearer ${token}` } }
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

  async function handleAddEmployee(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      Object.entries(newUser).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const res = await fetch(`${BASE_URL}/admin/add-employee`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add employee");

      setSuccess("Employee added successfully!");
      setShowAddForm(false);
      setNewUser({ name: "", email: "", password: "", role: "employee", department: "", reporting_manager: "", leave_balance: 20 });
      setPhotoFile(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
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

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/admin/user/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}>
          {showAddForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}
      {success && <p style={{ color: "var(--success)", marginBottom: 12 }}>{success}</p>}

      {showAddForm && (
        <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid var(--border)", marginBottom: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--text)" }}>Add New Employee</h3>
          <form onSubmit={handleAddEmployee} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <input type="text" placeholder="Full Name" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <input type="email" placeholder="Email Address" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <input type="password" placeholder="Password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input type="text" placeholder="Department" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <input type="text" placeholder="Reporting Manager Email" value={newUser.reporting_manager} onChange={e => setNewUser({ ...newUser, reporting_manager: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <input type="number" placeholder="Leave Balance" required value={newUser.leave_balance} onChange={e => setNewUser({ ...newUser, leave_balance: parseInt(e.target.value) })} style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "14px", color: "var(--muted)" }}>Face Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button type="submit" style={{ padding: "10px 24px", borderRadius: "8px", background: "var(--success)", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}>
                Submit
              </button>
            </div>
          </form>
        </div>
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
