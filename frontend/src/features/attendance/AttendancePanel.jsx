import { ClassSelect } from "../../components/ClassSelect.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
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
  selectedClass,
  setAttendanceStatusFilter,
  setAttendanceStudentFilter,
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{isStudent ? "Lịch sử điểm danh" : "Điểm danh theo ngày"}</h2>
          <p>{attendanceRows.length} dòng dữ liệu trong lớp đang chọn.</p>
        </div>
        <form className="filters" onSubmit={onFilter}>
          <ClassSelect
            classes={classes}
            onChange={onSelectedClassChange}
            value={selectedClass}
          />
          <label>
            Ngày
            <input
              type="date"
              value={attendanceDate}
              onChange={(event) => onDateChange(event.target.value)}
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
      </div>

      {attendanceLock && (
        <div className="lock-banner">
          <strong>Đã khóa</strong>
          <span>
            {attendanceLock.lockedBy.fullName} chốt lớp {attendanceLock.className}
            {" "}ngày {attendanceLock.date}
          </span>
        </div>
      )}

      {attendanceRows.length === 0 ? (
        <EmptyState>Chưa có sinh viên trong lớp đang chọn.</EmptyState>
      ) : (
        <form onSubmit={onSave}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Trạng thái</th>
                  <th>Người điểm danh</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row) => (
                  <tr key={row.student.id}>
                    <td>{row.student.studentCode}</td>
                    <td>{row.student.fullName}</td>
                    <td>{row.student.className}</td>
                    <td>
                      {canMarkAttendance ? (
                        <div className="attendance-options">
                          {attendanceStatuses.map(([status, label]) => (
                            <label className="attendance-choice" key={status}>
                              <input
                                checked={
                                  (row.attendance?.status || "present") === status
                                }
                                disabled={Boolean(attendanceLock)}
                                name={`attendance-${row.student.id}`}
                                onChange={() => onStatusChange(row.student.id, status)}
                                type="radio"
                              />
                              <span aria-hidden="true" className="checkmark" />
                              <strong>{label}</strong>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="status-pill">
                          {row.attendance?.statusLabel || "Chưa điểm danh"}
                        </span>
                      )}
                    </td>
                    <td>{row.attendance?.markedBy?.fullName || "-"}</td>
                  </tr>
                ))}
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
