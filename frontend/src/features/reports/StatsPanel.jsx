import { ClassSelect } from "../../components/ClassSelect.jsx";

export function StatsPanel({
  classes,
  isStudent,
  onDownloadReport,
  onFilter,
  onSelectedClassChange,
  selectedClass,
  setStatsFrom,
  setStatsStudentFilter,
  setStatsTo,
  stats,
  statsFrom,
  statsStudentFilter,
  statsTo,
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Thống kê chuyên cần</h2>
          <p>Tổng hợp theo lớp, sinh viên và khoảng ngày.</p>
        </div>
        <form className="filters" onSubmit={onFilter}>
          <ClassSelect
            classes={classes}
            onChange={onSelectedClassChange}
            value={selectedClass}
          />
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
          {!isStudent && (
            <label>
              MSSV
              <input
                value={statsStudentFilter}
                onChange={(event) => setStatsStudentFilter(event.target.value)}
                placeholder="SV001"
              />
            </label>
          )}
          <button type="submit">Xem</button>
          <button className="secondary" onClick={onDownloadReport} type="button">
            Xuất CSV
          </button>
        </form>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>MSSV</th>
              <th>Họ tên</th>
              <th>Lớp</th>
              <th>Tổng buổi</th>
              <th>Có mặt</th>
              <th>Vắng</th>
              <th>Đi trễ</th>
              <th>Có phép</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.student.id}>
                <td>{row.student.studentCode}</td>
                <td>{row.student.fullName}</td>
                <td>{row.student.className}</td>
                <td>{row.totalMarked}</td>
                <td>{row.presentCount}</td>
                <td>{row.absentCount}</td>
                <td>{row.lateCount}</td>
                <td>{row.excusedCount}</td>
                <td>{row.attendanceRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
