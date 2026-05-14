import { ClassSelect, classLabel } from "../../components/ClassSelect.jsx";

export function StudentsPanel({
  canImportStudents,
  classes,
  isAdmin,
  onCreateStudent,
  onDeleteStudent,
  onEditStudent,
  onImportStudents,
  onSelectedClassChange,
  selectedClass,
  setSelectedFile,
  setStudentForm,
  studentForm,
  students,
}) {
  return (
    <section className="two-column">
      {canImportStudents && (
        <form className="panel" onSubmit={onImportStudents}>
          <h2>Import danh sách</h2>
          <ClassSelect
            classes={classes}
            onChange={onSelectedClassChange}
            value={selectedClass}
          />
          <input
            accept=".xlsx,.xls,.csv"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files[0])}
          />
          <div className="actions">
            <button disabled={!selectedClass} type="submit">
              Import vào lớp
            </button>
          </div>
        </form>
      )}

      {isAdmin && (
        <form className="panel" onSubmit={onCreateStudent}>
          <h2>{studentForm.id ? "Sửa sinh viên" : "Thêm sinh viên"}</h2>
          <input
            placeholder="MSSV"
            value={studentForm.studentCode}
            onChange={(event) =>
              setStudentForm({
                ...studentForm,
                studentCode: event.target.value,
              })
            }
          />
          <input
            placeholder="Họ tên"
            value={studentForm.fullName}
            onChange={(event) =>
              setStudentForm({ ...studentForm, fullName: event.target.value })
            }
          />
          <label>
            Lớp
            <select
              value={studentForm.className}
              onChange={(event) =>
                setStudentForm({
                  ...studentForm,
                  className: event.target.value,
                })
              }
            >
              <option value="">Chọn lớp</option>
              {classes.map((item) => (
                <option key={item.classCode} value={item.classCode}>
                  {classLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            {studentForm.id && (
              <button
                className="secondary"
                onClick={() =>
                  setStudentForm({
                    id: null,
                    studentCode: "",
                    fullName: "",
                    className: selectedClass,
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
        <div className="panel-head">
          <div>
            <h2>Danh sách sinh viên</h2>
            <p>Lọc theo lớp đang chọn.</p>
          </div>
          <ClassSelect
            classes={classes}
            onChange={onSelectedClassChange}
            value={selectedClass}
          />
        </div>
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
                          onClick={() => onEditStudent(student)}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          className="danger"
                          onClick={() => onDeleteStudent(student.id)}
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
  );
}
