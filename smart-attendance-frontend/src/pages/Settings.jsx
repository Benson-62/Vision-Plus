import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "../styles/settings.css";

import { applyTheme, THEMES } from "../utils/themeEngine";

function saveSetting(key, value) {
  localStorage.setItem(key, String(value));
}

function loadSetting(key, fallback) {
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  if (stored === "true") return true;
  if (stored === "false") return false;
  return stored;
}


export default function Settings() {
  const navigate = useNavigate();

  // 🔐 ROLE DETECTION
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";

  const [theme, setTheme] = useState(() =>
    loadSetting("theme", "beige-brown")
  );
  const [darkMode, setDarkMode] = useState(() =>
    loadSetting("darkMode", false)
  );
  const [notifications, setNotifications] = useState(() =>
    loadSetting("notifications", true)
  );
  const [liveUpdates, setLiveUpdates] = useState(() =>
    loadSetting("liveUpdates", true)
  );

  useEffect(() => {
    applyTheme(theme, darkMode);
    saveSetting("theme", theme);
  }, [theme, darkMode]);

  useEffect(() => saveSetting("darkMode", darkMode), [darkMode]);
  useEffect(() => saveSetting("notifications", notifications), [notifications]);
  useEffect(() => saveSetting("liveUpdates", liveUpdates), [liveUpdates]);

  return (
    <Layout title="Settings">
      <div className="settings-container">

        {/* ACCOUNT */}
        <section className="settings-section">
          <h3>Account</h3>

          <button
            className="settings-btn primary"
            onClick={() => navigate("/profile")}
          >
            Edit Profile
          </button>

          <button
            className="settings-btn primary"
            onClick={() => navigate("/profile")}
          >
            Change Password
          </button>
        </section>

        {/* ✅ ADMIN CONTROLS (ONLY FOR ADMIN) */}
        {isAdmin && (
          <section className="settings-section">
            <h3>Admin Controls</h3>

            <button
              className="settings-btn primary"
              onClick={() => navigate("/admin/users")}
            >
              👥 Manage Employees
            </button>

            <button
              className="settings-btn primary"
              onClick={() => navigate("/admin/attendance")}
            >
              📅 Attendance Reports
            </button>
          </section>
        )}

        {/* APPEARANCE */}
        <section className="settings-section">
          <h3>Appearance</h3>

          <div className="toggle-row">
            <span>Dark Mode</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </div>

          <div className="theme-grid">
            {THEMES.map(t => (
              <div
                key={t.id}
                className={`theme-card ${theme === t.id ? "active" : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <div
                  className="theme-preview"
                  style={{ background: darkMode ? t.dark.bg : t.light.bg }}
                >
                  <span
                    className="theme-dot"
                    style={{ background: t.primary }}
                  />
                </div>
                <p>{t.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PREFERENCES */}
        <section className="settings-section">
          <h3>Preferences</h3>

          <div className="toggle-row">
            <span>Notifications</span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>

          <div className="toggle-row">
            <span>Live Dashboard Updates</span>
            <input
              type="checkbox"
              checked={liveUpdates}
              onChange={() => setLiveUpdates(!liveUpdates)}
            />
          </div>
        </section>

        {/* DATA */}
        <section className="settings-section">
          <h3>Data</h3>

          <button
            className="settings-btn danger"
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
          >
            Clear Local Data
          </button>
        </section>

        {/* INFO */}
        <section className="settings-section info">
          <p>Smart Attendance System</p>
          <small>Version 1.0.0</small>
        </section>

      </div>
    </Layout>
  );
}
