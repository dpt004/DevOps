import { Router } from "express";
import multer from "multer";
import { checkDatabase } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  importStudents,
  parseStudentWorkbook,
} from "../services/excelStudentImport.js";
import {
  createClass,
  createStudent,
  deleteClass,
  deleteStudent,
  getAttendanceByDate,
  getAttendanceStats,
  listClasses,
  listStudents,
  lockAttendance,
  saveAttendance,
  statsToCsv,
  updateClass,
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
    res.json({ data: await listStudents(req.query, req.user) });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/classes", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await listClasses(req.user) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/classes", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.status(201).json({ data: await createClass(req.body) });
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.json({ data: await updateClass(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/classes/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.json({ data: await deleteClass(req.params.id) });
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
  requireRole("admin", "teacher"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw Object.assign(new Error("Excel file is required."), {
          statusCode: 400,
        });
      }

      const importClassName = String(req.body.className || "").trim();
      if (!importClassName) {
        throw Object.assign(new Error("className is required for import."), {
          statusCode: 400,
        });
      }

      const students = parseStudentWorkbook(req.file.buffer, importClassName);
      const summary = await importStudents(students);
      res.status(201).json({ data: summary });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.get("/attendance", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await getAttendanceByDate(req.query, req.user) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/attendance", requireAuth, requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    res.json({
      data: await saveAttendance(
        req.body.date,
        req.body.className,
        req.body.records,
        req.user,
      ),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/attendance/lock", requireAuth, requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    res.json({
      data: await lockAttendance(req.body.date, req.body.className, req.user),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/stats", requireAuth, async (req, res, next) => {
  try {
    res.json({ data: await getAttendanceStats(req.query, req.user) });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/reports/attendance.csv", requireAuth, async (req, res, next) => {
  try {
    const rows = await getAttendanceStats(req.query, req.user);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"attendance-report.csv\"",
    );
    res.send(statsToCsv(rows));
  } catch (error) {
    next(error);
  }
});
