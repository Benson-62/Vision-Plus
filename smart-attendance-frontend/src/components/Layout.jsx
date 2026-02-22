export default function Layout({ title, children, maxWidth = 420 }) {
  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.card, maxWidth }}>
        {title && <h2 style={styles.title}>{title}</h2>}
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
