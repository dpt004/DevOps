import { Router } from "express";
import multer from "multer";
import { checkDatabase } from "../db/pool.js";
import {
  importStudents,
  parseStudentWorkbook,
} from "../services/excelStudentImport.js";
import {
  createStudent,
  getAttendanceByDate,
  getAttendanceStats,
  listStudents,
  saveAttendance,
} from "../services/attendanceService.js";

export const apiRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

apiRouter.get("/health", async (req, res, next) => {
  try {
    const database = await checkDatabase();
    res.json({
      status: "ok",
      service: "attendance-backend",
      database: database ? "ok" : "unhealthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/students", async (req, res, next) => {
  try {
    res.json({ data: await listStudents() });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/students", async (req, res, next) => {
  try {
    const student = await createStudent(req.body);
    res.status(201).json({ data: student });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/students/import", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw Object.assign(new Error("Excel file is required."), {
        statusCode: 400,
      });
    }

    const students = parseStudentWorkbook(req.file.buffer);
    const summary = await importStudents(students);
    res.status(201).json({ data: summary });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/attendance", async (req, res, next) => {
  try {
    const rows = await getAttendanceByDate(req.query.date);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/attendance", async (req, res, next) => {
  try {
    const rows = await saveAttendance(req.body.date, req.body.records);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/stats", async (req, res, next) => {
  try {
    const rows = await getAttendanceStats(req.query.from, req.query.to);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});
