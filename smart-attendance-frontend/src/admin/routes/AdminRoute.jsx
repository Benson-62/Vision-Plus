import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const role = localStorage.getItem("role");
  const adminEmail = localStorage.getItem("admin_email");

  if (role !== "admin" || !adminEmail) {
    return <Navigate to="/" replace />;
  }

  return children;
}
