import { useEffect, useMemo, useState } from "react";
import { LoginPanel } from "./components/LoginPanel.jsx";
import { roleLabels } from "./constants/attendance.js";
import { AttendancePanel } from "./features/attendance/AttendancePanel.jsx";
import { ClassesPanel } from "./features/classes/ClassesPanel.jsx";
import { StatsPanel } from "./features/reports/StatsPanel.jsx";
import { StudentsPanel } from "./features/students/StudentsPanel.jsx";
import {
  newScheduleForm,
  ScheduleAssignmentPanel,
} from "./features/schedule/ScheduleAssignmentPanel.jsx";
import { TeacherTimetablePanel } from "./features/schedule/TeacherTimetablePanel.jsx";
import {
  clearStoredSession,
  createClass,
  createSchedule,
  createStudent,
  deleteClass,
  deleteSchedule,
  deleteStudent,
  downloadAttendanceReport,
  getAttendance,
  getClasses,
  getHealth,
  getSchedules,
  getScheduleTeachers,
  getStats,
  getStudents,
  getStoredSession,
  getTimetable,
  importStudents,
  lockAttendance,
  login,
  logout,
  saveAttendance,
  setStoredSession,
  unlockAttendance,
  updateClass,
  updateSchedule,
  updateStudent,
} from "./api/client.js";
import { isoDayOfWeek, startOfMonthISO, todayISO } from "./utils/date.js";

function defaultTabForRole(role) {
  if (role === "teacher" || role === "student") return "timetable";
  return "attendance";
}

function newStudentForm(className = "") {
  return {
    id: null,
    studentCode: "",
    fullName: "",
    className,
  };
}

function newClassForm() {
  return {
    id: null,
    classCode: "",
    className: "",
  };
}

export function App() {
  const [session, setSession] = useState(getStoredSession());
  const [activeTab, setActiveTab] = useState(() =>
    defaultTabForRole(getStoredSession()?.user?.role),
  );
  const [health, setHealth] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLock, setAttendanceLock] = useState(null);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [attendanceStudentFilter, setAttendanceStudentFilter] = useState("");
  const [statsFrom, setStatsFrom] = useState(startOfMonthISO());
  const [statsTo, setStatsTo] = useState(todayISO());
  const [statsStudentFilter, setStatsStudentFilter] = useState("");
  const [stats, setStats] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [studentForm, setStudentForm] = useState(newStudentForm());
  const [classForm, setClassForm] = useState(newClassForm());
  const [selectedFile, setSelectedFile] = useState(null);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(newScheduleForm());
  const [loginForm, setLoginForm] = useState({
    username: "admin",
    password: "Admin@123",
  });

  const role = session?.user?.role;
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const canMarkAttendance = role === "admin" || role === "teacher";
  const canImportStudents = role === "admin" || role === "teacher";
  const presentToday = useMemo(
    () =>
      attendanceRows.filter((row) => row.attendance?.status === "present")
        .length,
    [attendanceRows],
  );
  const tabs = [
    role === "teacher" || role === "student" || role === "admin"
      ? ["timetable", "Thời khóa biểu"]
      : null,
    ["attendance", isStudent ? "Lịch sử" : "Điểm danh"],
    isStudent ? null : ["students", "Sinh viên"],
    isAdmin ? ["classes", "Lớp"] : null,
    isAdmin ? ["schedules", "Phân công tiết"] : null,
    ["stats", "Báo cáo"],
  ].filter(Boolean);

  const todayTimetableCount = useMemo(() => {
    const today = isoDayOfWeek();
    return timetableSlots.filter((slot) => slot.dayOfWeek === today).length;
  }, [timetableSlots]);

  function handleApiError(err) {
    if (err.status === 401) {
      clearStoredSession();
      setSession(null);
    }
    setError(err.message);
  }

  async function runTask(callback) {
    try {
      setError("");
      await callback();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function loadBaseData(className = selectedClass) {
    const [healthData, classData] = await Promise.all([
      getHealth(),
      getClasses(),
    ]);
    const nextClass = className || classData[0]?.classCode || "";
    const studentData = await getStudents(
      nextClass ? { className: nextClass } : {},
    );

    setHealth(healthData);
    setClasses(classData);
    setSelectedClass(nextClass);
    setStudents(studentData);
    setStudentForm((current) =>
      current.id ? current : { ...current, className: nextClass },
    );

    return nextClass;
  }

  async function loadAttendance(
    date = attendanceDate,
    className = selectedClass,
    filters = {},
  ) {
    if (!date || !className) {
      setAttendanceRows([]);
      setAttendanceLock(null);
      return;
    }

    const result = await getAttendance({
      date,
      className,
      status: filters.status ?? attendanceStatusFilter,
      studentCode: filters.studentCode ?? attendanceStudentFilter,
    });
    setAttendanceRows(result.rows || []);
    setAttendanceLock(result.lock || null);
  }

  async function loadScheduleData() {
    if (role === "admin") {
      const [scheduleData, teacherData] = await Promise.all([
        getSchedules(),
        getScheduleTeachers(),
      ]);
      setSchedules(scheduleData);
      setTeachers(teacherData);
    }

    if (role === "teacher" || role === "admin" || role === "student") {
      const slots = await getTimetable();
      setTimetableSlots(slots);
    }
  }

  async function loadStats(className = selectedClass, studentCode = statsStudentFilter) {
    if (!statsFrom || !statsTo) {
      return;
    }

    const rows = await getStats({
      from: statsFrom,
      to: statsTo,
      className,
      studentCode: isStudent ? "" : studentCode,
    });
    setStats(rows);
  }

  useEffect(() => {
    if (session) {
      runTask(async () => {
        const className = await loadBaseData();
        await loadAttendance(attendanceDate, className);
        await loadStats(className);
        await loadScheduleData();
      });
    }
  }, [session]);

  // Tự động tắt thông báo thành công sau 4 giây
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Tự động tắt thông báo lỗi sau 4 giây
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function refreshAll(className = selectedClass) {
    const nextClass = await loadBaseData(className);
    await loadAttendance(attendanceDate, nextClass);
    await loadStats(nextClass);
  }

  function recordsFromRows() {
    return attendanceRows.map((row) => ({
      studentId: row.student.id,
      status: row.attendance?.status || "present",
      absenceReason: row.attendance?.absenceReason || "",
      isExcused: Boolean(row.attendance?.isExcused),
    }));
  }

  function updateAttendance(studentId, fields) {
    setAttendanceRows((rows) =>
      rows.map((row) =>
        row.student.id === studentId
          ? {
              ...row,
              attendance: {
                ...(row.attendance || { date: attendanceDate }),
                ...fields,
              },
            }
          : row,
      ),
    );
  }

  async function handleSelectedClassChange(value) {
    setSelectedClass(value);
    setStudentForm((current) =>
      current.id ? current : { ...current, className: value },
    );
    await runTask(async () => {
      const studentData = await getStudents(value ? { className: value } : {});
      setStudents(studentData);
      await loadAttendance(attendanceDate, value);
      await loadStats(value);
    });
  }

  async function handleDateChange(value) {
    setAttendanceDate(value);
    await runTask(async () => {
      await loadAttendance(value, selectedClass);
    });
  }

  async function handleSaveAttendance(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");
      const result = await saveAttendance(
        attendanceDate,
        selectedClass,
        recordsFromRows(),
      );
      setAttendanceRows(result.rows || []);
      setAttendanceLock(result.lock || null);
      await loadStats(selectedClass);
      setMessage("Đã lưu điểm danh.");
    });
  }

  async function handleLockAttendance() {
    await runTask(async () => {
      setMessage("");
      await saveAttendance(attendanceDate, selectedClass, recordsFromRows());
      const lock = await lockAttendance(attendanceDate, selectedClass);
      setAttendanceLock(lock);
      await loadAttendance(attendanceDate, selectedClass);
      await loadStats(selectedClass);
      setMessage("Đã lưu và khóa điểm danh cho lớp đã chọn.");
    });
  }

  function handleUnlockAttendance() {
    setUnlockConfirmOpen(true);
  }

  async function confirmUnlockAttendance() {
    setUnlockConfirmOpen(false);
    await runTask(async () => {
      setMessage("");
      await unlockAttendance(attendanceDate, selectedClass);
      setAttendanceLock(null);
      await loadAttendance(attendanceDate, selectedClass);
      await loadStats(selectedClass);
      setMessage("Đã mở khóa điểm danh. Bạn có thể chỉnh sửa lại.");
    });
  }

  async function handleAttendanceFilter(event) {
    event.preventDefault();
    await runTask(async () => {
      await loadAttendance(attendanceDate, selectedClass);
    });
  }

  async function handleCreateStudent(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");
      const payload = {
        ...studentForm,
        className: studentForm.className || selectedClass,
      };

      if (payload.id) {
        await updateStudent(payload);
      } else {
        await createStudent(payload);
      }

      setStudentForm(newStudentForm(selectedClass));
      await refreshAll(payload.className);
      setMessage(payload.id ? "Đã cập nhật sinh viên." : "Đã thêm sinh viên.");
    });
  }

  async function handleDeleteStudent(studentId) {
    await runTask(async () => {
      setMessage("");
      await deleteStudent(studentId);
      await refreshAll();
      setMessage("Đã xóa sinh viên.");
    });
  }

  function editStudent(student) {
    setStudentForm({
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      className: student.className,
    });
  }

  async function handleImportStudents(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");

      if (!selectedClass) {
        setError("Chọn lớp trước khi import danh sách sinh viên.");
        return;
      }

      if (!selectedFile) {
        setError("Chọn file Excel hoặc CSV trước khi import.");
        return;
      }

      const result = await importStudents(selectedFile, selectedClass);
      setSelectedFile(null);
      await refreshAll(result.className || selectedClass);
      setMessage(
        `Đã import ${result.imported} sinh viên vào lớp ${selectedClass} (${result.inserted} mới, ${result.updated} cập nhật).`,
      );
    });
  }

  async function handleClassSubmit(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");
      const result = classForm.id
        ? await updateClass(classForm)
        : await createClass(classForm);
      setClassForm(newClassForm());
      await refreshAll(result.classCode);
      setMessage(classForm.id ? "Đã cập nhật lớp." : "Đã thêm lớp.");
    });
  }

  async function handleDeleteClass(classId) {
    await runTask(async () => {
      setMessage("");
      await deleteClass(classId);
      await refreshAll("");
      setMessage("Đã xóa lớp.");
    });
  }

  async function handleStatsFilter(event) {
    event.preventDefault();
    await runTask(async () => {
      await loadStats(selectedClass);
    });
  }

  async function handleScheduleSubmit(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");
      const payload = {
        classId: Number(scheduleForm.classId),
        teacherId: Number(scheduleForm.teacherId),
        dayOfWeek: scheduleForm.dayOfWeek,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        room: scheduleForm.room,
        subjectName: scheduleForm.subjectName,
      };

      const isEdit = Boolean(scheduleForm.id);
      if (isEdit) {
        await updateSchedule({ ...payload, id: scheduleForm.id });
      } else {
        await createSchedule(payload);
      }

      setScheduleForm(newScheduleForm());
      await loadScheduleData();
      setMessage(
        isEdit ? "Đã cập nhật phân công tiết." : "Đã thêm phân công tiết.",
      );
    });
  }

  async function handleDeleteSchedule(scheduleId) {
    await runTask(async () => {
      setMessage("");
      await deleteSchedule(scheduleId);
      await loadScheduleData();
      setMessage("Đã xóa phân công tiết.");
    });
  }

  async function handleOpenAttendanceFromSlot({ classCode, date }) {
    setActiveTab("attendance");
    setAttendanceDate(date);
    await runTask(async () => {
      if (!isStudent) {
        const studentData = await getStudents(classCode ? { className: classCode } : {});
        setStudents(studentData);
      }
      if (classCode) {
        setSelectedClass(classCode);
      }
      await loadAttendance(date, classCode || selectedClass);
      const dateLabel = date.split("-").reverse().join("/");
      setMessage(
        isStudent
          ? `Đã mở lịch sử điểm danh ngày ${dateLabel}.`
          : `Đã mở điểm danh lớp ${classCode} — ${dateLabel}.`,
      );
    });
  }

  async function handleDownloadReport() {
    await runTask(async () => {
      await downloadAttendanceReport({
        from: statsFrom,
        to: statsTo,
        className: selectedClass,
        studentCode: isStudent ? "" : statsStudentFilter,
      });
      setMessage("Đã xuất báo cáo CSV.");
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    await runTask(async () => {
      setMessage("");
      const loginSession = await login(loginForm.username, loginForm.password);
      setStoredSession(loginSession);
      setSession(loginSession);
      setActiveTab(defaultTabForRole(loginSession.user.role));
    });
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local logout still clears the session if the token has already expired.
    }
    clearStoredSession();
    setSession(null);
    setHealth(null);
    setClasses([]);
    setSelectedClass("");
    setStudents([]);
    setAttendanceRows([]);
    setAttendanceLock(null);
    setStats([]);
    setMessage("");
    setError("");
  }

  if (!session) {
    return (
      <LoginPanel
        error={error}
        loginForm={loginForm}
        onChange={setLoginForm}
        onSubmit={handleLogin}
        onRegisterSuccess={(loginSession) => {
          setStoredSession(loginSession);
          setSession(loginSession);
        }}
      />
    );
  }

  const tabIcons = {
    attendance: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14h6" />
        <path d="M9 18h6" />
        <path d="M9 10h6" />
      </svg>
    ),
    students: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    classes: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M9 10h6" />
        <path d="M9 14h4" />
      </svg>
    ),
    stats: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    timetable: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    schedules: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };

  const welcomeMessages = {
    admin: "Xin chào Quản trị viên! Bạn có toàn quyền thiết lập danh mục lớp, thêm sửa xoá sinh viên và kiểm tra báo cáo.",
    teacher: "Kính chào Giảng viên! Mở Thời khóa biểu để chọn tiết dạy và điểm danh nhanh, hoặc tra cứu báo cáo chuyên cần.",
    student: "Chào bạn Sinh viên! Xem Thời khóa biểu lớp, tra lịch sử điểm danh theo ngày và tỷ lệ chuyên cần cá nhân.",
  };

  const activeTabTitle = {
    timetable: isStudent ? "Thời khóa biểu lớp học" : "Thời khóa biểu giảng dạy",
    attendance: isStudent ? "Lịch sử điểm danh" : "Quản lý điểm danh",
    students: "Danh sách sinh viên",
    classes: "Danh mục lớp học",
    schedules: "Phân công tiết học",
    stats: "Báo cáo chuyên cần",
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M9 10h6" />
              <path d="M9 14h4" />
            </svg>
            <h2>SAS Portal</h2>
          </div>

          <nav className="sidebar-nav" aria-label="Tab navigation">
            {tabs.map(([key, label]) => (
              <button
                className={activeTab === key ? "active" : ""}
                key={key}
                onClick={() => setActiveTab(key)}
                type="button"
              >
                {tabIcons[key]}
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-profile-card">
            <div className="sidebar-user">
              <div className="user-avatar">
                {session.user.fullName ? session.user.fullName.substring(0, 2).toUpperCase() : "US"}
              </div>
              <div className="user-info">
                <strong>{session.user.fullName}</strong>
                <span>{roleLabels[role] || role}</span>
              </div>
            </div>

            <div className={`health ${health?.status === "ok" ? "ok" : "down"}`}>
              <span />
              <strong>{health?.database === "ok" ? "MySQL Online" : "Đang kiểm tra"}</strong>
            </div>

            <button className="logout-btn" type="button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <main className="content-area">
        <header className="content-header">
          <div>
            <p className="eyebrow">Hệ thống điểm danh</p>
            <h1>{activeTabTitle[activeTab]}</h1>
          </div>
          <div className="header-date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {(message || error) && (
          <section className={`notice ${error ? "error" : "success"}`}>
            <span style={{ flex: 1 }}>{error || message}</span>
            <button
              onClick={() => {
                setMessage("");
                setError("");
              }}
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "2px",
                marginLeft: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.6,
                transition: "opacity 0.2s",
                height: "auto",
                width: "auto"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </section>
        )}

        <div className="dashboard-content-layout">
          <div className="dashboard-main-col">
            {activeTab === "timetable" &&
              (role === "teacher" || role === "admin" || role === "student") && (
              <TeacherTimetablePanel
                isStudent={isStudent}
                slots={timetableSlots}
                onOpenAttendance={handleOpenAttendanceFromSlot}
              />
            )}

            {activeTab === "schedules" && isAdmin && (
              <ScheduleAssignmentPanel
                classes={classes}
                scheduleForm={scheduleForm}
                schedules={schedules}
                teachers={teachers}
                onDeleteSchedule={handleDeleteSchedule}
                onSubmit={handleScheduleSubmit}
                setScheduleForm={setScheduleForm}
              />
            )}

            {activeTab === "attendance" && (
              <AttendancePanel
                attendanceDate={attendanceDate}
                attendanceLock={attendanceLock}
                attendanceRows={attendanceRows}
                attendanceStatusFilter={attendanceStatusFilter}
                attendanceStudentFilter={attendanceStudentFilter}
                canMarkAttendance={canMarkAttendance}
                classes={classes}
                isStudent={isStudent}
                onDateChange={handleDateChange}
                onFilter={handleAttendanceFilter}
                onLock={handleLockAttendance}
                onSave={handleSaveAttendance}
                onSelectedClassChange={handleSelectedClassChange}
                onStatusChange={updateAttendance}
                onUnlockAttendance={handleUnlockAttendance}
                selectedClass={selectedClass}
                setAttendanceStatusFilter={setAttendanceStatusFilter}
                setAttendanceStudentFilter={setAttendanceStudentFilter}
              />
            )}

            {activeTab === "students" && (
              <StudentsPanel
                canImportStudents={canImportStudents}
                classes={classes}
                isAdmin={isAdmin}
                onCreateStudent={handleCreateStudent}
                onDeleteStudent={handleDeleteStudent}
                onEditStudent={editStudent}
                onImportStudents={handleImportStudents}
                onSelectedClassChange={handleSelectedClassChange}
                selectedClass={selectedClass}
                setSelectedFile={setSelectedFile}
                setStudentForm={setStudentForm}
                studentForm={studentForm}
                students={students}
              />
            )}

            {activeTab === "classes" && isAdmin && (
              <ClassesPanel
                classForm={classForm}
                classes={classes}
                onDeleteClass={handleDeleteClass}
                onSubmit={handleClassSubmit}
                setClassForm={setClassForm}
              />
            )}

            {activeTab === "stats" && (
              <StatsPanel
                classes={classes}
                isStudent={isStudent}
                onDownloadReport={handleDownloadReport}
                onFilter={handleStatsFilter}
                onSelectedClassChange={handleSelectedClassChange}
                selectedClass={selectedClass}
                setStatsFrom={setStatsFrom}
                setStatsStudentFilter={setStatsStudentFilter}
                setStatsTo={setStatsTo}
                stats={stats}
                statsFrom={statsFrom}
                statsStudentFilter={statsStudentFilter}
                statsTo={statsTo}
              />
            )}
          </div>

          <div className="dashboard-side-col">
            <div className="welcome-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <strong>Bảng điều khiển {roleLabels[role]}</strong>
                <p>{welcomeMessages[role] || "Chúc bạn một ngày học tập và làm việc hiệu quả."}</p>
              </div>
            </div>

            <section className="summary-grid">
              <article className="card-class">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Lớp đang chọn</span>
                  <div className="metric-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                  </div>
                </div>
                <strong>{selectedClass || "-"}</strong>
              </article>
              <article className="card-students">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Sinh viên trong lớp</span>
                  <div className="metric-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </div>
                </div>
                <strong>{students.length}</strong>
              </article>
              {(role === "teacher" || role === "admin" || role === "student") && (
                <article className="card-schedule">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{isStudent ? "Tiết học hôm nay" : "Tiết dạy hôm nay"}</span>
                    <div className="metric-icon-wrap">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                  </div>
                  <strong>{todayTimetableCount}</strong>
                </article>
              )}
              <article className="card-present">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Có mặt ngày chọn</span>
                  <div className="metric-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                </div>
                <strong>{presentToday}</strong>
              </article>
            </section>
          </div>
        </div>

        <footer className="app-footer">
          <p>© 2026 Student Attendance System. DevOps & UI/UX Orchestrated by dpt004.</p>
        </footer>
      </main>

      {unlockConfirmOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h3>Xác nhận mở khóa</h3>
            </div>
            <div className="custom-modal-body">
              <p>Bạn có chắc chắn muốn mở khóa điểm danh cho lớp <strong>{selectedClass}</strong> ngày <strong>{attendanceDate.split('-').reverse().join('/')}</strong> không?</p>
              <p className="custom-modal-subtext">Sau khi mở khóa, các giáo viên có thể chỉnh sửa lại trạng thái điểm danh của học viên.</p>
            </div>
            <div className="custom-modal-footer">
              <button className="modal-cancel-btn" onClick={() => setUnlockConfirmOpen(false)}>Hủy bỏ</button>
              <button className="modal-confirm-btn" onClick={confirmUnlockAttendance}>Đồng ý mở khóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
