import { NavLink, useNavigate } from "react-router-dom";
import "../styles/admin.css";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem("admin_email");

  function logout() {
    localStorage.removeItem("admin_email");
    localStorage.removeItem("role");
    navigate("/login");
  }

  return (
    <div className="admin-wrapper">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "2rem" }}>
          <img src="/logo192.png" alt="Vision Plus Logo" style={{ width: 40, height: 40, borderRadius: "8px" }} />
          <h2 className="admin-logo" style={{ margin: 0, paddingBottom: 0, borderBottom: "none" }}>Admin</h2>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/users">Employees</NavLink>
          <NavLink to="/admin/attendance">Attendance</NavLink>
        </nav>

        <div className="admin-footer">
          <p className="admin-email">{adminEmail}</p>
          <button onClick={logout} className="admin-logout">
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
