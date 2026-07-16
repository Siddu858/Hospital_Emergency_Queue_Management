import express from "express";
import cors from "cors";
import { triageLevels } from "./data/triageLevels.js";
import { createPatientRouter } from "./routes/patientRoutes.js";
import { createDoctorRouter } from "./routes/doctorRoutes.js";

export function createApp(queueService) {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
    })
  );
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "hospital-emergency-queue" });
  });

  app.get("/api/triage-levels", (req, res) => {
    res.json({ triageLevels });
  });

  app.use("/api/patients", createPatientRouter(queueService));
  app.use("/api/doctors", createDoctorRouter(queueService));

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode ?? 500;
    res.status(statusCode).json({
      error: {
        message: error.message ?? "Unexpected server error"
      }
    });
  });

  return app;
}
