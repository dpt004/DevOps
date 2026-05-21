import { dayOfWeekOptions, subjectOptions, roomOptions } from "../../constants/schedule.js";
function newScheduleForm() {
  return {
    id: null,
    classId: "",
    teacherId: "",
    dayOfWeek: 1,
    startTime: "07:00",
    endTime: "09:00",
    room: "",
    subjectName: "",
  };
}

export { newScheduleForm };

export function ScheduleAssignmentPanel({
  classes,
  scheduleForm,
  schedules,
  teachers,
  onDeleteSchedule,
  onSubmit,
  setScheduleForm,
}) {
  return (
    <section className="schedule-assignment two-column">
      <form className="panel schedule-form" onSubmit={onSubmit}>
        <h2>{scheduleForm.id ? "Sửa phân công tiết" : "Phân công tiết học"}</h2>
        <p className="panel-hint">
          Hệ thống tự kiểm tra trùng khung giờ: cùng giáo viên hoặc cùng lớp trong một thứ.
        </p>

        <label>
          Lớp học
          <select
            required
            value={scheduleForm.classId}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, classId: event.target.value })
            }
          >
            <option value="">— Chọn lớp —</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.classCode} — {item.className}
              </option>
            ))}
          </select>
        </label>

        <label>
          Giảng viên
          <select
            required
            value={scheduleForm.teacherId}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, teacherId: event.target.value })
            }
          >
            <option value="">— Chọn giảng viên —</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName} ({teacher.username})
              </option>
            ))}
          </select>
        </label>

        <label>
          Thứ
          <select
            value={scheduleForm.dayOfWeek}
            onChange={(event) =>
              setScheduleForm({
                ...scheduleForm,
                dayOfWeek: Number(event.target.value),
              })
            }
          >
            {dayOfWeekOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            Giờ bắt đầu
            <input
              required
              type="time"
              value={scheduleForm.startTime}
              onChange={(event) =>
                setScheduleForm({ ...scheduleForm, startTime: event.target.value })
              }
            />
          </label>
          <label>
            Giờ kết thúc
            <input
              required
              type="time"
              value={scheduleForm.endTime}
              onChange={(event) =>
                setScheduleForm({ ...scheduleForm, endTime: event.target.value })
              }
            />
          </label>
        </div>

        <label>
          Môn học
          <select
            required
            value={scheduleForm.subjectName}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, subjectName: event.target.value })
            }
          >
            <option value="">— Chọn môn học —</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label>
          Phòng học
          <select
            required
            value={scheduleForm.room}
            onChange={(event) =>
              setScheduleForm({ ...scheduleForm, room: event.target.value })
            }
          >
            <option value="">— Chọn phòng học —</option>
            {roomOptions.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </label>

        <div className="actions">
          {scheduleForm.id && (
            <button
              className="secondary"
              onClick={() => setScheduleForm(newScheduleForm())}
              type="button"
            >
              Hủy
            </button>
          )}
          <button type="submit">
            {scheduleForm.id ? "Lưu sửa" : "Thêm phân công"}
          </button>
        </div>
      </form>

      <section className="panel schedule-list-panel">
        <h2>Thời khóa biểu toàn hệ thống</h2>
        {schedules.length === 0 ? (
          <p className="timetable-empty">Chưa có phân công tiết học.</p>
        ) : (
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Thứ</th>
                  <th>Giờ</th>
                  <th>Lớp</th>
                  <th>GV</th>
                  <th>SV</th>
                  <th>Môn / Phòng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {schedules.map((slot) => (
                  <tr key={slot.id}>
                    <td>{slot.dayLabel}</td>
                    <td>
                      <strong>{slot.startTime}</strong>–{slot.endTime}
                    </td>
                    <td>{slot.classCode}</td>
                    <td>{slot.teacher?.fullName || "—"}</td>
                    <td>{slot.studentCount}</td>
                    <td>
                      {slot.subjectName || "—"}
                      {slot.room ? ` · ${slot.room}` : ""}
                    </td>
                    <td className="row-actions">
                      <button
                        className="secondary"
                        onClick={() =>
                          setScheduleForm({
                            id: slot.id,
                            classId: String(slot.classId),
                            teacherId: String(slot.teacherId),
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            room: slot.room || "",
                            subjectName: slot.subjectName || "",
                          })
                        }
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="danger"
                        onClick={() => onDeleteSchedule(slot.id)}
                        type="button"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

