import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function AdminAttendance() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateStr, setDateStr] = useState("");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }
    fetchAttendanceTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, page, dateStr, department, search]);

  async function fetchAttendanceTable() {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      let url = `${BASE_URL}/admin/attendance-table?page=${page}&limit=20`;

      // Formatting date for backend specifically if needed ("DD MMM YYYY")
      let formattedDate = "";
      if (dateStr) {
        const [y, m, d] = dateStr.split("-");
        const dateObj = new Date(y, parseInt(m) - 1, d);
        formattedDate = `${String(dateObj.getDate()).padStart(2, '0')} ${dateObj.toLocaleString('en-US', { month: 'short' })} ${dateObj.getFullYear()}`;
        url += `&date=${formattedDate}`;
      }

      if (department) url += `&department=${encodeURIComponent(department)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch attendance table");
      }

      const data = await res.json();
      setRecords(data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages || 1);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Admin Dashboard Table" maxWidth={1000}>
      <div className="print-container" style={{ padding: "24px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "var(--text)" }}>Dynamic Attendance Table</h3>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
          >
            🖨️ Print Report
          </button>
        </div>

        <div className="no-print" style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search Name or Email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", flex: 1, minWidth: "200px" }}
          />
          <input
            type="date"
            value={dateStr}
            onChange={(e) => { setDateStr(e.target.value); setPage(1); }}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          />
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
              <tr>
                <th style={{ padding: "12px" }}>Employee ID</th>
                <th style={{ padding: "12px" }}>Name</th>
                <th style={{ padding: "12px" }}>Department</th>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Check In</th>
                <th style={{ padding: "12px" }}>Check Out</th>
                <th style={{ padding: "12px" }}>Total Hrs</th>
                <th style={{ padding: "12px" }}>Late Mins</th>
                <th style={{ padding: "12px" }}>Early Exit Mins</th>
                <th style={{ padding: "12px" }}>OT Mins</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px" }}>Auto Checkout</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>Loading records...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="12" style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>No attendance records found.</td></tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px", color: "var(--muted)" }}>{r.employee_id || r.email.split('@')[0]}</td>
                    <td style={{ padding: "12px", fontWeight: "500", color: "var(--text)" }}>{r.name}</td>
                    <td style={{ padding: "12px", color: "var(--text)" }}>{r.department}</td>
                    <td style={{ padding: "12px", color: "var(--text)", whiteSpace: "nowrap" }}>{r.date}</td>
                    <td style={{ padding: "12px", color: "var(--text)", whiteSpace: "nowrap" }}>{r.check_in || "--:--"}</td>
                    <td style={{ padding: "12px", color: "var(--text)", whiteSpace: "nowrap" }}>{r.check_out || "--:--"}</td>
                    <td style={{ padding: "12px", color: "var(--text)" }}>{r.total_hours?.toFixed(1) || 0}</td>
                    <td style={{ padding: "12px", color: r.late_minutes > 0 ? "var(--danger)" : "var(--text)" }}>{r.late_minutes}</td>
                    <td style={{ padding: "12px", color: r.early_exit_minutes > 0 ? "var(--warning, #f59e0b)" : "var(--text)" }}>{r.early_exit_minutes}</td>
                    <td style={{ padding: "12px", color: r.overtime_minutes > 0 ? "var(--success)" : "var(--text)" }}>{r.overtime_minutes}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600",
                        background: r.attendance_status === "Present" ? "color-mix(in srgb, var(--success) 15%, transparent)" : "color-mix(in srgb, var(--danger) 15%, transparent)",
                        color: r.attendance_status === "Present" ? "var(--success)" : "var(--danger)"
                      }}>
                        {r.attendance_status || "Absent"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ color: r.auto_checkout ? "var(--muted)" : "var(--text)", fontSize: "18px" }}>
                        {r.auto_checkout ? "✅" : "❌"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", cursor: page === 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ color: "var(--muted)", fontSize: "14px" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", cursor: page === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    </Layout>
  );
}
