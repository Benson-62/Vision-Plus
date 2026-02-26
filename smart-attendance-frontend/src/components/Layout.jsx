import NotificationBell from "./NotificationBell";

export default function Layout({ title, children, maxWidth = 420, hideNotificationBell = false }) {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.card, maxWidth }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: title ? 20 : 0 }}>
          {title && <h2 style={{ ...styles.title, marginBottom: 0 }}>{title}</h2>}
          {isLoggedIn && !hideNotificationBell && <NotificationBell />}
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "var(--bg)",
  },
  card: {
    width: "100%",
    background: "var(--card)",
    backdropFilter: "blur(20px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
    color: "var(--text)"
  },
  title: {
    marginBottom: 20,
    textAlign: "center"
  }
};
