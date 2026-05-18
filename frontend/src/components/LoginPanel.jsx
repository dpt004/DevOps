import { useState } from "react";
import { register } from "../api/client.js";

export function LoginPanel({ error: loginError, loginForm, onChange, onSubmit, onRegisterSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [regForm, setRegForm] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "teacher", // Default to teacher
  });

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setLocalError("");
    setLoading(true);

    try {
      const result = await register(
        regForm.username,
        regForm.fullName,
        regForm.password,
        regForm.role
      );
      // Automatically log the user in on successful registration
      onRegisterSuccess(result);
    } catch (err) {
      setLocalError(err.message || "Đăng ký không thành công. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      {!isRegister ? (
        <form className="login-panel" onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M9 10h6" />
              <path d="M9 14h4" />
            </svg>
            <p className="eyebrow" style={{ color: 'var(--ink-secondary)', marginBottom: 6 }}>Hệ thống Quản lý Điểm danh</p>
            <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', margin: 0 }}>Đăng nhập</h1>
          </div>

          {loginError && <section className="notice error">{loginError}</section>}

          <label>
            Tên đăng nhập
            <input
              autoComplete="username"
              value={loginForm.username}
              onChange={(event) =>
                onChange({ ...loginForm, username: event.target.value })
              }
              placeholder="Ví dụ: admin"
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
              placeholder="Nhập mật khẩu của bạn"
            />
          </label>

          <button type="submit">Tiếp tục</button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => {
                setIsRegister(true);
                setLocalError("");
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
            >
              Chưa có tài khoản? Đăng ký ngay
            </button>
          </div>

          <div className="hint" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
            <span style={{ display: 'block', marginBottom: 6 }}>Tài khoản Demo (User / Pass):</span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <span><strong>admin</strong> / Admin@123</span>
              <span><strong>teacher</strong> / Teacher@123</span>
            </div>
          </div>
        </form>
      ) : (
        <form className="login-panel" onSubmit={handleRegisterSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <p className="eyebrow" style={{ color: 'var(--ink-secondary)', marginBottom: 6 }}>Tạo tài khoản mới</p>
            <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', margin: 0 }}>Đăng ký</h1>
          </div>

          {localError && <section className="notice error">{localError}</section>}

          <label>
            Họ và tên
            <input
              required
              value={regForm.fullName}
              onChange={(event) =>
                setRegForm({ ...regForm, fullName: event.target.value })
              }
              placeholder="Nhập họ và tên của bạn"
            />
          </label>

          <label>
            Tên đăng nhập
            <input
              required
              autoComplete="username"
              value={regForm.username}
              onChange={(event) =>
                setRegForm({ ...regForm, username: event.target.value })
              }
              placeholder="Ví dụ: nguyenvana"
            />
          </label>

          <label>
            Mật khẩu (tối thiểu 6 ký tự)
            <input
              required
              autoComplete="new-password"
              type="password"
              value={regForm.password}
              onChange={(event) =>
                setRegForm({ ...regForm, password: event.target.value })
              }
              placeholder="Nhập mật khẩu bảo mật"
            />
          </label>

          <label style={{ marginBottom: '18px' }}>
            Bạn là?
            <div style={{
              display: 'flex',
              background: 'var(--surface-light)',
              padding: '4px',
              borderRadius: '8px',
              marginTop: '6px',
              border: '1px solid var(--border)',
            }}>
              <button
                type="button"
                onClick={() => setRegForm({ ...regForm, role: "teacher" })}
                style={{
                  flex: 1,
                  background: regForm.role === "teacher" ? "var(--ink)" : "transparent",
                  color: regForm.role === "teacher" ? "var(--surface)" : "var(--ink-secondary)",
                  border: 'none',
                  padding: '8px 0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: regForm.role === "teacher" ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Giáo viên
              </button>
              <button
                type="button"
                onClick={() => setRegForm({ ...regForm, role: "student" })}
                style={{
                  flex: 1,
                  background: regForm.role === "student" ? "var(--ink)" : "transparent",
                  color: regForm.role === "student" ? "var(--surface)" : "var(--ink-secondary)",
                  border: 'none',
                  padding: '8px 0',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: regForm.role === "student" ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Học sinh
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng ký ngay"}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => {
                setIsRegister(false);
                setLocalError("");
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
            >
              Đã có tài khoản? Đăng nhập
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
