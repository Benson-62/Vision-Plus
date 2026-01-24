import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminAttendance() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  /* ================= ADMIN GUARD ================= */
  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  /* ================= FETCH BY USER ================= */
  async function fetchByUser() {
    setError("");
    try {
      const adminEmail = localStorage.getItem("admin_email");
      const res = await fetch(
        `${BASE_URL}/admin/attendance/user?email=${email}&admin_email=${adminEmail}`
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch records");

      setRecords(data.records || []);
    } catch (err) {
      setError(err.message);
      setRecords([]);
    }
  }

  /* ================= FETCH BY DATE ================= */
  async function fetchByDate() {
    setError("");
    try {
      const adminEmail = localStorage.getItem("admin_email");
      const res = await fetch(
        `${BASE_URL}/admin/attendance/date?date=${date}&admin_email=${adminEmail}`
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch records");

      setRecords(data.records || []);
    } catch (err) {
      setError(err.message);
      setRecords([]);
    }
  }

  return (
    <Layout title="Attendance Reports">
      <div className="attendance-page">

        {/* ===== SEARCH CARD ===== */}
        <div className="attendance-card">

          <h3 className="section-title">Search Attendance</h3>

          {/* Employee Email */}
          <div className="field-group">
            <label>Employee Email</label>
<br></br>
            <div className="input-with-icon">
              <span className="icon">📧</span>
              <input
                type="email"
                placeholder="employee@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
<br></br>
            <button
              className="btn primary"
              style={{ marginTop: "6px" }}
              onClick={fetchByUser}
            >
              Search User
            </button>
          </div>

          {/* Divider spacing */}
          <div style={{ height: 20 }} />

          {/* Date */}
          <div className="field-group">
            <label>Date</label>
<br></br>
            <div className="input-with-icon">
              <span className="icon">📅</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
<br></br>
            <button
              className="btn primary"
              style={{ marginTop: "6px" }}
              onClick={fetchByDate}
            >
              Search Date
            </button>
          </div>

          {error && (
            <p style={{ marginTop: 16, color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>

        {/* ===== RESULTS CARD ===== */}
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
