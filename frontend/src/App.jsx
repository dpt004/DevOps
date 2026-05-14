import { useEffect, useMemo, useState } from "react";
import { LoginPanel } from "./components/LoginPanel.jsx";
import { roleLabels } from "./constants/attendance.js";
import { AttendancePanel } from "./features/attendance/AttendancePanel.jsx";
import { ClassesPanel } from "./features/classes/ClassesPanel.jsx";
import { StatsPanel } from "./features/reports/StatsPanel.jsx";
import { StudentsPanel } from "./features/students/StudentsPanel.jsx";
import {
  clearStoredSession,
  createClass,
  createStudent,
  deleteClass,
  deleteStudent,
  downloadAttendanceReport,
  getAttendance,
  getClasses,
  getHealth,
  getStats,
  getStudents,
  getStoredSession,
  importStudents,
  lockAttendance,
  login,
  logout,
  saveAttendance,
  setStoredSession,
  updateClass,
  updateStudent,
} from "./api/client.js";
import { startOfMonthISO, todayISO } from "./utils/date.js";

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
  const [activeTab, setActiveTab] = useState("attendance");
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
    ["attendance", isStudent ? "Lịch sử" : "Điểm danh"],
    ["students", "Sinh viên"],
    isAdmin ? ["classes", "Lớp"] : null,
    ["stats", "Báo cáo"],
  ].filter(Boolean);

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
      });
    }
  }, [session]);

  async function refreshAll(className = selectedClass) {
    const nextClass = await loadBaseData(className);
    await loadAttendance(attendanceDate, nextClass);
    await loadStats(nextClass);
  }

  function recordsFromRows() {
    return attendanceRows.map((row) => ({
      studentId: row.student.id,
      status: row.attendance?.status || "present",
    }));
  }

  function updateAttendance(studentId, status) {
    setAttendanceRows((rows) =>
      rows.map((row) =>
        row.student.id === studentId
          ? {
              ...row,
              attendance: {
                id: row.attendance?.id,
                date: attendanceDate,
                status,
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
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hệ thống điểm danh</p>
          <h1>Student Attendance System</h1>
        </div>
        <div className={`health ${health?.status === "ok" ? "ok" : "down"}`}>
          <span />
          <strong>{health?.database === "ok" ? "MySQL OK" : "Đang kiểm tra"}</strong>
        </div>
        <div className="user-box">
          <strong>{session.user.fullName}</strong>
          <span>{roleLabels[role] || role}</span>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {(message || error) && (
        <section className={`notice ${error ? "error" : "success"}`}>
          {error || message}
        </section>
      )}

      <section className="summary-grid">
        <article>
          <span>Lớp đang chọn</span>
          <strong>{selectedClass || "-"}</strong>
        </article>
        <article>
          <span>Sinh viên trong lớp</span>
          <strong>{students.length}</strong>
        </article>
        <article>
          <span>Có mặt ngày chọn</span>
          <strong>{presentToday}</strong>
        </article>
      </section>

      <nav className="tabs" aria-label="Attendance views">
        {tabs.map(([key, label]) => (
          <button
            className={activeTab === key ? "active" : ""}
            key={key}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

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
    </main>
  );
}
