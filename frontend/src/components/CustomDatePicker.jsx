import React, { useState, useEffect, useRef } from "react";
import { getMarkedDates } from "../api/client.js";

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
};

export function CustomDatePicker({ value, onChange, selectedClass }) {
  const [isOpen, setIsOpen] = useState(false);
  const [markedDates, setMarkedDates] = useState([]);
  const [viewDate, setViewDate] = useState(parseLocalDate(value));
  const containerRef = useRef(null);

  // Fetch marked dates whenever class changes or popover opens
  useEffect(() => {
    if (selectedClass) {
      getMarkedDates(selectedClass)
        .then((dates) => {
          setMarkedDates(dates || []);
        })
        .catch((err) => {
          console.error("Error fetching marked dates:", err);
        });
    } else {
      setMarkedDates([]);
    }
  }, [selectedClass, isOpen]);

  // Sync viewDate with selected value when value changes
  useEffect(() => {
    if (value) {
      setViewDate(parseLocalDate(value));
    }
  }, [value]);

  // Click outside to close calendar
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Helper to change months
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Helper to format date as YYYY-MM-DD
  const formatDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // UI Date presentation format: DD/MM/YYYY
  const formatPresentation = (dateStr) => {
    if (!dateStr) return "Chọn ngày";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Get calendar days array
  const getDaysInMonth = () => {
    const days = [];
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1...
    
    // Shift Sunday to be index 6, Monday to be index 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysCount = new Date(year, month + 1, 0).getDate();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDaysCount - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isFiller: true,
      });
    }

    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isFiller: false,
      });
    }

    // Next month filler days (fill up to complete weeks of 7)
    const remaining = 42 - days.length; // standard 6 rows
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isFiller: true,
      });
    }

    return days;
  };

  const handleSelectDay = (dayObj) => {
    const dateStr = formatDateString(dayObj.year, dayObj.month, dayObj.day);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleGoToday = () => {
    const today = new Date();
    const dateStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    onChange(dateStr);
    setViewDate(today);
    setIsOpen(false);
  };

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const days = getDaysInMonth();
  const todayStr = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <div className="custom-datepicker" ref={containerRef}>
      <div className="datepicker-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{formatPresentation(value)}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>

      {isOpen && (
        <div className="datepicker-popover">
          <div className="datepicker-header">
            <button type="button" className="dp-nav-btn" onClick={handlePrevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className="dp-month-year">
              {monthNames[month]} {year}
            </div>
            <button type="button" className="dp-nav-btn" onClick={handleNextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          <div className="datepicker-weekdays">
            {weekdays.map((wd) => (
              <div key={wd} className="dp-weekday">
                {wd}
              </div>
            ))}
          </div>

          <div className="datepicker-days">
            {days.map((d, index) => {
              const dateStr = formatDateString(d.year, d.month, d.day);
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              const isMarked = markedDates.includes(dateStr);

              return (
                <div
                  key={index}
                  className={`dp-day ${d.isFiller ? "filler" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => !d.isFiller ? handleSelectDay(d) : undefined}
                  style={{ cursor: d.isFiller ? "default" : "pointer" }}
                >
                  <span className="dp-day-number">{d.day}</span>
                  {isMarked && !d.isFiller && <span className="dp-day-dot" title="Đã điểm danh" />}
                </div>
              );
            })}
          </div>

          <div className="datepicker-footer">
            <button type="button" className="dp-today-btn" onClick={handleGoToday}>
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
