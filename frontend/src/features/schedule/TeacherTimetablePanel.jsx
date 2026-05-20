import { dayLabels } from "../../constants/schedule.js";
import { dateForWeekday, isoDayOfWeek } from "../../utils/date.js";

function groupByDay(slots) {
  const groups = {};
  for (let day = 1; day <= 7; day += 1) {
    groups[day] = [];
  }
  for (const slot of slots) {
    groups[slot.dayOfWeek]?.push(slot);
  }
  for (const day of Object.keys(groups)) {
    groups[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return groups;
}

export function TeacherTimetablePanel({
  slots,
  isStudent = false,
  onOpenAttendance,
}) {
  const grouped = groupByDay(slots);
  const todayDay = isoDayOfWeek();
  const todaySlots = grouped[todayDay] || [];

  return (
    <section className="timetable-panel">
      {todaySlots.length > 0 && (
        <div className="timetable-today-banner panel">
          <div>
            <p className="eyebrow">Hôm nay</p>
            <h2>
              {todaySlots.length} {isStudent ? "tiết học" : "tiết dạy"}
            </h2>
          </div>
          <p className="timetable-today-hint">
            {isStudent
              ? "Chọn tiết để xem lịch sử điểm danh của bạn trong ngày đó."
              : "Chọn tiết bên dưới để mở màn hình điểm danh nhanh."}
          </p>
        </div>
      )}

      {slots.length === 0 && (
        <div className="panel timetable-empty-state">
          <p>
            {isStudent
              ? "Chưa có thời khóa biểu cho lớp của bạn. Liên hệ quản trị viên để được phân công tiết học."
              : "Chưa có tiết dạy được phân công."}
          </p>
        </div>
      )}

      <div className="timetable-week-grid">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const daySlots = grouped[day] || [];
          const isToday = day === todayDay;

          return (
            <article
              className={`timetable-day-column panel ${isToday ? "is-today" : ""}`}
              key={day}
            >
              <header className="timetable-day-header">
                <h3>{dayLabels[day]}</h3>
                {isToday && <span className="timetable-today-badge">Hôm nay</span>}
                <span className="timetable-day-count">{daySlots.length} tiết</span>
              </header>

              {daySlots.length === 0 ? (
                <p className="timetable-empty">Không có tiết học</p>
              ) : (
                <div className="timetable-slot-list">
                  {daySlots.map((slot) => (
                    <button
                      className={`timetable-slot-card ${isStudent ? "is-student" : ""}`}
                      key={slot.id}
                      onClick={() =>
                        onOpenAttendance?.({
                          classCode: slot.classCode,
                          date: dateForWeekday(slot.dayOfWeek),
                          slot,
                        })
                      }
                      type="button"
                    >
                      <div className="timetable-slot-time">
                        <strong>{slot.startTime}</strong>
                        <span>→ {slot.endTime}</span>
                      </div>
                      <h4>
                        {isStudent
                          ? slot.subjectName || slot.className || slot.classCode
                          : slot.className || slot.classCode}
                      </h4>
                      {!isStudent && slot.subjectName && (
                        <p className="timetable-slot-subject">{slot.subjectName}</p>
                      )}
                      <div className="timetable-slot-meta">
                        {isStudent ? (
                          <>
                            <span>{slot.classCode}</span>
                            {slot.teacher?.fullName && (
                              <span>GV: {slot.teacher.fullName}</span>
                            )}
                          </>
                        ) : (
                          <span>{slot.studentCount} sinh viên</span>
                        )}
                        {slot.room && <span>Phòng {slot.room}</span>}
                      </div>
                      {onOpenAttendance && (
                        <span className="timetable-slot-cta">
                          {isStudent ? "Xem lịch sử →" : "Điểm danh →"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
