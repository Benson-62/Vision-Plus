import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }

    fetchStats();
  }, [navigate]); // ✅ FIXED dependency

  async function fetchStats() {
    const adminEmail = localStorage.getItem("admin_email");

    try {
      const res = await fetch(
        `${BASE_URL}/admin/dashboard/stats?email=${adminEmail}`
      );
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    }
  }

  /* ================= LOGOUT ================= */
  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="dashboard-container">

        {/* ===== LOGOUT BUTTON ===== */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              background: "var(--danger)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Logout
          </button>
        </div>

        {/* ===== STATS ===== */}
        {stats && (
          <div className="stats-grid">
            <StatCard label="Total Employees" value={stats.total_employees} />
            <StatCard label="Active Employees" value={stats.active_employees} />
            <StatCard label="Present Today" value={stats.present_today} />
            <StatCard label="Absent Today" value={stats.absent_today} />
          </div>
        )}

        {/* ===== QUICK ACTIONS ===== */}
        <div className="action-grid">
          <ActionCard
            icon="👥"
            label="Manage Employees"
            onClick={() => navigate("/admin/users")}
          />
          <ActionCard
            icon="📊"
            label="Attendance Reports"
            onClick={() => navigate("/admin/attendance")}
          />
          <ActionCard
            icon="📆"
            label="Calendar"
            onClick={() => navigate("/calendar")}
          />
          <ActionCard
            icon="⚙️"
            label="Settings"
            onClick={() => navigate("/settings")}
          />
        </div>

      </div>
    </Layout>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <h2 className="stat-value">{value}</h2>
    </div>
  );
}

function ActionCard({ icon, label, onClick }) {
  return (
    <div className="action-card" onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <p className="action-label">{label}</p>
    </div>
  );
}
