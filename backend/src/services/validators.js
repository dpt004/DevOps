export const attendanceStatuses = ["present", "absent"];

export function normalizeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error("Date must use YYYY-MM-DD format."), {
      statusCode: 400,
    });
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error("Date is invalid."), { statusCode: 400 });
  }

  return value;
}

export function normalizeStatus(value) {
  if (!attendanceStatuses.includes(value)) {
    throw Object.assign(
      new Error(`Status must be one of: ${attendanceStatuses.join(", ")}.`),
      { statusCode: 400 },
    );
  }

  return value;
}

export function validateAttendanceRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw Object.assign(new Error("Records must be a non-empty array."), {
      statusCode: 400,
    });
  }

  return records.map((record) => {
    const studentId = Number(record.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      throw Object.assign(new Error("studentId must be a positive integer."), {
        statusCode: 400,
      });
    }

    return {
      studentId,
      status: normalizeStatus(record.status),
    };
  });
}
