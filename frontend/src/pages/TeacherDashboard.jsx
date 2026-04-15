import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Shared helpers ────────────────────────────────────────────────
function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v;
}

function pctBadge(pct) {
  if (pct === null) return "bg-white/10 text-white/40";
  if (pct < 75)    return "bg-red-500/20 text-red-300";
  if (pct < 80)    return "bg-orange-500/20 text-orange-300";
  if (pct < 85)    return "bg-yellow-500/20 text-yellow-300";
  return                   "bg-emerald-500/20 text-emerald-300";
}

// ── Spinner ───────────────────────────────────────────────────────
function Spinner() {
  return <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin-slow mx-auto" />;
}

// ── Section tabs ──────────────────────────────────────────────────
const TABS = [
  { id: "subjects",    label: "📚 My Subjects" },
  { id: "attendance",  label: "✅ Take Attendance" },
  { id: "marks",       label: "📝 Enter Marks" },
  { id: "summary",     label: "📊 Summary" },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const teacherData = JSON.parse(localStorage.getItem("teacherData") || "{}");

  const [tab,      setTab]      = useState("subjects");
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Attendance panel state
  const [attSubject,   setAttSubject]   = useState("");
  const [attStudents,  setAttStudents]  = useState([]); // [{_id, name, usn, status}]
  const [attDate,      setAttDate]      = useState(new Date().toISOString().slice(0, 10));
  const [attLoading,   setAttLoading]   = useState(false);
  const [attMsg,       setAttMsg]       = useState(null);

  // Marks panel state
  const [mrkSubject,   setMrkSubject]   = useState("");
  const [mrkStudent,   setMrkStudent]   = useState("");
  const [mrkForm,      setMrkForm]      = useState({ internal1: "", internal2: "", internal3: "", finalExam: "" });
  const [mrkLoading,   setMrkLoading]   = useState(false);
  const [mrkMsg,       setMrkMsg]       = useState(null);

  // Summary state
  const [sumSubject,   setSumSubject]   = useState("");
  const [sumRecords,   setSumRecords]   = useState([]);
  const [sumMarks,     setSumMarks]     = useState([]);
  const [sumLoading,   setSumLoading]   = useState(false);

  const logout = () => {
    ["token", "role", "teacherData"].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  // Fetch teacher's subjects
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.get(`${API_BASE}/subjects/my-subjects`, authHeaders());
      setSubjects(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load subjects");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "teacher") { navigate("/login"); return; }
    fetchSubjects();
  }, []);

  // ── Attendance handlers ───────────────────────────────────────
  const loadStudentsForAtt = (subjectId) => {
    setAttSubject(subjectId);
    setAttMsg(null);
    const sub = subjects.find((s) => s._id === subjectId);
    if (!sub) return;
    setAttStudents(sub.enrolledStudents.map((st) => ({
      ...st,
      status: "present",
    })));
  };

  const toggleStatus = (studentId) => {
    setAttStudents((prev) =>
      prev.map((s) => s._id === studentId ? { ...s, status: s.status === "present" ? "absent" : "present" } : s)
    );
  };

  const submitAttendance = async () => {
    if (!attSubject || attStudents.length === 0) return;
    try {
      setAttLoading(true); setAttMsg(null);
      await axios.post(`${API_BASE}/attendance/take`, {
        subjectId: attSubject,
        date: attDate,
        records: attStudents.map(({ _id, status }) => ({ studentId: _id, status })),
      }, authHeaders());
      setAttMsg({ type: "success", text: "Attendance saved successfully!" });
    } catch (err) {
      setAttMsg({ type: "error", text: err.response?.data?.error || "Failed to save attendance" });
    } finally { setAttLoading(false); }
  };

  // ── Marks handlers ────────────────────────────────────────────
  const loadExistingMarks = async (subjectId, studentId) => {
    if (!subjectId || !studentId) return;
    try {
      const res = await axios.get(`${API_BASE}/marks/${studentId}/${subjectId}`, authHeaders());
      const m = res.data;
      setMrkForm({
        internal1: m.internal1 ?? "",
        internal2: m.internal2 ?? "",
        internal3: m.internal3 ?? "",
        finalExam: m.finalExam ?? "",
      });
    } catch { /* no existing marks */ }
  };

  const selectMrkSubject = (subjectId) => {
    setMrkSubject(subjectId);
    setMrkStudent("");
    setMrkForm({ internal1: "", internal2: "", internal3: "", finalExam: "" });
    setMrkMsg(null);
  };

  const selectMrkStudent = (studentId) => {
    setMrkStudent(studentId);
    setMrkMsg(null);
    loadExistingMarks(mrkSubject, studentId);
  };

  const submitMarks = async () => {
    if (!mrkSubject || !mrkStudent) return;
    try {
      setMrkLoading(true); setMrkMsg(null);
      await axios.post(`${API_BASE}/marks/input`, {
        subjectId: mrkSubject,
        studentId: mrkStudent,
        ...mrkForm,
      }, authHeaders());
      setMrkMsg({ type: "success", text: "Marks saved!" });
    } catch (err) {
      setMrkMsg({ type: "error", text: err.response?.data?.error || "Failed to save marks" });
    } finally { setMrkLoading(false); }
  };

  // ── Summary handler ───────────────────────────────────────────
  const loadSummary = async (subjectId) => {
    if (!subjectId) return;
    setSumSubject(subjectId);
    setSumLoading(true);
    try {
      const [attRes, mrkRes] = await Promise.all([
        axios.get(`${API_BASE}/attendance/subject/${subjectId}`, authHeaders()),
        axios.get(`${API_BASE}/marks/subject/${subjectId}`, authHeaders()).catch(() => ({ data: [] })),
      ]);
      setSumRecords(attRes.data);
      setSumMarks(mrkRes.data.filter((m) => m.subjectId?._id === subjectId || m.subjectId === subjectId));
    } catch (err) {
      console.error("summary load error", err);
    } finally { setSumLoading(false); }
  };

  // Compute per-student attendance summary
  const computeSummary = () => {
    const sub = subjects.find((s) => s._id === sumSubject);
    if (!sub) return [];
    return sub.enrolledStudents.map((st) => {
      const records = sumRecords.filter((r) => {
        const rid = r.studentId?._id || r.studentId;
        return rid === st._id;
      });
      const total   = records.length;
      const present = records.filter((r) => r.status === "present").length;
      const pct     = total > 0 ? Math.round((present / total) * 100) : null;
      const marks   = sumMarks.find((m) => {
        const sid = m.studentId?._id || m.studentId;
        return sid === st._id;
      });
      return { ...st, total, present, pct, marks };
    });
  };

  // ── Current subject enrolled students (for marks panel) ───────
  const mrkSubjectData = subjects.find((s) => s._id === mrkSubject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Blobs */}
      <div className="fixed top-[-10%] left-[-5%] w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏫</span>
            <div>
              <h1 className="text-lg font-bold">Teacher Dashboard</h1>
              <p className="text-xs text-white/40">
                Logged in as <strong className="text-amber-300">{teacherData.name || teacherData.username}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-amber-500/15 text-amber-300 border-b-2 border-amber-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 relative z-10">

        {/* ── MY SUBJECTS ─────────────────────────────────────── */}
        {tab === "subjects" && (
          <div className="animate-fade-slide-up">
            <h2 className="text-xl font-semibold mb-4 text-white/90">My Assigned Subjects</h2>
            {loading && <Spinner />}
            {error   && <Msg type="error" text={error} />}
            {!loading && subjects.length === 0 && (
              <p className="text-white/30 text-center py-12">No subjects assigned yet. Contact admin.</p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((s, i) => (
                <div
                  key={s._id}
                  className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 card-hover animate-fade-slide-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white/90">{s.name}</h3>
                      <p className="text-xs text-amber-400 font-mono">{s.code}</p>
                    </div>
                    <span className="text-xs bg-amber-500/15 text-amber-300 px-2 py-1 rounded-lg">
                      {s.enrolledStudents?.length ?? 0} students
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {(s.enrolledStudents || []).slice(0, 3).map((st) => (
                      <p key={st._id} className="text-xs text-white/40 font-mono">{st.name} <span className="text-white/20">({st.usn})</span></p>
                    ))}
                    {(s.enrolledStudents?.length || 0) > 3 && (
                      <p className="text-xs text-white/30">+{s.enrolledStudents.length - 3} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAKE ATTENDANCE ─────────────────────────────────── */}
        {tab === "attendance" && (
          <div className="animate-fade-slide-up max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-white/90">Take Attendance</h2>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
              {/* Subject picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Subject</label>
                  <select
                    value={attSubject}
                    onChange={(e) => loadStudentsForAtt(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" className="bg-slate-800">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id} className="bg-slate-800">{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Date</label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>

              {/* Student list */}
              {attStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Mark Attendance ({attStudents.length} students)</p>
                  {attStudents.map((st) => (
                    <div
                      key={st._id}
                      className="flex items-center justify-between bg-white/3 border border-white/5 rounded-xl px-4 py-2.5 hover:border-white/10 transition"
                    >
                      <div>
                        <p className="text-sm font-medium text-white/90">{st.name}</p>
                        <p className="text-xs font-mono text-white/30">{st.usn}</p>
                      </div>
                      <button
                        onClick={() => toggleStatus(st._id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          st.status === "present"
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        }`}
                      >
                        {st.status === "present" ? "✓ Present" : "✗ Absent"}
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setAttStudents(prev => prev.map(s => ({...s, status: "present"})))}
                      className="text-xs text-emerald-400/70 hover:text-emerald-400 transition cursor-pointer">
                      Mark All Present
                    </button>
                    <span className="text-white/20">|</span>
                    <button onClick={() => setAttStudents(prev => prev.map(s => ({...s, status: "absent"})))}
                      className="text-xs text-red-400/70 hover:text-red-400 transition cursor-pointer">
                      Mark All Absent
                    </button>
                  </div>
                </div>
              )}

              {attSubject && attStudents.length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No students enrolled in this subject.</p>
              )}

              {attMsg && <Msg type={attMsg.type} text={attMsg.text} />}

              {attStudents.length > 0 && (
                <button
                  onClick={submitAttendance}
                  disabled={attLoading}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    attLoading ? "bg-amber-600/50 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98]"
                  }`}
                >
                  {attLoading ? <Spinner /> : "Submit Attendance"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ENTER MARKS ──────────────────────────────────────── */}
        {tab === "marks" && (
          <div className="animate-fade-slide-up max-w-xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-white/90">Enter Marks</h2>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
              {/* Subject picker */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Subject</label>
                <select
                  value={mrkSubject}
                  onChange={(e) => selectMrkSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-slate-800">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id} className="bg-slate-800">{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {/* Student picker */}
              {mrkSubjectData && (
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">Student</label>
                  <select
                    value={mrkStudent}
                    onChange={(e) => selectMrkStudent(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" className="bg-slate-800">Select student</option>
                    {mrkSubjectData.enrolledStudents.map((st) => (
                      <option key={st._id} value={st._id} className="bg-slate-800">{st.name} ({st.usn})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Marks inputs */}
              {mrkStudent && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "internal1", label: "Internal 1" },
                      { key: "internal2", label: "Internal 2" },
                      { key: "internal3", label: "Internal 3" },
                      { key: "finalExam", label: "Final Exam" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={mrkForm[key]}
                          onChange={(e) => setMrkForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder="—"
                          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition"
                        />
                      </div>
                    ))}
                  </div>

                  {mrkMsg && <Msg type={mrkMsg.type} text={mrkMsg.text} />}

                  <button
                    onClick={submitMarks}
                    disabled={mrkLoading}
                    className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                      mrkLoading ? "bg-amber-600/50 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98]"
                    }`}
                  >
                    {mrkLoading ? <Spinner /> : "Save Marks"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SUMMARY ───────────────────────────────────────────── */}
        {tab === "summary" && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-white/90">Summary</h2>
              <select
                value={sumSubject}
                onChange={(e) => loadSummary(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}
              >
                <option value="" className="bg-slate-800">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id} className="bg-slate-800">{s.name}</option>
                ))}
              </select>
            </div>

            {sumLoading && <div className="py-8"><Spinner /></div>}

            {sumSubject && !sumLoading && (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">USN</th>
                      <th className="px-4 py-3 text-center">Attendance %</th>
                      <th className="px-4 py-3 text-center">Int 1</th>
                      <th className="px-4 py-3 text-center">Int 2</th>
                      <th className="px-4 py-3 text-center">Int 3</th>
                      <th className="px-4 py-3 text-center">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computeSummary().map((row, i) => (
                      <tr key={row._id} className={`border-b border-white/5 hover:bg-white/3 transition animate-fade-slide-up stagger-${Math.min(i + 1, 8)}`}>
                        <td className="px-4 py-3 font-medium text-white/90">{row.name}</td>
                        <td className="px-4 py-3 font-mono text-white/40 text-xs">{row.usn}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold badge-transition ${pctBadge(row.pct)}`}>
                            {row.pct !== null ? `${row.pct}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-white/60">{fmt(row.marks?.internal1)}</td>
                        <td className="px-4 py-3 text-center text-white/60">{fmt(row.marks?.internal2)}</td>
                        <td className="px-4 py-3 text-center text-white/60">{fmt(row.marks?.internal3)}</td>
                        <td className="px-4 py-3 text-center text-white/60">{fmt(row.marks?.finalExam)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {computeSummary().length === 0 && (
                  <p className="text-center text-white/30 py-8">No students enrolled.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared message component ───────────────────────────────────────
function Msg({ type, text }) {
  const clr = type === "success"
    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
    : "bg-red-500/10 border-red-500/20 text-red-300";
  return (
    <div className={`${clr} border px-4 py-2.5 rounded-xl text-sm text-center animate-fade-in`}>
      {type === "success" ? "✅" : "⚠️"} {text}
    </div>
  );
}
