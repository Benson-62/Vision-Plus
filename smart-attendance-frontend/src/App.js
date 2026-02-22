import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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


import Welcome from "./pages/Welcome";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/logdetails" element={<Logdetails />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/attendance" element={<AdminRoute><AdminAttendance /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
