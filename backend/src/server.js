import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { EventBus } from "./services/eventBus.js";
import { HospitalQueueService } from "./services/hospitalQueueService.js";
import { SmsService } from "./services/smsService.js";

const eventBus = new EventBus();
const smsService = new SmsService();
const queueService = new HospitalQueueService({ eventBus, smsService });
const app = createApp(queueService);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
  }
});

eventBus.attach(io);

io.on("connection", (socket) => {
  socket.emit("queue:snapshot", queueService.getQueue());
});

const port = process.env.PORT ?? 4000;
const slaScanIntervalMs = Number(process.env.SLA_SCAN_INTERVAL_MS ?? 60_000);

setInterval(() => {
  const breachedPatients = queueService.scanSlaBreaches();
  if (breachedPatients.length > 0) {
    console.log(`SLA scan flagged ${breachedPatients.length} waiting patient(s).`);
  }
}, slaScanIntervalMs).unref();

server.listen(port, () => {
  console.log(`Emergency queue API listening on http://localhost:${port}`);
});
