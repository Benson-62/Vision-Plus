import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import "../styles/admin.css";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminAttendance() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }
    fetchEmployees();
  }, [navigate]);

  async function fetchEmployees() {
    try {
      const adminEmail = localStorage.getItem("admin_email");
      const res = await fetch(`${BASE_URL}/admin/users?email=${adminEmail}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  }

  function formatDateForDB(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    const d = new Date(year, parseInt(month) - 1, day);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    const yearStr = d.getFullYear();
    return `${dayStr} ${monthStr} ${yearStr}`;
  }

  async function handleSearch() {
    setError("");
    setRecords([]);

    if (!email && !date) {
      setError("Please select an Employee or a Date to search.");
      return;
    }

    try {
      const adminEmail = localStorage.getItem("admin_email");
      const formattedDate = formatDateForDB(date);

      if (email && date) {
        // Fetch all for user, then filter locally by formatted date
        const res = await fetch(`${BASE_URL}/admin/attendance/user?email=${email}&admin_email=${adminEmail}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch records");
        setRecords((data.records || []).filter(r => r.date === formattedDate));
      } else if (email) {
        // User only
        const res = await fetch(`${BASE_URL}/admin/attendance/user?email=${email}&admin_email=${adminEmail}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch records");
        setRecords(data.records || []);
      } else if (date) {
        // Date only
        const res = await fetch(`${BASE_URL}/admin/attendance/date?date=${formattedDate}&admin_email=${adminEmail}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch records");
        setRecords(data.records || []);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Attendance Reports">
      <div className="attendance-page">

        <div className="attendance-card">

          <h3 className="section-title">Search Attendance</h3>

          {/* Employee Email */}
          <div className="field-group">
            <label>Employee Email</label>
            <br></br>
            <div className="input-with-icon">
              <span className="icon">👤</span>
              <input
                list="employee-options"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Search by Name or Email..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text)",
                  width: "100%",
                  fontSize: "0.95rem"
                }}
              />
              <datalist id="employee-options">
                {employees.map(emp => (
                  <option key={emp._id} value={emp.email}>
                    {emp.name}
                  </option>
                ))}
              </datalist>
            </div>
            {/* Combine buttons into one big search button at the bottom */}
          </div>

          {/* Divider spacing */}
          <div style={{ height: 10 }} />

          {/* Date */}
          <div className="field-group">
            <label>Date (Optional)</label>
            <br></br>
            <div className="input-with-icon">
              <span className="icon">📅</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn primary"
            style={{ marginTop: "16px", width: "100%" }}
            onClick={handleSearch}
          >
            Search Logs
          </button>

          {error && (
            <p style={{ marginTop: 16, color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>

        <div className="attendance-card" style={{ marginTop: 32 }}>

          <h3 className="section-title">Results</h3>

          {records.length === 0 ? (
            <p className="empty-text">No records found</p>
          ) : (
            <div className="list-container" style={{ marginTop: 16 }}>
              {records.map((r, i) => (
                <div className="list-card" key={i}>
                  <div>
                    <h4>{r.email}</h4>
                    <p>{r.date}</p>
                    <p>{r.in} → {r.out || "--"}</p>
                  </div>

                  <span className={`status ${r.status?.toLowerCase()}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </Layout>
  );
}
