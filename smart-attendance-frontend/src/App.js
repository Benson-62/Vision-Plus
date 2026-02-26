import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Profile from "./pages/Profile";
import Logdetails from "./pages/Logdetails";
import Calendar from "./pages/Calendar";
import Checkout from "./pages/Checkout";
import Settings from "./pages/Settings";
import AdminRoute from "./admin/routes/AdminRoute";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminAttendance from "./admin/pages/AdminAttendance";
import AdminLeave from "./admin/pages/AdminLeave";
import AdminLeaderboard from "./admin/pages/AdminLeaderboard";
import AdminAudit from "./admin/pages/AdminAudit";

import Welcome from "./pages/Welcome";
import LeaveApplication from "./pages/LeaveApplication";
import FileUpload from "./pages/FileUpload";
import Chat from "./pages/Chat";
import AdminBroadcast from "./admin/pages/AdminBroadcast";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes that require Authentication & WebSockets */}
        <Route element={<ProtectedRoute />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/logdetails" element={<Logdetails />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/leave" element={<LeaveApplication />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/chat" element={<Chat />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/attendance" element={<AdminRoute><AdminAttendance /></AdminRoute>} />
          <Route path="/admin/leave" element={<AdminRoute><AdminLeave /></AdminRoute>} />
          <Route path="/admin/leaderboard" element={<AdminRoute><AdminLeaderboard /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
          <Route path="/admin/broadcast" element={<AdminRoute><AdminBroadcast /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
