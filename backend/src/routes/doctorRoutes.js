import express from "express";

export function createDoctorRouter(queueService) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({ doctors: queueService.getDoctors() });
  });

  router.post("/:doctorId/call-next", async (req, res, next) => {
    try {
      const result = await queueService.callNextPatient(req.params.doctorId);
      if (!result) {
        res.status(204).send();
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
