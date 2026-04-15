import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
}

// ── Attendance colour helpers ─────────────────────────────────────
function pctConfig(pct) {
  if (pct === null) return { badge: "bg-white/10 text-white/40", bar: "bg-white/20", label: "Attendance: No data" };
  if (pct < 75)    return { badge: "bg-red-500/20 text-red-300",      bar: "bg-red-400",      label: `Attendance: ${pct}%` };
  if (pct < 80)    return { badge: "bg-orange-500/20 text-orange-300", bar: "bg-orange-400",   label: `Attendance: ${pct}%` };
  if (pct < 85)    return { badge: "bg-yellow-500/20 text-yellow-300", bar: "bg-yellow-400",   label: `Attendance: ${pct}%` };
  return                   { badge: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-400", label: `Attendance: ${pct}%` };
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v;
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin-slow mx-auto" />;
}

// ── Animated progress bar ──────────────────────────────────────────
function ProgressBar({ pct, barColor }) {
  const width = pct !== null ? `${pct}%` : "0%";
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor} animate-progress`}
        style={{ "--target-width": width, width }}
      />
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────
function SubjectCard({ subject, studentId, index, onViewAttendance }) {
  const [data, setData]     = useState(null);  // { records, total, present, absent, percentage }
  const [marks, setMarks]   = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [attRes, mrkRes] = await Promise.all([
          axios.get(`${API_BASE}/attendance/${subject._id}/${studentId}`, authHeaders()),
          axios.get(`${API_BASE}/marks/${studentId}/${subject._id}`, authHeaders()),
        ]);
        if (!cancelled) {
          setData(attRes.data);
          setMarks(mrkRes.data);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [subject._id, studentId]);

  const pct    = data?.percentage ?? null;
  const config = pctConfig(pct);
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`;

  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 card-hover animate-fade-slide-up ${staggerClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-white/90">{subject.name}</h3>
          <p className="text-xs text-indigo-400 font-mono">{subject.code}</p>
          {subject.facultyId && (
            <p className="text-xs text-white/30 mt-0.5">👤 {subject.facultyId.name || subject.facultyId.username}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg badge-transition ${config.badge}`}>
          {!loaded ? "..." : config.label}
        </span>
      </div>

      {/* Progress bar */}
      {loaded && <ProgressBar pct={pct} barColor={config.bar} />}
      {loaded && data && (
        <p className="text-[11px] text-white/30 mt-1">
          {data.present}/{data.total} classes attended
        </p>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Int 1", value: marks?.internal1 },
          { label: "Int 2", value: marks?.internal2 },
          { label: "Int 3", value: marks?.internal3 },
          { label: "Final", value: marks?.finalExam },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 border border-white/5 rounded-xl p-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-white/30">{label}</p>
            <p className="text-sm font-bold text-white/80 mt-0.5">{loaded ? fmt(value) : "…"}</p>
          </div>
        ))}
      </div>

      {/* Marks Summary */}
      {loaded && marks && (
        <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center text-sm">
          <span className="text-white/50 text-xs">Total Marks:</span>
          {(() => {
            const int1 = Number(marks.internal1) || 0;
            const int2 = Number(marks.internal2) || 0;
            const int3 = Number(marks.internal3) || 0;
            const finalEx = Number(marks.finalExam) || 0;
            const sum = int1 + int2 + int3 + finalEx;
            // Assuming each is out of 100, max total = 400
            const max = 400;
            const marksPct = Math.round((sum / max) * 100);
            return (
              <div className="text-right flex items-center gap-2">
                <span className="font-bold text-white/90">{sum} <span className="text-white/30 text-xs font-normal">/ {max}</span></span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${marksPct >= 75 ? "bg-emerald-500/20 text-emerald-300" : marksPct >= 50 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>{marksPct}%</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* View attendance button */}
      {loaded && data?.records?.length > 0 && (
        <button
          onClick={() => onViewAttendance(subject, data.records)}
          className="mt-3 w-full text-xs text-indigo-400/70 hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl py-1.5 transition cursor-pointer"
        >
          View attendance log →
        </button>
      )}
    </div>
  );
}

// ── Attendance Log Modal ───────────────────────────────────────────
function AttendanceModal({ subject, records, studentId, onClose }) {
  const [disputing,    setDisputing]    = useState(null);  // record id
  const [disputeInput, setDisputeInput] = useState("");
  const [msg,          setMsg]          = useState(null);
  const [localRecords, setLocalRecords] = useState(records);

  const fileDispute = async (recordId) => {
    if (!disputeInput.trim()) return;
    try {
      setDisputing(recordId);
      await axios.put(`${API_BASE}/attendance/${recordId}/dispute`, { reason: disputeInput.trim() }, authHeaders());
      setLocalRecords((prev) =>
        prev.map((r) => r._id === recordId ? { ...r, disputed: true, disputeReason: disputeInput.trim() } : r)
      );
      setMsg({ type: "success", text: "Dispute filed successfully." });
      setDisputeInput("");
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to file dispute" });
    } finally { setDisputing(null); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900/98 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col animate-fade-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white/90">{subject.name}</h3>
            <p className="text-xs text-indigo-400 font-mono">{subject.code} — Attendance Log</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl cursor-pointer transition">✕</button>
        </div>

        {/* Records list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {localRecords.map((r) => (
            <div key={r._id} className={`border rounded-xl p-3 transition ${r.disputed ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/5 bg-white/3"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {r.disputed && (
                    <p className="text-xs text-yellow-400/80 mt-0.5">🚩 Disputed: {r.disputeReason}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg badge-transition ${
                  r.status === "present" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}>
                  {r.status === "present" ? "✓ Present" : "✗ Absent"}
                </span>
              </div>

              {/* Dispute form — only show for absent, not yet disputed */}
              {r.status === "absent" && !r.disputed && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-white/25 focus:outline-none focus:border-yellow-500/40 transition"
                    placeholder="Reason for dispute..."
                    value={disputing === r._id ? disputeInput : ""}
                    onChange={(e) => { setDisputing(r._id); setDisputeInput(e.target.value); }}
                  />
                  <button
                    onClick={() => fileDispute(r._id)}
                    disabled={disputing === r._id && !disputeInput.trim()}
                    className="px-3 py-1.5 text-xs font-semibold bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    Flag
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {msg && (
          <div className={`mx-4 mb-3 px-4 py-2 rounded-xl text-sm text-center border ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            {msg.type === "success" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Student Dashboard ────────────────────────────────────────
export default function StudentDashboard() {
  const [student,  setStudent]  = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("overview");

  // Attendance modal
  const [attModal, setAttModal] = useState(null); // { subject, records }

  const navigate = useNavigate();

  const logout = () => {
    ["token", "role", "studentData"].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "student") { navigate("/login"); return; }
    const data = localStorage.getItem("studentData");
    if (!data) { navigate("/login"); return; }
    setStudent(JSON.parse(data));
  }, []);

  // Fetch enrolled subjects once student data is available
  useEffect(() => {
    if (!student) return;
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/subjects/enrolled`, authHeaders());
        setSubjects(res.data);
      } catch (err) {
        console.error("enrolled subjects error:", err);
      } finally { setLoading(false); }
    };
    load();
  }, [student]);

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Blobs */}
      <div className="fixed top-[-10%] left-[-5%] w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-[30%] right-[10%] w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold">Student Portal</h1>
              <p className="text-xs text-white/40">Welcome, <strong className="text-indigo-300">{student.name}</strong></p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0">
          {[
            { id: "overview",    label: "👤 Profile" },
            { id: "attendance",  label: "📊 Attendance & Marks" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-indigo-500/15 text-indigo-300 border-b-2 border-indigo-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 relative z-10">

        {/* ── PROFILE TAB ─────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="max-w-2xl mx-auto animate-fade-slide-up">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
                  <img
                    src={student.imageUrl}
                    className="w-28 h-28 rounded-full object-cover border-4 border-slate-900 shadow-2xl"
                    alt={student.name}
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff&size=128`; }}
                  />
                </div>
              </div>
              <div className="pt-18 pb-8 px-6 text-center">
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-white">{student.name}</h2>
                  {student.usn && <p className="text-indigo-400 font-mono font-semibold text-sm mt-1">{student.usn}</p>}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
                  <DetailItem label="Admission No." value={student.admissionNumber} mono />
                  <DetailItem label="USN"           value={student.usn}            mono accent />
                  <DetailItem label="Course"        value={student.course} />
                  <DetailItem label="Department"    value={student.department} />
                  <DetailItem label="Phone"         value={student.phone} />
                  <DetailItem label="Email"         value={student.email} />
                </div>
                {student.createdAt && (
                  <p className="mt-6 text-xs text-white/25">
                    Enrolled on {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE & MARKS TAB ────────────────────────────── */}
        {tab === "attendance" && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white/90">Attendance & Marks</h2>
                <p className="text-xs text-white/30 mt-0.5">Per-subject · Live from database</p>
              </div>
              {subjects.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> &lt;75%
                  <span className="w-2 h-2 rounded-full bg-orange-400 ml-2" /> 75–79%
                  <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2" /> 80–84%
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ml-2" /> ≥85%
                </div>
              )}
            </div>

            {loading && <div className="py-16"><Spinner /></div>}

            {!loading && subjects.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <p className="text-4xl mb-3">📚</p>
                <p>You haven't been enrolled in any subjects yet.</p>
                <p className="text-xs mt-1">Contact your admin to get enrolled.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {subjects.map((sub, i) => (
                <SubjectCard
                  key={sub._id}
                  subject={sub}
                  studentId={student._id}
                  index={i}
                  onViewAttendance={(subject, records) => setAttModal({ subject, records })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attendance detail modal */}
      {attModal && (
        <AttendanceModal
          subject={attModal.subject}
          records={attModal.records}
          studentId={student._id}
          onClose={() => setAttModal(null)}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value, mono, accent }) {
  if (!value) return null;
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""} ${accent ? "text-indigo-400" : "text-white/80"}`}>
        {value}
      </p>
    </div>
  );
}
