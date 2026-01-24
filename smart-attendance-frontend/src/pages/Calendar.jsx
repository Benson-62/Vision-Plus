import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/calendar.css";

const BASE_URL = "http://127.0.0.1:8000";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const email = localStorage.getItem("email");

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth()); // 0‑based
  const [year, setYear] = useState(today.getFullYear());

  const [records, setRecords] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);

  /* ================= SAFE MONTH CHANGE ================= */
  const changeMonth = (direction) => {
    setMonth((prev) => {
      let next = prev + direction;

      if (next < 0) {
        setYear((y) => y - 1);
        return 11;
      }

      if (next > 11) {
        setYear((y) => y + 1);
        return 0;
      }

      return next;
    });
  };

  /* ================= FETCH MONTH ================= */
  useEffect(() => {
    if (!email) return;

    async function fetchMonth() {
      try {
        const res = await fetch(
          `${BASE_URL}/attendance/month?email=${email}&year=${year}&month=${month + 1}`
        );

        if (!res.ok) throw new Error("Calendar fetch failed");

        const data = await res.json();
        const map = {};

        data.forEach((r) => {
          const day = parseInt(r.date.split(" ")[0], 10);
          map[day] = r;
        });

        setRecords(map);
      } catch (err) {
        console.error("Calendar fetch failed", err);
        setRecords({});
      }
    }

    fetchMonth();
  }, [email, month, year]);

  /* ================= CALENDAR CALCS ================= */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  /* ================= UI ================= */
  return (
    <Layout title="Attendance Calendar">
      <div className="calendar-wrapper calendar-container">

        {/* HEADER */}
        <div className="calendar-header">
          <button onClick={() => changeMonth(-1)}>◀</button>
          <h3>{monthName} {year}</h3>
          <button onClick={() => changeMonth(1)}>▶</button>
        </div>

        {/* GRID */}
        <div className="calendar-grid" key={`${year}-${month}`}>
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-head">{d}</div>
          ))}

          {/* Empty slots */}
          {Array(firstDay).fill(null).map((_, i) => (
            <div key={`e-${i}`} className="calendar-cell empty" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const rec = records[day];

            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);

            const isFuture = cellDate > todayMidnight;

            let className = "calendar-cell";
            let clickable = false;

            if (rec) {
              className += " present";
              clickable = true;
            } else if (!isFuture) {
              className += " absent"; // 🔴 past absent
              clickable = true;
            } else {
              className += " empty"; // future
            }

            return (
              <div
                key={day}
                className={className}
                style={{ cursor: clickable ? "pointer" : "default" }}
                onClick={() =>
                  clickable &&
                  setSelectedDay({
                    day,
                    record: rec || null,
                  })
                }
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* LEGEND */}
        <div className="calendar-legend">
          <span><i className="present" /> Present</span>
          <span><i className="absent" /> Absent</span>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedDay.day} {monthName} {year}
            </h3>

            {selectedDay.record ? (
              <>
                <p><b>Status:</b> {selectedDay.record.status}</p>
                <p><b>Login:</b> {selectedDay.record.in || "--"}</p>
                <p><b>Logout:</b> {selectedDay.record.out || "--"}</p>
                <p><b>Hours:</b> {selectedDay.record.hours || 0}</p>
                <p><b>Location:</b> {selectedDay.record.location}</p>
              </>
            ) : (
              <p className="muted">Absent</p>
            )}

            <button onClick={() => setSelectedDay(null)}>Close</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
