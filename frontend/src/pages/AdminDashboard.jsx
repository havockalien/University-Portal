import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
}

function fmt(v) {
  return v === null || v === undefined ? "—" : v;
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin-slow mx-auto" />;
}

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

const TABS = [
  { id: "students",    label: "🎒 Students" },
  { id: "teachers",   label: "🏫 Teachers" },
  { id: "subjects",   label: "📚 Subjects" },
  { id: "enrollment", label: "📋 Enrollment" },
  { id: "attendance", label: "✅ Attendance" },
  { id: "marks",      label: "📝 Marks" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token         = localStorage.getItem("token");
  const adminUsername = localStorage.getItem("username") || "Admin";

  const [tab, setTab] = useState("students");

  // ───────────────────── STUDENTS (existing) ────────────────────────
  const [name,       setName]       = useState("");
  const [course,     setCourse]     = useState("");
  const [department, setDepartment] = useState("");
  const [batchYear,  setBatchYear]  = useState(new Date().getFullYear());
  const [phone,      setPhone]      = useState("");
  const [email,      setEmail]      = useState("");
  const [students,   setStudents]   = useState([]);
  const [image,      setImage]      = useState(null);

  const [stLoading,   setStLoading]   = useState(true);
  const [stSubmit,    setStSubmit]    = useState(false);
  const [stDeleting,  setStDeleting]  = useState(null);
  const [stError,     setStError]     = useState(null);
  const [stSubError,  setStSubError]  = useState(null);
  const [stSuccess,   setStSuccess]   = useState(null);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm,       setEditForm]       = useState({ name: "", course: "", department: "", phone: "", email: "" });
  const [editError,      setEditError]      = useState(null);
  const [saving,         setSaving]         = useState(false);

  // ───────────────────── TEACHERS ────────────────────────────────
  const [teachers,    setTeachers]    = useState([]);
  const [tLoading,    setTLoading]    = useState(false);
  const [tForm,       setTForm]       = useState({ name: "", username: "", password: "" });
  const [tMsg,        setTMsg]        = useState(null);
  const [tSubmit,     setTSubmit]     = useState(false);
  const [tDeleting,   setTDeleting]   = useState(null);

  // ───────────────────── SUBJECTS ────────────────────────────────
  const [subjects,    setSubjects]    = useState([]);
  const [sLoading,    setSLoading]    = useState(false);
  const [sForm,       setSForm]       = useState({ name: "", code: "" });
  const [sMsg,        setSMsg]        = useState(null);
  const [sSubmit,     setSSubmit]     = useState(false);
  const [sDeleting,   setSDeleting]   = useState(null);

  // Assign faculty
  const [afSubject,   setAfSubject]   = useState("");
  const [afTeacher,   setAfTeacher]   = useState("");
  const [afMsg,       setAfMsg]       = useState(null);
  const [afLoading,   setAfLoading]   = useState(false);

  // ───────────────────── ENROLLMENT ──────────────────────────────
  const [enSubject,   setEnSubject]   = useState("");
  const [enStudent,   setEnStudent]   = useState("");
  const [enMsg,       setEnMsg]       = useState(null);
  const [enLoading,   setEnLoading]   = useState(false);

  // ───────────────────── ATTENDANCE ──────────────────────────────
  const [attRecords,  setAttRecords]  = useState([]);
  const [attLoading,  setAttLoading]  = useState(false);
  const [attMsg,      setAttMsg]      = useState(null);
  const [attOverride, setAttOverride] = useState(null); // { id, status }

  // ───────────────────── MARKS ───────────────────────────────────
  const [mrkRecords,  setMrkRecords]  = useState([]);
  const [mrkLoading,  setMrkLoading]  = useState(false);
  const [mrkMsg,      setMrkMsg]      = useState(null);
  const [mrkEditing,  setMrkEditing]  = useState(null); // {id, fields}

  const logout = () => {
    ["token", "role", "username"].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  // ─── Fetch helpers ────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      setStLoading(true); setStError(null);
      const res = await axios.get(`${API_BASE}/students/all`);
      setStudents(res.data);
    } catch (err) {
      setStError("Failed to fetch students: " + (err.response?.data?.error || err.message));
    } finally { setStLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setTLoading(true);
      const res = await axios.get(`${API_BASE}/admin/teachers`, authHeaders());
      setTeachers(res.data);
    } catch { } finally { setTLoading(false); }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      setSLoading(true);
      const res = await axios.get(`${API_BASE}/subjects/all`, authHeaders());
      setSubjects(res.data);
    } catch { } finally { setSLoading(false); }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setAttLoading(true);
      const res = await axios.get(`${API_BASE}/admin/attendance`, authHeaders());
      setAttRecords(res.data);
    } catch { } finally { setAttLoading(false); }
  }, []);

  const fetchMarks = useCallback(async () => {
    try {
      setMrkLoading(true);
      const res = await axios.get(`${API_BASE}/admin/marks`, authHeaders());
      setMrkRecords(res.data);
    } catch { } finally { setMrkLoading(false); }
  }, []);

  useEffect(() => {
    if (!token || localStorage.getItem("role") !== "admin") { navigate("/login"); return; }
    fetchStudents();
  }, []);

  // Lazy-load panel data when tab changes
  useEffect(() => {
    if (tab === "teachers"   && teachers.length === 0)   fetchTeachers();
    if (tab === "subjects"   && subjects.length === 0)   { fetchTeachers(); fetchSubjects(); }
    if (tab === "enrollment" && subjects.length === 0)   { fetchSubjects(); fetchStudents(); fetchTeachers(); }
    if (tab === "attendance" && attRecords.length === 0) fetchAttendance();
    if (tab === "marks"      && mrkRecords.length === 0) fetchMarks();
  }, [tab]);

  // ─── STUDENT CRUD (unchanged logic) ───────────────────────────
  const addStudent = async () => {
    if (!name.trim() || !course.trim() || !department.trim() || !phone.trim() || !email.trim()) {
      setStSubError("Please fill in all fields."); return;
    }
    if (!image) { setStSubError("Please upload a profile picture."); return; }
    try {
      setStSubmit(true); setStSubError(null); setStSuccess(null);
      const formData = new FormData();
      formData.append("name", name.trim()); formData.append("course", course.trim());
      formData.append("department", department.trim()); formData.append("phone", phone.trim());
      formData.append("email", email.trim()); formData.append("image", image);
      formData.append("batchYear", batchYear);
      await axios.post(`${API_BASE}/students/add`, formData, authHeaders());
      setStSuccess(`Student "${name.trim()}" added successfully!`);
      setName(""); setCourse(""); setDepartment(""); setPhone(""); setEmail(""); setImage(null); setBatchYear(new Date().getFullYear());
      fetchStudents();
      setTimeout(() => setStSuccess(null), 4000);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setStSubError("Session expired. Please log in again."); setTimeout(logout, 2000);
      } else { setStSubError("Failed to add student: " + (err.response?.data?.error || err.message)); }
    } finally { setStSubmit(false); }
  };

  const deleteStudent = async (id, studentName) => {
    if (!window.confirm(`Delete student "${studentName}"? This cannot be undone.`)) return;
    try {
      setStDeleting(id);
      await axios.delete(`${API_BASE}/students/${id}`, authHeaders());
      setStSuccess(`Student "${studentName}" deleted.`);
      fetchStudents(); setTimeout(() => setStSuccess(null), 4000);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setStError("Session expired or unauthorized.");
      } else { setStError(`Failed to delete: ${err.response?.data?.error || err.message}`); }
    } finally { setStDeleting(null); }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name||"", course: student.course||"", department: student.department||"", phone: student.phone||"", email: student.email||"" });
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.course || !editForm.department) {
      setEditError("Name, Course, and Department are required."); return;
    }
    try {
      setSaving(true); setEditError(null);
      await axios.put(`${API_BASE}/students/${editingStudent._id}`, editForm, authHeaders());
      setStSuccess(`Student "${editForm.name}" updated!`);
      setEditingStudent(null); fetchStudents(); setTimeout(() => setStSuccess(null), 4000);
    } catch (err) { setEditError(err.response?.data?.error || "Failed to update"); }
    finally { setSaving(false); }
  };

  // ─── TEACHER CRUD ─────────────────────────────────────────────
  const createTeacher = async () => {
    if (!tForm.name || !tForm.username || !tForm.password) {
      setTMsg({ type: "error", text: "All fields required." }); return;
    }
    try {
      setTSubmit(true); setTMsg(null);
      await axios.post(`${API_BASE}/admin/teachers`, tForm, authHeaders());
      setTForm({ name: "", username: "", password: "" });
      setTMsg({ type: "success", text: "Teacher created!" });
      fetchTeachers();
    } catch (err) {
      setTMsg({ type: "error", text: err.response?.data?.error || "Failed to create teacher" });
    } finally { setTSubmit(false); }
  };

  const deleteTeacher = async (id, name) => {
    if (!window.confirm(`Delete teacher "${name}"?`)) return;
    try {
      setTDeleting(id);
      await axios.delete(`${API_BASE}/admin/teachers/${id}`, authHeaders());
      fetchTeachers();
    } catch { } finally { setTDeleting(null); }
  };

  // ─── SUBJECT CRUD ─────────────────────────────────────────────
  const createSubject = async () => {
    if (!sForm.name || !sForm.code) { setSMsg({ type: "error", text: "Name and code required." }); return; }
    try {
      setSSubmit(true); setSMsg(null);
      await axios.post(`${API_BASE}/admin/subjects`, sForm, authHeaders());
      setSForm({ name: "", code: "" });
      setSMsg({ type: "success", text: "Subject created!" });
      fetchSubjects();
    } catch (err) {
      setSMsg({ type: "error", text: err.response?.data?.error || "Failed to create subject" });
    } finally { setSSubmit(false); }
  };

  const deleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      setSDeleting(id);
      await axios.delete(`${API_BASE}/admin/subjects/${id}`, authHeaders());
      fetchSubjects();
    } catch { } finally { setSDeleting(null); }
  };

  const assignFaculty = async () => {
    if (!afSubject || !afTeacher) { setAfMsg({ type: "error", text: "Select subject and teacher." }); return; }
    try {
      setAfLoading(true); setAfMsg(null);
      await axios.post(`${API_BASE}/admin/assign-faculty`, { subjectId: afSubject, teacherId: afTeacher }, authHeaders());
      setAfMsg({ type: "success", text: "Faculty assigned!" });
      fetchSubjects();
    } catch (err) {
      setAfMsg({ type: "error", text: err.response?.data?.error || "Failed to assign" });
    } finally { setAfLoading(false); }
  };

  // ─── ENROLLMENT ───────────────────────────────────────────────
  const enrollStudent = async () => {
    if (!enSubject || !enStudent) { setEnMsg({ type: "error", text: "Select subject and student." }); return; }
    try {
      setEnLoading(true); setEnMsg(null);
      await axios.post(`${API_BASE}/admin/enroll-student`, { subjectId: enSubject, studentId: enStudent }, authHeaders());
      setEnMsg({ type: "success", text: "Student enrolled!" });
      fetchSubjects();
    } catch (err) {
      setEnMsg({ type: "error", text: err.response?.data?.error || "Failed to enroll" });
    } finally { setEnLoading(false); }
  };

  const unenrollStudent = async (subjectId, studentId, studentName) => {
    if (!window.confirm(`Remove "${studentName}" from this subject?`)) return;
    try {
      await axios.post(`${API_BASE}/admin/unenroll-student`, { subjectId, studentId }, authHeaders());
      fetchSubjects();
    } catch { }
  };

  // ─── ATTENDANCE OVERRIDE ─────────────────────────────────────
  const overrideAttendance = async (id, status) => {
    try {
      setAttMsg(null);
      await axios.put(`${API_BASE}/admin/attendance/${id}`, { status }, authHeaders());
      setAttMsg({ type: "success", text: "Attendance updated." });
      setAttOverride(null);
      fetchAttendance();
    } catch (err) {
      setAttMsg({ type: "error", text: err.response?.data?.error || "Failed to update" });
    }
  };

  // ─── MARKS OVERRIDE ──────────────────────────────────────────
  const saveMarksOverride = async () => {
    if (!mrkEditing) return;
    try {
      setMrkMsg(null);
      await axios.put(`${API_BASE}/admin/marks/${mrkEditing.id}`, mrkEditing.fields, authHeaders());
      setMrkMsg({ type: "success", text: "Marks updated." });
      setMrkEditing(null);
      fetchMarks();
    } catch (err) {
      setMrkMsg({ type: "error", text: err.response?.data?.error || "Failed to update" });
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="fixed top-[-10%] left-[-5%] w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-white/40">Logged in as <strong className="text-indigo-300">{adminUsername}</strong></p>
            </div>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition cursor-pointer">
            Logout
          </button>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1 pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
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

      <div className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">

        {/* ────────── STUDENTS TAB ────────── */}
        {tab === "students" && (
          <div className="animate-fade-slide-up space-y-6">
            {/* Add form */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-center text-white/90">Add New Student</h2>
              {[
                { val: name,  set: setName,  ph: "Student Name",   type: "text" },
              ].map(({ val, set, ph, type }) => (
                <input key={ph} value={val} type={type} onChange={(e) => set(e.target.value)} disabled={stSubmit}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition"
                  placeholder={ph} />
              ))}
              <Select val={course} set={setCourse} disabled={stSubmit} options={COURSES} placeholder="Select Course" />
              <Select val={department} set={setDepartment} disabled={stSubmit} options={DEPARTMENTS} placeholder="Select Department" />
              <input type="number" value={batchYear} onChange={(e) => setBatchYear(e.target.value)} disabled={stSubmit}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
                placeholder="Batch Year (e.g. 2024)" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={stSubmit}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
                placeholder="Phone Number" />
              <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} disabled={stSubmit}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
                placeholder="Personal Email" />
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/15 rounded-xl p-4 cursor-pointer hover:bg-white/5 transition">
                <span className="text-white/40 text-sm">{image ? `📎 ${image.name}` : "Click to upload profile picture"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { setImage(e.target.files[0]); setStSubError(null); }} disabled={stSubmit} />
              </label>
              {image && (
                <div className="relative w-24 mx-auto mt-2">
                  <img src={URL.createObjectURL(image)} className="w-24 h-24 rounded-full object-cover border-2 border-white/20" alt="Preview" />
                  <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm cursor-pointer" disabled={stSubmit}>✕</button>
                </div>
              )}
              {stSubError && <Msg type="error" text={stSubError} />}
              {stSuccess  && <Msg type="success" text={stSuccess} />}
              <button onClick={addStudent} disabled={stSubmit}
                className={`w-full py-3 rounded-xl font-semibold transition-all cursor-pointer ${stSubmit ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"}`}>
                {stSubmit ? "Adding..." : "Add Student"}
              </button>
            </div>

            {stError && <Msg type="error" text={stError} />}
            {stLoading && <div className="py-8"><Spinner /></div>}
            {!stLoading && students.length === 0 && <p className="text-center text-white/30 py-8">No students added yet.</p>}

            {!stLoading && students.length > 0 && (
              <>
                <h2 className="text-xl font-semibold text-white/80">All Students ({students.length})</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {students.map((s) => (
                    <div key={s._id} className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl text-center group hover:border-white/20 transition card-hover">
                      <img src={s.imageUrl} className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-white/15" alt={s.name}
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=4f46e5&color=fff&size=128`; }} />
                      <h3 className="font-bold mt-2 text-white/90">{s.name}</h3>
                      {s.admissionNumber && <p className="text-[11px] text-white/30 font-mono">Admission: {s.admissionNumber}</p>}
                      {s.usn && <p className="text-[11px] text-indigo-400 font-mono font-semibold">USN: {s.usn}</p>}
                      <p className="text-white/50 text-sm">{s.course}</p>
                      <p className="text-white/50 text-sm">{s.department}</p>
                      {s.phone && <p className="text-white/40 text-xs">📞 {s.phone}</p>}
                      {s.email && <p className="text-white/40 text-xs">✉️ {s.email}</p>}
                      <div className="mt-3 flex gap-2 justify-center">
                        <button onClick={() => openEdit(s)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition cursor-pointer">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteStudent(s._id, s.name)} disabled={stDeleting === s._id}
                          className="px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition cursor-pointer disabled:opacity-50">
                          {stDeleting === s._id ? "Deleting..." : "🗑 Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────── TEACHERS TAB ────────── */}
        {tab === "teachers" && (
          <div className="animate-fade-slide-up space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 max-w-md mx-auto space-y-3">
              <h2 className="text-lg font-semibold text-white/90">Create Teacher Account</h2>
              {[
                { key: "name",     ph: "Full Name",       type: "text" },
                { key: "username", ph: "Username",        type: "text" },
                { key: "password", ph: "Password",        type: "password" },
              ].map(({ key, ph, type }) => (
                <input key={key} type={type} value={tForm[key]}
                  onChange={(e) => setTForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph} disabled={tSubmit}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition" />
              ))}
              {tMsg && <Msg type={tMsg.type} text={tMsg.text} />}
              <button onClick={createTeacher} disabled={tSubmit}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${tSubmit ? "bg-amber-600/50 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 active:scale-[0.98]"}`}>
                {tSubmit ? "Creating..." : "Create Teacher"}
              </button>
            </div>

            <h2 className="text-xl font-semibold text-white/80">All Teachers ({teachers.length})</h2>
            {tLoading ? <div className="py-8"><Spinner /></div> : (
              <div className="grid md:grid-cols-3 gap-4">
                {teachers.map((t, i) => (
                  <div key={t._id} className={`bg-white/5 border border-white/10 rounded-2xl p-4 card-hover animate-fade-slide-up stagger-${Math.min(i+1,8)}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">🏫</div>
                      <div>
                        <p className="font-bold text-white/90">{t.name}</p>
                        <p className="text-xs text-amber-400 font-mono">@{t.username}</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/30">{(t.subjectIds || []).length} subject(s) assigned</p>
                    <button onClick={() => deleteTeacher(t._id, t.name)} disabled={tDeleting === t._id}
                      className="mt-2 px-3 py-1.5 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition cursor-pointer disabled:opacity-50">
                      {tDeleting === t._id ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </div>
                ))}
                {teachers.length === 0 && <p className="text-white/30 col-span-3 text-center py-6">No teachers yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* ────────── SUBJECTS TAB ────────── */}
        {tab === "subjects" && (
          <div className="animate-fade-slide-up space-y-6">
            {/* Create subject */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-md mx-auto space-y-3">
              <h2 className="text-lg font-semibold text-white/90">Create Subject</h2>
              <input value={sForm.name} onChange={(e) => setSForm((f) => ({ ...f, name: e.target.value }))} placeholder="Subject Name"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition" />
              <input value={sForm.code} onChange={(e) => setSForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Subject Code (e.g. CS301)"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition font-mono" />
              {sMsg && <Msg type={sMsg.type} text={sMsg.text} />}
              <button onClick={createSubject} disabled={sSubmit}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${sSubmit ? "bg-indigo-600/50" : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"}`}>
                {sSubmit ? "Creating..." : "Create Subject"}
              </button>
            </div>

            {/* Assign faculty */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-md mx-auto space-y-3">
              <h2 className="text-lg font-semibold text-white/90">Assign Faculty to Subject</h2>
              <select value={afSubject} onChange={(e) => setAfSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}>
                <option value="" className="bg-slate-800">Select Subject</option>
                {subjects.map((s) => <option key={s._id} value={s._id} className="bg-slate-800">{s.name} ({s.code})</option>)}
              </select>
              <select value={afTeacher} onChange={(e) => setAfTeacher(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}>
                <option value="" className="bg-slate-800">Select Teacher</option>
                {teachers.map((t) => <option key={t._id} value={t._id} className="bg-slate-800">{t.name} (@{t.username})</option>)}
              </select>
              {afMsg && <Msg type={afMsg.type} text={afMsg.text} />}
              <button onClick={assignFaculty} disabled={afLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${afLoading ? "bg-amber-600/50" : "bg-amber-600 hover:bg-amber-500 active:scale-[0.98]"}`}>
                {afLoading ? "Assigning..." : "Assign Faculty"}
              </button>
            </div>

            {/* Subject list */}
            <h2 className="text-xl font-semibold text-white/80">All Subjects ({subjects.length})</h2>
            {sLoading ? <div className="py-8"><Spinner /></div> : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s, i) => (
                  <div key={s._id} className={`bg-white/5 border border-white/10 rounded-2xl p-4 card-hover animate-fade-slide-up stagger-${Math.min(i+1,8)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white/90">{s.name}</h3>
                        <p className="text-xs text-indigo-400 font-mono">{s.code}</p>
                      </div>
                      <button onClick={() => deleteSubject(s._id, s.name)} disabled={sDeleting === s._id}
                        className="text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded-lg transition cursor-pointer">
                        🗑
                      </button>
                    </div>
                    <p className="text-xs text-amber-400 mt-1">
                      👤 {s.facultyId ? `${s.facultyId.name} (@${s.facultyId.username})` : "No faculty assigned"}
                    </p>
                    <p className="text-xs text-white/30 mt-1">{s.enrolledStudents?.length || 0} student(s) enrolled</p>
                  </div>
                ))}
                {subjects.length === 0 && <p className="text-white/30 col-span-3 text-center py-6">No subjects yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* ────────── ENROLLMENT TAB ────────── */}
        {tab === "enrollment" && (
          <div className="animate-fade-slide-up space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-md mx-auto space-y-3">
              <h2 className="text-lg font-semibold text-white/90">Enroll Student in Subject</h2>
              <select value={enSubject} onChange={(e) => setEnSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}>
                <option value="" className="bg-slate-800">Select Subject</option>
                {subjects.map((s) => <option key={s._id} value={s._id} className="bg-slate-800">{s.name} ({s.code})</option>)}
              </select>
              <select value={enStudent} onChange={(e) => setEnStudent(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}>
                <option value="" className="bg-slate-800">Select Student</option>
                {students.map((s) => <option key={s._id} value={s._id} className="bg-slate-800">{s.name} ({s.usn})</option>)}
              </select>
              {enMsg && <Msg type={enMsg.type} text={enMsg.text} />}
              <button onClick={enrollStudent} disabled={enLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all cursor-pointer ${enLoading ? "bg-emerald-600/50" : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]"}`}>
                {enLoading ? "Enrolling..." : "Enroll Student"}
              </button>
            </div>

            {/* Enrollment table per subject */}
            <h2 className="text-xl font-semibold text-white/80">Enrollment Overview</h2>
            <div className="space-y-4">
              {subjects.map((s) => (
                <div key={s._id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="font-semibold text-white/90">{s.name} <span className="text-xs text-indigo-400 font-mono">({s.code})</span></span>
                    <span className="text-xs text-white/40">{s.enrolledStudents?.length || 0} enrolled</span>
                  </div>
                  {(s.enrolledStudents || []).length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {s.enrolledStudents.map((st) => (
                        <div key={st._id} className="px-4 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white/80">{st.name}</p>
                            <p className="text-xs text-white/30 font-mono">{st.usn}</p>
                          </div>
                          <button onClick={() => unenrollStudent(s._id, st._id, st.name)}
                            className="text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 px-2 py-1 rounded-lg transition cursor-pointer">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/30 text-xs text-center py-4">No students enrolled.</p>
                  )}
                </div>
              ))}
              {subjects.length === 0 && <p className="text-white/30 text-center py-6">No subjects created yet.</p>}
            </div>
          </div>
        )}

        {/* ────────── ATTENDANCE TAB ────────── */}
        {tab === "attendance" && (
          <div className="animate-fade-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white/90">All Attendance Records</h2>
              <button onClick={fetchAttendance} className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer">🔄 Refresh</button>
            </div>
            {attMsg && <Msg type={attMsg.type} text={attMsg.text} />}
            {attLoading ? <div className="py-8"><Spinner /></div> : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Disputed</th>
                      <th className="px-4 py-3 text-center">Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attRecords.map((r, i) => (
                      <tr key={r._id} className="border-b border-white/5 hover:bg-white/3 transition">
                        <td className="px-4 py-2.5 text-white/60 text-xs">
                          {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-white/80 text-xs">{r.subjectId?.name}</p>
                          <p className="text-white/30 text-[10px] font-mono">{r.subjectId?.code}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-white/80 text-xs">{r.studentId?.name}</p>
                          <p className="text-white/30 text-[10px] font-mono">{r.studentId?.usn}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${r.status === "present" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {r.disputed ? (
                            <span className="text-[10px] text-yellow-400">🚩 {r.disputeReason}</span>
                          ) : <span className="text-white/20 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {attOverride === r._id ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => overrideAttendance(r._id, "present")}
                                className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md cursor-pointer hover:bg-emerald-500/30 transition">Present</button>
                              <button onClick={() => overrideAttendance(r._id, "absent")}
                                className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md cursor-pointer hover:bg-red-500/30 transition">Absent</button>
                              <button onClick={() => setAttOverride(null)}
                                className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-md cursor-pointer">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAttOverride(r._id)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer">Override</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attRecords.length === 0 && <p className="text-center text-white/30 py-8">No attendance records.</p>}
              </div>
            )}
          </div>
        )}

        {/* ────────── MARKS TAB ────────── */}
        {tab === "marks" && (
          <div className="animate-fade-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white/90">All Marks Records</h2>
              <button onClick={fetchMarks} className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer">🔄 Refresh</button>
            </div>
            {mrkMsg && <Msg type={mrkMsg.type} text={mrkMsg.text} />}
            {mrkLoading ? <div className="py-8"><Spinner /></div> : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-center">Int 1</th>
                      <th className="px-4 py-3 text-center">Int 2</th>
                      <th className="px-4 py-3 text-center">Int 3</th>
                      <th className="px-4 py-3 text-center">Final</th>
                      <th className="px-4 py-3 text-center">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrkRecords.map((m) => (
                      <tr key={m._id} className="border-b border-white/5 hover:bg-white/3 transition">
                        <td className="px-4 py-2.5">
                          <p className="text-white/80 text-xs">{m.studentId?.name}</p>
                          <p className="text-white/30 text-[10px] font-mono">{m.studentId?.usn}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-white/80 text-xs">{m.subjectId?.name}</p>
                          <p className="text-white/30 text-[10px] font-mono">{m.subjectId?.code}</p>
                        </td>
                        {mrkEditing?.id === m._id ? (
                          ["internal1", "internal2", "internal3", "finalExam"].map((k) => (
                            <td key={k} className="px-2 py-2.5 text-center">
                              <input
                                type="number" min={0} max={100}
                                value={mrkEditing.fields[k] ?? ""}
                                onChange={(e) => setMrkEditing((prev) => ({ ...prev, fields: { ...prev.fields, [k]: e.target.value } }))}
                                className="w-14 px-1 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-xs text-center focus:outline-none focus:border-indigo-500/50"
                              />
                            </td>
                          ))
                        ) : (
                          ["internal1", "internal2", "internal3", "finalExam"].map((k) => (
                            <td key={k} className="px-4 py-2.5 text-center text-white/60 text-xs">{fmt(m[k])}</td>
                          ))
                        )}
                        <td className="px-4 py-2.5 text-center">
                          {mrkEditing?.id === m._id ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveMarksOverride}
                                className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md cursor-pointer hover:bg-emerald-500/30 transition">Save</button>
                              <button onClick={() => setMrkEditing(null)}
                                className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 rounded-md cursor-pointer">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setMrkEditing({ id: m._id, fields: { internal1: m.internal1 ?? "", internal2: m.internal2 ?? "", internal3: m.internal3 ?? "", finalExam: m.finalExam ?? "" } })}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer">Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mrkRecords.length === 0 && <p className="text-center text-white/30 py-8">No marks records.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Student Modal (unchanged) ──── */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditingStudent(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit Student</h3>
              <button onClick={() => setEditingStudent(null)} className="text-white/30 hover:text-white/60 text-xl cursor-pointer">✕</button>
            </div>
            {editingStudent.admissionNumber && (
              <p className="text-xs text-white/30 font-mono">Admission: {editingStudent.admissionNumber} &nbsp;|&nbsp; USN: {editingStudent.usn}</p>
            )}
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
              placeholder="Student Name" disabled={saving} />
            <Select val={editForm.course} set={(v) => setEditForm({ ...editForm, course: v })} disabled={saving} options={COURSES} placeholder="Select Course" />
            <Select val={editForm.department} set={(v) => setEditForm({ ...editForm, department: v })} disabled={saving} options={DEPARTMENTS} placeholder="Select Department" />
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
              placeholder="Phone Number" disabled={saving} />
            <input value={editForm.email} type="email" onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition"
              placeholder="Personal Email" disabled={saving} />
            {editError && <Msg type="error" text={editError} />}
            <div className="flex gap-3">
              <button onClick={() => setEditingStudent(null)}
                className="flex-1 py-2.5 rounded-xl font-medium text-white/50 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer" disabled={saving}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer ${saving ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"}`}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared constants ───────────────────────────────────────────────
const COURSES    = ["B.Tech(Hons)", "BBA", "BSC", "MBA", "M.Tech", "LLB", "B.DES", "BA", "BS"];
const DEPARTMENTS = ["School of Computer Science", "School of Business", "School of Law", "School of Political Sciences", "School of Design"];

// ── Reusable select ────────────────────────────────────────────────
function Select({ val, set, disabled, options, placeholder }) {
  return (
    <select value={val} onChange={(e) => set(e.target.value)} disabled={disabled}
      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition appearance-none cursor-pointer"
      style={{ colorScheme: "dark" }}>
      <option value="" className="bg-slate-800">{placeholder}</option>
      {options.map((o) => <option key={o} value={o} className="bg-slate-800">{o}</option>)}
    </select>
  );
}
