import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Settings, Activity, UserCheck, UserX, BarChart3, LogOut } from "lucide-react";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  const adminName = localStorage.getItem("name") || "Admin";

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

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="dashboard-container">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "28px", color: "var(--text)" }}>Welcome back, {adminName} 👋</h2>
            <p style={{ margin: "4px 0 0 0", color: "var(--muted)" }}>Here is what's happening today.</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: "rgba(220, 38, 38, 0.1)",
              color: "#dc2626",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              cursor: "pointer",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {stats && (
          <>
            {/* PROGRESS BAR */}
            <div className="attendance-progress-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Today's Attendance</span>
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                  {stats.active_employees > 0 ? Math.round((stats.present_today / stats.active_employees) * 100) : 0}%
                </span>
              </div>
              <div className="progress-track" style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                <div
                  className="progress-fill"
                  style={{
                    height: "100%",
                    width: `${stats.active_employees > 0 ? (stats.present_today / stats.active_employees) * 100 : 0}%`,
                    background: "var(--primary)",
                    borderRadius: 10,
                    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </div>
            </div>

            <div className="stats-grid">
              <StatCard label="Total Employees" value={stats.total_employees} icon={<Users size={24} color="#3b82f6" />} />
              <StatCard label="Active Employees" value={stats.active_employees} icon={<Activity size={24} color="#8b5cf6" />} />
              <StatCard label="Present Today" value={stats.present_today} icon={<UserCheck size={24} color="#10b981" />} />
              <StatCard label="Absent Today" value={stats.absent_today} icon={<UserX size={24} color="#ef4444" />} />
            </div>
          </>
        )}

        <div className="action-grid">
          <ActionCard
            icon={<Users size={28} />}
            label="Manage Employees"
            description="Add, edit, or remove staff"
            onClick={() => navigate("/admin/users")}
          />
          <ActionCard
            icon={<BarChart3 size={28} />}
            label="Attendance Reports"
            description="View logs and analytics"
            onClick={() => navigate("/admin/attendance")}
          />
          <ActionCard
            icon={<Calendar size={28} />}
            label="Calendar"
            description="Monthly overview"
            onClick={() => navigate("/calendar")}
          />
          <ActionCard
            icon={<Settings size={28} />}
            label="Settings"
            description="App preferences"
            onClick={() => navigate("/settings")}
          />
        </div>

      </div>
    </Layout>
  );
}


function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="stat-label">{label}</p>
          <h2 className="stat-value">{value}</h2>
        </div>
        <div style={{ padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, label, description, onClick }) {
  return (
    <div className="action-card" onClick={onClick}>
      <div className="action-icon-wrapper" style={{ marginBottom: 16, color: "var(--primary)" }}>
        {icon}
      </div>
      <p className="action-label" style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px 0" }}>{label}</p>
      {description && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{description}</p>}
    </div>
  );
}
