import { useState, useEffect } from "react";
import { ClassSelect, classLabel } from "../../components/ClassSelect.jsx";
import { getUnassignedStudentUsers } from "../../api/client.js";

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
  const [unassignedUsers, setUnassignedUsers] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      getUnassignedStudentUsers()
        .then(setUnassignedUsers)
        .catch((err) => console.error("Error fetching unassigned student users:", err));
    }
  }, [students, isAdmin]);

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
          
          {studentForm.id ? (
            <>
              <input
                placeholder="MSSV"
                value={studentForm.studentCode}
                required
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
                required
                onChange={(event) =>
                  setStudentForm({ ...studentForm, fullName: event.target.value })
                }
              />
            </>
          ) : (
            unassignedUsers.length === 0 ? (
              <p className="hint" style={{ color: "var(--danger)", textAlign: "left", marginBottom: "16px", fontWeight: "600" }}>
                ⚠️ Tất cả tài khoản sinh viên đã được xếp lớp.
              </p>
            ) : (
              <label style={{ display: "block", marginBottom: "16px" }}>
                Tài khoản sinh viên đã đăng ký
                <select
                  value={studentForm.studentCode}
                  required
                  onChange={(event) => {
                    const val = event.target.value;
                    const selectedUser = unassignedUsers.find(u => u.studentCode === val);
                    if (selectedUser) {
                      setStudentForm({
                        ...studentForm,
                        studentCode: selectedUser.studentCode,
                        fullName: selectedUser.fullName,
                      });
                    } else {
                      setStudentForm({
                        ...studentForm,
                        studentCode: "",
                        fullName: "",
                      });
                    }
                  }}
                >
                  <option value="">-- Chọn tài khoản sinh viên --</option>
                  {unassignedUsers.map((user) => (
                    <option key={user.studentCode} value={user.studentCode}>
                      {user.studentCode} - {user.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}

          <label>
            Lớp xếp vào
            <select
              value={studentForm.className}
              required
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
            <button 
              type="submit" 
              disabled={!studentForm.id && unassignedUsers.length === 0}
            >
              {studentForm.id ? "Lưu sửa" : "Thêm vào lớp"}
            </button>
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
