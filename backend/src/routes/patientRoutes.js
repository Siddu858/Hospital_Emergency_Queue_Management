import express from "express";

export function createPatientRouter(queueService) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const patient = await queueService.registerPatient(req.body);
      res.status(201).json({ patient });
    } catch (error) {
      next(error);
    }
  });

  router.get("/queue", (req, res) => {
    res.json({ queue: queueService.getQueue() });
  });

  router.post("/sla-breaches/scan", (req, res) => {
    const referenceTime = req.body?.referenceTime ? new Date(req.body.referenceTime) : new Date();
    const breachedPatients = queueService.scanSlaBreaches(referenceTime);
    res.json({ breachedPatients, count: breachedPatients.length });
  });

  router.post("/:id/reevaluate", async (req, res, next) => {
    try {
      const patient = await queueService.reevaluatePatient(req.params.id, req.body);
      res.json({ patient });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
