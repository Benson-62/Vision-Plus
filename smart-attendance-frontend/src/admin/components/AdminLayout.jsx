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
        <h2 className="admin-logo">Admin</h2>

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
