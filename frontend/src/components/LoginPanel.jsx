export function LoginPanel({ error, loginForm, onChange, onSubmit }) {
  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={onSubmit}>
        <p className="eyebrow">Student Attendance System</p>
        <h1>Đăng nhập</h1>
        <p className="hint">
          Demo: admin/Admin@123, teacher/Teacher@123, student/Student@123.
        </p>
        {error && <section className="notice error">{error}</section>}
        <label>
          Tên đăng nhập
          <input
            autoComplete="username"
            value={loginForm.username}
            onChange={(event) =>
              onChange({ ...loginForm, username: event.target.value })
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
              onChange({ ...loginForm, password: event.target.value })
            }
          />
        </label>
        <button type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
