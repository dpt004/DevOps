import { Router } from "express";
import multer from "multer";
import { checkDatabase } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  importStudents,
  parseStudentWorkbook,
} from "../services/excelStudentImport.js";
import {
  createStudent,
  deleteStudent,
  getAttendanceByDate,
  getAttendanceStats,
  listStudents,
  saveAttendance,
  updateStudent,
} from "../services/attendanceService.js";
import { login } from "../services/authService.js";

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

apiRouter.post("/auth/login", async (req, res, next) => {
  try {
    res.json({ data: await login(req.body.username, req.body.password) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/auth/logout", requireAuth, (req, res) => {
  res.json({ data: { success: true } });
});

apiRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json({ data: { user: req.user } });
});

apiRouter.get("/students", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await listStudents() });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/students", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const student = await createStudent(req.body);
    res.status(201).json({ data: student });
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/students/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.json({ data: await updateStudent(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/students/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.json({ data: await deleteStudent(req.params.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post(
  "/students/import",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req, res, next) => {
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
  },
);

apiRouter.get("/attendance", requireAuth, async (req, res, next) => {
  try {
    const rows = await getAttendanceByDate(req.query.date);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/attendance", requireAuth, requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    const rows = await saveAttendance(req.body.date, req.body.records);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/stats", requireAuth, async (req, res, next) => {
  try {
    const rows = await getAttendanceStats(req.query.from, req.query.to);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});
