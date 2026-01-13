import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Layout title="Smart Attendance">
      <div style={{ display: "grid", gap: 14 }}>
        <button onClick={() => navigate("/attendance")}>
          Mark Attendance
        </button>
        <button onClick={() => navigate("/profile")}>Profile</button>
        <button className="secondary" onClick={() => navigate("/")}>
          Logout
        </button>
      </div>
    </Layout>
  );
}
