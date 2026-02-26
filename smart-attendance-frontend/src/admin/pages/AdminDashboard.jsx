import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Activity, UserCheck, UserX, BarChart3, LogOut, Award, ShieldAlert, Settings, Megaphone } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [todayRecords, setTodayRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [livePresence, setLivePresence] = useState(null);

  const adminName = localStorage.getItem("name") || "Admin";

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }

    fetchStats();
    fetchAnalytics();
    fetchTodayRecords();
    fetchLivePresence();

    // Setup WebSocket
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/dashboard");
    let debounceTimer;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.event) {
          showNotification(data);

          // Debounce rapid events
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchStats();
            fetchAnalytics();
            fetchTodayRecords();
            fetchLivePresence();
          }, 2500);
        }
      } catch (e) {
        console.error("WebSocket message parse error", e);
      }
    };

    return () => {
      clearTimeout(debounceTimer);
      ws.close();
    };
  }, [navigate]);

  const showNotification = (data) => {
    let msg = "";
    if (data.event === "checkin") {
      msg = `${data.payload.name || data.payload.email} checked in at ${data.payload.time}`;
    } else if (data.event === "checkout") {
      msg = `${data.payload.name || data.payload.email} checked out at ${data.payload.out} (${data.payload.status})`;
    } else if (data.event === "leave_applied") {
      msg = `${data.payload.name || data.payload.email} applied for ${data.payload.leave_type} leave`;
    } else {
      msg = `New event: ${data.event}`;
    }

    const newNotif = { id: Date.now(), msg };
    setNotifications((prev) => [...prev, newNotif]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  async function fetchStats() {
    try {
      const token = localStorage.getItem("token");
      // Use new daily summary endpoint
      const res = await fetch(
        `${BASE_URL}/admin/attendance/daily-summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    }
  }

  async function fetchTodayRecords() {
    try {
      const token = localStorage.getItem("token");
      const d = new Date();
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = d.toLocaleString('en-US', { month: 'short' });
      const yearStr = d.getFullYear();
      const formattedDate = `${dayStr} ${monthStr} ${yearStr}`;

      const res = await fetch(`${BASE_URL}/admin/attendance/date?date=${formattedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTodayRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch today's records", err);
    }
  }

  async function fetchLivePresence() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/admin/live-presence`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLivePresence(data);
      }
    } catch (err) {
      console.error("Failed to fetch live presence", err);
    }
  }

  async function fetchAnalytics() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
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
            <div className="attendance-progress-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Today's Attendance</span>
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                  {stats.total_employees > 0 ? Math.round(((stats.present_count + stats.half_day_count) / stats.total_employees) * 100) : 0}%
                </span>
              </div>
              <div className="progress-track" style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                <div
                  className="progress-fill"
                  style={{
                    height: "100%",
                    width: `${stats.total_employees > 0 ? ((stats.present_count + stats.half_day_count) / stats.total_employees) * 100 : 0}%`,
                    background: "var(--primary)",
                    borderRadius: 10,
                    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </div>
            </div>

            <div className="stats-grid">
              <StatCard label="Total Employees" value={stats.total_employees} icon={<Users size={24} color="#3b82f6" />} />
              <StatCard label="Present (Full)" value={stats.present_count} icon={<UserCheck size={24} color="#10b981" />} />
              <StatCard label="Half Day" value={stats.half_day_count} icon={<Activity size={24} color="#f59e0b" />} />
              <StatCard label="On Leave" value={stats.leave_count} icon={<Calendar size={24} color="#8b5cf6" />} />
              <StatCard label="Absent Today" value={stats.absent_count} icon={<UserX size={24} color="#ef4444" />} />
            </div>

            <div className="card" style={{ marginTop: 32 }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Today's Employee Status (Present Employees)</h3>
              {todayRecords.length === 0 ? (
                <p className="empty-text">No records yet for today.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {todayRecords.map((r, i) => (
                    <div key={i} style={{
                      padding: 16,
                      background: "var(--card-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", color: "var(--text)" }}>{r.email.split("@")[0]}</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>In: {r.in} {r.out ? `| Out: ${r.out}` : ''}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`status ${r.status?.toLowerCase()}`} style={{ fontSize: "12px", padding: "4px 8px", borderRadius: 12, display: "inline-block" }}>
                          {r.status}
                        </span>
                        {r.late && <div style={{ fontSize: "11px", color: "var(--danger)", marginTop: 4, fontWeight: "bold" }}>Late ({r.late_minutes}m)</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {livePresence && (
              <div className="card" style={{ marginTop: 32 }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Live Presence Monitor (GeoFence)</h3>
                <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                  <div style={{ padding: "8px 16px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 8, fontWeight: 600 }}>Inside: {livePresence.total_inside}</div>
                  <div style={{ padding: "8px 16px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: 8, fontWeight: 600 }}>Outside: {livePresence.total_outside}</div>
                </div>
                <table style={{ width: "100%", color: "var(--text)", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px", color: "var(--muted)" }}>Employee</th>
                      <th style={{ padding: "12px 8px", color: "var(--muted)" }}>Status</th>
                      <th style={{ padding: "12px 8px", color: "var(--muted)" }}>Last Verified</th>
                      <th style={{ padding: "12px 8px", color: "var(--muted)" }}>Auto Checkout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livePresence.employees.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 8px" }}>{e.email.split("@")[0]}</td>
                        <td style={{ padding: "12px 8px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: e.inside_status === "Inside" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: e.inside_status === "Inside" ? "#10b981" : "#ef4444"
                          }}>
                            {e.inside_status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 8px" }}>{e.last_verified ? new Date(e.last_verified).toLocaleTimeString() : "--"}</td>
                        <td style={{ padding: "12px 8px" }}>{e.auto_checkout ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {analytics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "32px", marginBottom: "32px" }}>
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Attendance Distribution</h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={analytics.pie_data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {analytics.pie_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#ef4444", "#f59e0b", "#8b5cf6", "#10b981"][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Lateness & Overtime Trends</h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.late_trend}>
                    <XAxis dataKey="name" stroke="var(--muted)" />
                    <YAxis stroke="var(--muted)" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }} />
                    <Legend />
                    <Bar dataKey="late_count" name="Late Arrivals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
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
            label="Leave Requests"
            description="Approve/Reject leaves"
            onClick={() => navigate("/admin/leave")}
          />
          <ActionCard
            icon={<Award size={28} />}
            label="Leaderboard"
            description="Employee rankings"
            onClick={() => navigate("/admin/leaderboard")}
          />
          <ActionCard
            icon={<ShieldAlert size={28} />}
            label="Audit Logs"
            description="System edit history"
            onClick={() => navigate("/admin/audit")}
          />
          <ActionCard
            icon={<Megaphone size={28} />}
            label="System Broadcast"
            description="Send live alerts globally"
            onClick={() => navigate("/admin/broadcast")}
          />
          <ActionCard
            icon={<Settings size={28} />}
            label="Settings"
            description="App preferences and themes"
            onClick={() => navigate("/settings")}
          />
        </div>

        {/* Notifications Toast Container */}
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              background: "var(--card-bg, #1e293b)",
              color: "var(--text, #fff)",
              padding: "16px 20px",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              borderLeft: "4px solid var(--primary, #3b82f6)",
              animation: "slideIn 0.3s ease-out forwards",
              minWidth: "250px"
            }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>{n.msg}</p>
            </div>
          ))}
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
