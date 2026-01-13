import { useEffect, useState } from "react";
import Layout from "../components/Layout";

const BASE_URL = "http://127.0.0.1:8000";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const email = localStorage.getItem("email");

  // ✅ Hook is ALWAYS called
  useEffect(() => {
    if (!email) {
      setError("Not logged in");
      return;
    }

    fetch(`${BASE_URL}/profile?email=${email}`)
      .then(res => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(err => setError(err.message));
  }, [email]);

  // ✅ Render logic AFTER hooks
  if (error) {
    return (
      <Layout title="My Profile">
        <p>{error}</p>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout title="My Profile">
        <p>Loading...</p>
      </Layout>
    );
  }

  return (
    <Layout title="My Profile">
      <div style={{ display: "grid", gap: 10 }}>
        <p><b>Name:</b> {profile.name}</p>
        <p><b>Email:</b> {profile.email}</p>
        <p>
          <b>Joined:</b>{" "}
          {new Date(
            profile.created_at?.$date || profile.created_at
          ).toLocaleString()}
        </p>
      </div>
    </Layout>
  );
}
