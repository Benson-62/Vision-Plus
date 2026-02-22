import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Calendar,
  User,
  Settings,
  LogOut,
  CheckCircle,
  Clock,
  DoorOpen
} from "lucide-react";
import Layout from "../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

function ActionCard({ icon, title, subtitle, onClick }) {
  return (
    <div className="action-card" onClick={onClick}>
      <div className="action-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [todayRecord, setTodayRecord] = useState(null);

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedEmail = localStorage.getItem("email");

    if (!storedName || !storedEmail) {
      navigate("/");
      return;
    }

    setName(storedName);
    setEmail(storedEmail);
  }, [navigate]);

  useEffect(() => {
    if (!email) return;

    async function fetchToday() {
      try {
        const res = await fetch(
          `${BASE_URL}/attendance/history?email=${email}`
        );
        const data = await res.json();

        if (!res.ok || !Array.isArray(data)) {
          setTodayRecord(null);
          return;
        }

        const todayStr = new Date().toDateString();

        const record = data.find(r =>
          new Date(r.date).toDateString() === todayStr
        );

        setTodayRecord(record || null);
      } catch {
        console.log("Dashboard status fetch failed");
      }
    }

    fetchToday();
  }, [email]);

  const isCheckedIn = Boolean(todayRecord?.in);
  const isCheckedOut = Boolean(todayRecord?.out);

  return (
    <Layout>
      <div className="dashboard">

        <div className="dash-header">
          <div>
            <h2>Welcome, {name}</h2>
            <p className="muted">{new Date().toDateString()}</p>
          </div>

          <button
            className="icon-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="status-card">
          <div>
            <p className="card-title">Today’s Status</p>
            <h3>
              <CheckCircle size={18} />
              {isCheckedIn ? " PRESENT" : " NOT MARKED"}
            </h3>
          </div>

          <div>
            <p className="card-title">
              {isCheckedOut
                ? "Checked‑Out At"
                : isCheckedIn
                ? "Checked‑In At"
                : "Time"}
            </p>
            <h3>
              <Clock size={18} />
              {isCheckedOut
                ? todayRecord.out
                : isCheckedIn
                ? todayRecord.in
                : "--"}
            </h3>
          </div>
        </div>

        <div className="action-grid">

        
          
            <ActionCard
              icon={<Camera size={26} />}
              title="Mark Attendance"
              subtitle="Face verification (Check‑In)"
              onClick={() => navigate("/attendance")}
            />
         


            <ActionCard
              icon={<DoorOpen size={26} />}
              title="Check‑Out"
              subtitle="Face verification (Check‑Out)"
              onClick={() => navigate("/checkout")}
            />
        

          {/* ALWAYS AVAILABLE */}
          <ActionCard
            icon={<Calendar size={26} />}
            title="Calendar"
            subtitle="View monthly attendance"
            onClick={() => navigate("/calendar")}
          />

          <ActionCard
            icon={<User size={26} />}
            title="Profile"
            subtitle="View & edit profile"
            onClick={() => navigate("/profile")}
          />

          <ActionCard
            icon={<Settings size={26} />}
            title="Settings"
            subtitle="App preferences"
            onClick={() => navigate("/settings")}
          />
        </div>

        <p className="muted center">
          Select an option to continue
        </p>

      </div>
    </Layout>
  );
}
