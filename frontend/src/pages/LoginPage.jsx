import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function LoginPage() {
  const [tab, setTab] = useState("admin");

  // Admin state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Teacher state
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  // Student state
  const [usn, setUsn] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Admin Login ────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please enter username and password"); return; }
    try {
      setLoading(true); setError(null);
      const res = await axios.post(`${API_BASE}/auth/admin-login`, { username: username.trim(), password: password.trim() });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", res.data.username);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  // ── Teacher Login ──────────────────────────────────────────────
  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    if (!teacherUsername.trim() || !teacherPassword.trim()) { setError("Please enter username and password"); return; }
    try {
      setLoading(true); setError(null);
      const res = await axios.post(`${API_BASE}/auth/teacher-login`, {
        username: teacherUsername.trim(),
        password: teacherPassword.trim(),
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", "teacher");
      localStorage.setItem("teacherData", JSON.stringify({
        teacherId: res.data.teacherId,
        username:  res.data.username,
        name:      res.data.name,
      }));
      navigate("/teacher/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  // ── Student: Request OTP ───────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!usn.trim()) { setError("Please enter your USN"); return; }
    try {
      setLoading(true); setError(null);
      const res = await axios.post(`${API_BASE}/auth/student-request-otp`, { usn: usn.trim() });
      setOtpSent(true);
      setMaskedEmail(res.data.maskedEmail);
      setStudentName(res.data.studentName);
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  // ── Student: Verify OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError("Please enter the OTP"); return; }
    try {
      setLoading(true); setError(null);
      const res = await axios.post(`${API_BASE}/auth/student-verify-otp`, { usn: usn.trim(), otp: otp.trim() });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", "student");
      localStorage.setItem("studentData", JSON.stringify(res.data.student));
      navigate("/student/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    } finally { setLoading(false); }
  };

  const resetStudentFlow = () => {
    setOtpSent(false); setOtp(""); setMaskedEmail(""); setStudentName(""); setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="fixed top-[-10%] left-[-5%] w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md animate-fade-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">University Portal</h1>
          <p className="text-indigo-300/70 mt-1 text-sm">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => { setTab("admin"); setError(null); }}
              className={`flex-1 py-3 text-xs font-semibold transition-all cursor-pointer ${
                tab === "admin" ? "text-white bg-white/5 border-b-2 border-indigo-400" : "text-white/40 hover:text-white/70"
              }`}
            >
              🔐 Admin
            </button>
            <button
              onClick={() => { setTab("teacher"); setError(null); }}
              className={`flex-1 py-3 text-xs font-semibold transition-all cursor-pointer ${
                tab === "teacher" ? "text-white bg-white/5 border-b-2 border-amber-400" : "text-white/40 hover:text-white/70"
              }`}
            >
              🏫 Teacher
            </button>
            <button
              onClick={() => { setTab("student"); setError(null); }}
              className={`flex-1 py-3 text-xs font-semibold transition-all cursor-pointer ${
                tab === "student" ? "text-white bg-white/5 border-b-2 border-emerald-400" : "text-white/40 hover:text-white/70"
              }`}
            >
              🎒 Student
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* ── Admin ── */}
            {tab === "admin" && (
              <form onSubmit={handleAdminLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition"
                    placeholder="Enter admin username" disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition"
                    placeholder="Enter password" disabled={loading}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    loading ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
                  }`}
                >
                  {loading ? "Signing in..." : "Sign in as Admin"}
                </button>
              </form>
            )}

            {/* ── Teacher ── */}
            {tab === "teacher" && (
              <form onSubmit={handleTeacherLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text" value={teacherUsername} onChange={(e) => setTeacherUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition"
                    placeholder="Teacher username" disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
                  <input
                    type="password" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition"
                    placeholder="Enter password" disabled={loading}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    loading ? "bg-amber-600/50 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98]"
                  }`}
                >
                  {loading ? "Signing in..." : "Sign in as Teacher"}
                </button>
              </form>
            )}

            {/* ── Student ── */}
            {tab === "student" && !otpSent && (
              <form onSubmit={handleRequestOtp} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">University Serial Number (USN)</label>
                  <input
                    type="text" value={usn} onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition font-mono tracking-wider"
                    placeholder="e.g. RVU2025CSE001" disabled={loading}
                  />
                </div>
                <p className="text-white/30 text-xs text-center">An OTP will be sent to your registered email address</p>
                <button type="submit" disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    loading ? "bg-emerald-600/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
                  }`}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {tab === "student" && otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                <div className="text-center space-y-1">
                  <p className="text-white/70 text-sm">Welcome, <strong className="text-emerald-300">{studentName}</strong></p>
                  <p className="text-white/40 text-xs">OTP sent to <span className="font-mono text-emerald-400/80">{maskedEmail}</span></p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Enter OTP</label>
                  <input
                    type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition font-mono text-2xl tracking-[0.5em] text-center"
                    placeholder="••••••" disabled={loading} maxLength={6} autoFocus
                  />
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    loading || otp.length < 6 ? "bg-emerald-600/50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={resetStudentFlow} className="text-white/30 hover:text-white/60 transition cursor-pointer">
                    ← Change USN
                  </button>
                  <button type="button" onClick={handleRequestOtp} disabled={countdown > 0}
                    className={`transition cursor-pointer ${countdown > 0 ? "text-white/20 cursor-not-allowed" : "text-emerald-400/70 hover:text-emerald-400"}`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2.5 rounded-xl text-sm text-center animate-fade-in">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">© 2025 RV University. All rights reserved.</p>
      </div>
    </div>
  );
}
