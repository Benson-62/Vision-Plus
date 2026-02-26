import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [photo, setPhoto] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    if (!storedEmail) return navigate("/login");

    setEmail(storedEmail);

    const token = localStorage.getItem("token");
    fetch(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setName(data.name);
        setNewEmail(data.email);
        if (data.profile_image) {
          setPhoto(`data:image/jpeg;base64,${data.profile_image}`);
        }
      });
  }, [navigate]);

  async function verifyPassword() {
    setLoading(true);
    setMsg("");

    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/auth/verify-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });


    try {
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.detail || "❌ Incorrect password");
      } else {
        setVerified(true);
        setMsg("✅ Editing unlocked");
      }
    } catch (err) {
      setMsg("❌ Incorrect password or server error");
    }

    setLoading(false);
  }

  async function updateProfile() {
    setLoading(true);
    setMsg("");

    const fd = new FormData();
    fd.append("email", email);
    fd.append("name", name);
    fd.append("new_email", newEmail);

    if (fileRef.current?.files[0]) {
      fd.append("image", fileRef.current.files[0]);
    }

    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/update_user`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });

    try {
      const data = await res.json();

      if (!res.ok) {
        setMsg(data.detail || "Update failed");
      } else {
        setMsg("✅ Profile updated");
        localStorage.setItem("email", newEmail);
        localStorage.setItem("name", name);

        if (data.profile_image) {
          setPhoto(`data:image/jpeg;base64,${data.profile_image}`);
        }

        setEditMode(false);
        setVerified(false);
        setPassword("");
      }
    } catch (err) {
      setMsg("Update failed due to network error");
    }

    setLoading(false);
  }

  return (
    <Layout title="My Profile">
      <div className="auth-container">

        {/* PROFILE PHOTO */}
        <div style={{ textAlign: "center" }}>
          <img
            src={photo}
            alt="Profile"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid var(--primary)"
            }}
          />

          {verified && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e =>
                  setPhoto(URL.createObjectURL(e.target.files[0]))
                }
              />

              <p
                style={{ color: "var(--primary)", cursor: "pointer" }}
                onClick={() => fileRef.current.click()}
              >
                Change Photo
              </p>
            </>
          )}
        </div>

        {/* VIEW MODE */}
        {!editMode && (
          <>
            <input value={name} disabled />
            <input value={newEmail} disabled />

            <button onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          </>
        )}

        {/* PASSWORD VERIFICATION */}
        {editMode && !verified && (
          <>
            <input
              type="password"
              placeholder="Enter password to edit"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button onClick={verifyPassword} disabled={loading}>
              {loading ? "Verifying..." : "Verify Password"}
            </button>
          </>
        )}

        {/* EDIT MODE */}
        {verified && (
          <>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name"
            />

            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
            />

            <button onClick={updateProfile} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}

        {msg && <p style={{ textAlign: "center" }}>{msg}</p>}
      </div>
    </Layout>
  );
}
