import { ClassSelect } from "../../components/ClassSelect.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { CustomDatePicker } from "../../components/CustomDatePicker.jsx";
import { attendanceStatuses } from "../../constants/attendance.js";

export function AttendancePanel({
  attendanceDate,
  attendanceLock,
  attendanceRows,
  attendanceStatusFilter,
  attendanceStudentFilter,
  canMarkAttendance,
  classes,
  isStudent,
  onDateChange,
  onFilter,
  onLock,
  onSave,
  onSelectedClassChange,
  onStatusChange,
  onUnlockAttendance,
  selectedClass,
  setAttendanceStatusFilter,
  setAttendanceStudentFilter,
}) {
  return (
    <section className="panel">
      <div className="panel-head" style={{ borderBottom: 'none', marginBottom: '12px', paddingBottom: '0' }}>
        <div>
          <h2>{isStudent ? "Lịch sử điểm danh" : "Điểm danh theo ngày"}</h2>
          <p>{attendanceRows.length} dòng dữ liệu trong lớp đang chọn.</p>
        </div>
      </div>

      <form className="filters-bar" onSubmit={onFilter}>
        <ClassSelect
          classes={classes}
          onChange={onSelectedClassChange}
          value={selectedClass}
        />
        <label>
          Ngày
          <CustomDatePicker
            value={attendanceDate}
            onChange={onDateChange}
            selectedClass={selectedClass}
          />
        </label>
        <label>
          Trạng thái
          <select
            value={attendanceStatusFilter}
            onChange={(event) => setAttendanceStatusFilter(event.target.value)}
          >
            <option value="">Tất cả</option>
            {attendanceStatuses.map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {!isStudent && (
          <label>
            MSSV
            <input
              value={attendanceStudentFilter}
              onChange={(event) => setAttendanceStudentFilter(event.target.value)}
              placeholder="SV001"
            />
          </label>
        )}
        <button type="submit">Lọc</button>
      </form>

      {attendanceLock && (
        <div className="lock-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <strong>Đã khóa</strong>
          <span style={{ flex: 1 }}>
            {attendanceLock.lockedBy.fullName} đã chốt sổ điểm danh cho lớp <strong>{attendanceLock.className}</strong> ngày <strong>{attendanceLock.date}</strong>.
          </span>
          {canMarkAttendance && (
            <button
              className="unlock-btn"
              onClick={onUnlockAttendance}
              type="button"
              style={{
                marginLeft: '16px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)',
              }}
            >
              Mở khóa
            </button>
          )}
        </div>
      )}

      {attendanceRows.length === 0 ? (
        <EmptyState>Chưa có sinh viên trong lớp đang chọn.</EmptyState>
      ) : (
        <form onSubmit={onSave}>
          <div className="table-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>MSSV</th>
                  <th style={{ textAlign: 'left' }}>Họ tên</th>
                  <th style={{ width: '120px' }}>Lớp</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Có mặt</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Đi trễ</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Vắng</th>
                  <th style={{ minWidth: '180px' }}>Lý do vắng</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Có phép</th>
                  <th>Người điểm danh</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row) => {
                  const studentId = row.student.id;
                  const isPresent = (row.attendance?.status || "present") === "present";
                  const isLate = (row.attendance?.status || "present") === "late";
                  const isAbsent = (row.attendance?.status || "present") === "absent";
                  const absenceReason = row.attendance?.absenceReason || "";
                  const isExcused = Boolean(row.attendance?.isExcused);
                  const markedBy = row.attendance?.markedBy?.fullName || "-";

                  let rowClass = "att-row";
                  if (isPresent) {
                    rowClass += " att-row-present";
                  } else if (isLate) {
                    rowClass += " att-row-late";
                  } else if (isExcused) {
                    rowClass += " att-row-excused";
                  } else {
                    rowClass += " att-row-absent";
                  }

                  return (
                    <tr key={studentId} className={rowClass}>
                      <td>{row.student.studentCode}</td>
                      <td>
                        <div className="att-student-info">
                          <div className="att-avatar">{row.student.fullName.charAt(0)}</div>
                          <strong>{row.student.fullName}</strong>
                        </div>
                      </td>
                      <td>{row.student.className}</td>

                      {/* Có mặt Column */}
                      <td style={{ textAlign: 'center' }}>
                        {canMarkAttendance ? (
                          <label className="att-radio att-radio-present">
                            <input
                              type="radio"
                              name={`status-${studentId}`}
                              value="present"
                              checked={isPresent}
                              disabled={Boolean(attendanceLock)}
                              onChange={() => onStatusChange(studentId, {
                                status: "present",
                                absenceReason: "",
                                isExcused: false
                              })}
                            />
                            <span className="att-radio-mark att-mark-present" />
                          </label>
                        ) : (
                          isPresent ? <span className="status-pill present">Có mặt</span> : null
                        )}
                      </td>

                      {/* Đi trễ Column */}
                      <td style={{ textAlign: 'center' }}>
                        {canMarkAttendance ? (
                          <label className="att-radio att-radio-late">
                            <input
                              type="radio"
                              name={`status-${studentId}`}
                              value="late"
                              checked={isLate}
                              disabled={Boolean(attendanceLock)}
                              onChange={() => onStatusChange(studentId, {
                                status: "late",
                                absenceReason: "",
                                isExcused: false
                              })}
                            />
                            <span className="att-radio-mark att-mark-late" />
                          </label>
                        ) : (
                          isLate ? <span className="status-pill late">Đi trễ</span> : null
                        )}
                      </td>

                      {/* Vắng Column */}
                      <td style={{ textAlign: 'center' }}>
                        {canMarkAttendance ? (
                          <label className="att-radio att-radio-absent">
                            <input
                              type="radio"
                              name={`status-${studentId}`}
                              value="absent"
                              checked={isAbsent}
                              disabled={Boolean(attendanceLock)}
                              onChange={() => onStatusChange(studentId, {
                                status: "absent"
                              })}
                            />
                            <span className="att-radio-mark att-mark-absent" />
                          </label>
                        ) : (
                          isAbsent ? (
                            isExcused ? (
                              <span className="status-pill excused">Vắng có phép</span>
                            ) : (
                              <span className="status-pill absent">Vắng không phép</span>
                            )
                          ) : null
                        )}
                      </td>

                      {/* Lý do Column */}
                      <td>
                        {canMarkAttendance ? (
                          <input
                            type="text"
                            className="att-reason-input"
                            value={absenceReason}
                            placeholder="Nhập lý do..."
                            disabled={isPresent || Boolean(attendanceLock)}
                            onChange={(e) => onStatusChange(studentId, {
                              absenceReason: e.target.value
                            })}
                          />
                        ) : (
                          isAbsent ? (absenceReason || "Không có lý do") : "—"
                        )}
                      </td>

                      {/* Có phép Column */}
                      <td style={{ textAlign: 'center' }}>
                        {canMarkAttendance ? (
                          <label className="att-checkbox">
                            <input
                              type="checkbox"
                              checked={isExcused}
                              disabled={isPresent || Boolean(attendanceLock)}
                              onChange={(e) => onStatusChange(studentId, {
                                isExcused: e.target.checked
                              })}
                            />
                            <span className="att-checkbox-mark" />
                          </label>
                        ) : (
                          isAbsent ? (isExcused ? "✓" : "✗") : "—"
                        )}
                      </td>

                      <td>{markedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canMarkAttendance && (
            <div className="actions">
              <button
                className="secondary"
                disabled={Boolean(attendanceLock)}
                onClick={onLock}
                type="button"
              >
                Xác nhận và khóa
              </button>
              <button disabled={Boolean(attendanceLock)} type="submit">
                Lưu điểm danh
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
