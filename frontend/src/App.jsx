import { useEffect, useMemo, useState } from "react";
import {
  clearStoredSession,
  createStudent,
  deleteStudent,
  getAttendance,
  getHealth,
  getStats,
  getStudents,
  getStoredSession,
  importStudents,
  login,
  logout,
  saveAttendance,
  setStoredSession,
  updateStudent,
} from "./api/client.js";
import { startOfMonthISO, todayISO } from "./utils/date.js";

function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

export function App() {
  const [session, setSession] = useState(getStoredSession());
  const [activeTab, setActiveTab] = useState("attendance");
  const [health, setHealth] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [statsFrom, setStatsFrom] = useState(startOfMonthISO());
  const [statsTo, setStatsTo] = useState(todayISO());
  const [stats, setStats] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [studentForm, setStudentForm] = useState({
    id: null,
    studentCode: "",
    fullName: "",
    className: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loginForm, setLoginForm] = useState({
    username: "admin",
    password: "Admin@123",
  });

  const isAdmin = session?.user?.role === "admin";
  const studentCount = students.length;
  const presentToday = useMemo(
    () =>
      attendanceRows.filter((row) => row.attendance?.status === "present")
        .length,
    [attendanceRows],
  );

  async function loadBaseData() {
    const [healthData, studentData] = await Promise.all([
      getHealth(),
      getStudents(),
    ]);
    setHealth(healthData);
    setStudents(studentData);
  }

  async function loadAttendance(date = attendanceDate) {
    const rows = await getAttendance(date);
    setAttendanceRows(rows);
  }

  async function loadStats() {
    const rows = await getStats(statsFrom, statsTo);
    setStats(rows);
  }

  useEffect(() => {
    if (session) {
      loadBaseData()
        .then(() => loadAttendance(attendanceDate))
        .then(() => loadStats())
        .catch((err) => {
          if (err.status === 401) {
            clearStoredSession();
            setSession(null);
          }
          setError(err.message);
        });
    }
  }, [session]);

  async function refreshAll() {
    setError("");
    await loadBaseData();
    await loadAttendance(attendanceDate);
    await loadStats();
  }

  function updateAttendance(studentId, field, value) {
    setAttendanceRows((rows) =>
      rows.map((row) =>
        row.student.id === studentId
          ? {
              ...row,
              attendance: {
                id: row.attendance?.id,
                date: attendanceDate,
                status:
                  field === "status" ? value : row.attendance?.status || "present",
              },
            }
          : row,
      ),
    );
  }

  async function handleSaveAttendance(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const records = attendanceRows.map((row) => ({
      studentId: row.student.id,
      status: row.attendance?.status || "present",
    }));

    await saveAttendance(attendanceDate, records);
    await loadAttendance(attendanceDate);
    await loadStats();
    setMessage("Đã lưu điểm danh.");
  }

  async function handleCreateStudent(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (studentForm.id) {
      await updateStudent(studentForm);
    } else {
      await createStudent(studentForm);
    }

    setStudentForm({
      id: null,
      studentCode: "",
      fullName: "",
      className: "",
    });
    await refreshAll();
    setMessage(studentForm.id ? "Đã cập nhật sinh viên." : "Đã thêm sinh viên.");
  }

  async function handleDeleteStudent(studentId) {
    setError("");
    setMessage("");
    await deleteStudent(studentId);
    await refreshAll();
    setMessage("Đã xóa sinh viên.");
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
    setError("");
    setMessage("");

    if (!selectedFile) {
      setError("Chọn file Excel trước khi import.");
      return;
    }

    const result = await importStudents(selectedFile);
    setSelectedFile(null);
    await refreshAll();
    setMessage(
      `Đã import ${result.imported} sinh viên (${result.inserted} mới, ${result.updated} cập nhật).`,
    );
  }

  async function handleDateChange(value) {
    setAttendanceDate(value);
    setError("");
    await loadAttendance(value);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const loginSession = await login(loginForm.username, loginForm.password);
    setStoredSession(loginSession);
    setSession(loginSession);
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
    setStudents([]);
    setAttendanceRows([]);
    setStats([]);
    setMessage("");
    setError("");
  }

  if (!session) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={handleLogin}>
          <p className="eyebrow">Student Attendance System</p>
          <h1>Đăng nhập</h1>
          <p className="hint">Tài khoản demo: admin/Admin@123 hoặc teacher/Teacher@123.</p>
          {error && <section className="notice error">{error}</section>}
          <label>
            Tên đăng nhập
            <input
              autoComplete="username"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm({ ...loginForm, username: event.target.value })
              }
            />
          </label>
          <label>
            Mật khẩu
            <input
              autoComplete="current-password"
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm({ ...loginForm, password: event.target.value })
              }
            />
          </label>
          <button type="submit">Đăng nhập</button>
        </form>
      </main>
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
          <span>{session.user.role === "admin" ? "Quản trị" : "Giảng viên"}</span>
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
          <span>Sinh viên</span>
          <strong>{studentCount}</strong>
        </article>
        <article>
          <span>Có mặt ngày chọn</span>
          <strong>{presentToday}</strong>
        </article>
        <article>
          <span>Database</span>
          <strong>MySQL</strong>
        </article>
      </section>

      <nav className="tabs" aria-label="Attendance views">
        {[
          ["attendance", "Điểm danh"],
          ["students", "Sinh viên"],
          ["stats", "Thống kê"],
        ].map(([key, label]) => (
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
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Điểm danh theo ngày</h2>
              <p>{attendanceRows.length} sinh viên trong danh sách.</p>
            </div>
            <label>
              Ngày
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </label>
          </div>

          {attendanceRows.length === 0 ? (
            <EmptyState>Import hoặc thêm sinh viên trước khi điểm danh.</EmptyState>
          ) : (
            <form onSubmit={handleSaveAttendance}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Họ tên</th>
                      <th>Lớp</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row) => (
                      <tr key={row.student.id}>
                        <td>{row.student.studentCode}</td>
                        <td>{row.student.fullName}</td>
                        <td>{row.student.className}</td>
                        <td>
                          <div className="attendance-options">
                            {[
                              ["present", "Có mặt"],
                              ["absent", "Vắng"],
                            ].map(([status, label]) => (
                              <label className="attendance-choice" key={status}>
                                <input
                                  checked={
                                    (row.attendance?.status || "present") === status
                                  }
                                  name={`attendance-${row.student.id}`}
                                  onChange={() =>
                                    updateAttendance(row.student.id, "status", status)
                                  }
                                  type="radio"
                                />
                                <span aria-hidden="true" className="checkmark" />
                                <strong>{label}</strong>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="actions">
                <button type="submit">Lưu điểm danh</button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === "students" && (
        <section className="two-column">
          {isAdmin && (
            <form className="panel" onSubmit={handleImportStudents}>
              <h2>Import Excel</h2>
              <p className="hint">Cột hỗ trợ: MSSV, Họ tên, Lớp.</p>
              <input
                accept=".xlsx,.xls,.csv"
                type="file"
                onChange={(event) => setSelectedFile(event.target.files[0])}
              />
              <div className="actions">
                <button type="submit">Import danh sách</button>
              </div>
            </form>
          )}

          {isAdmin && (
          <form className="panel" onSubmit={handleCreateStudent}>
            <h2>{studentForm.id ? "Sửa sinh viên" : "Thêm sinh viên"}</h2>
            <input
              placeholder="MSSV"
              value={studentForm.studentCode}
              onChange={(event) =>
                setStudentForm({ ...studentForm, studentCode: event.target.value })
              }
            />
            <input
              placeholder="Họ tên"
              value={studentForm.fullName}
              onChange={(event) =>
                setStudentForm({ ...studentForm, fullName: event.target.value })
              }
            />
            <input
              placeholder="Lớp"
              value={studentForm.className}
              onChange={(event) =>
                setStudentForm({ ...studentForm, className: event.target.value })
              }
            />
            <div className="actions">
              {studentForm.id && (
                <button
                  className="secondary"
                  onClick={() =>
                    setStudentForm({
                      id: null,
                      studentCode: "",
                      fullName: "",
                      className: "",
                    })
                  }
                  type="button"
                >
                  Hủy
                </button>
              )}
              <button type="submit">{studentForm.id ? "Lưu sửa" : "Thêm"}</button>
            </div>
          </form>
          )}

          <section className="panel wide">
            <h2>Danh sách sinh viên</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>MSSV</th>
                    <th>Họ tên</th>
                    <th>Lớp</th>
                    {isAdmin && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.studentCode}</td>
                      <td>{student.fullName}</td>
                      <td>{student.className}</td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button
                              className="secondary"
                              onClick={() => editStudent(student)}
                              type="button"
                            >
                              Sửa
                            </button>
                            <button
                              className="danger"
                              onClick={() => handleDeleteStudent(student.id)}
                              type="button"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === "stats" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Thống kê số buổi</h2>
              <p>Tổng hợp theo khoảng ngày.</p>
            </div>
            <div className="date-range">
              <label>
                Từ
                <input
                  type="date"
                  value={statsFrom}
                  onChange={(event) => setStatsFrom(event.target.value)}
                />
              </label>
              <label>
                Đến
                <input
                  type="date"
                  value={statsTo}
                  onChange={(event) => setStatsTo(event.target.value)}
                />
              </label>
              <button type="button" onClick={loadStats}>
                Xem
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Số buổi có mặt</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row) => (
                  <tr key={row.student.id}>
                    <td>{row.student.studentCode}</td>
                    <td>{row.student.fullName}</td>
                    <td>{row.student.className}</td>
                    <td>{row.presentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
