import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";

// ── Role-based protected route ────────────────────────────────────
function ProtectedRoute({ role, element }) {
  const token   = localStorage.getItem("token");
  const current = localStorage.getItem("role");
  if (!token || current !== role) return <Navigate to="/login" replace />;
  return element;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin" element={<AdminDashboard />} />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Teacher */}
        <Route path="/teacher/dashboard" element={<ProtectedRoute role="teacher" element={<TeacherDashboard />} />} />

        {/* Student */}
        <Route path="/student/dashboard" element={<ProtectedRoute role="student" element={<StudentDashboard />} />} />
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

