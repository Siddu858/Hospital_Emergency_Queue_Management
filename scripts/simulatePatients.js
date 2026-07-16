import { EventBus } from "../backend/src/services/eventBus.js";
import { HospitalQueueService } from "../backend/src/services/hospitalQueueService.js";

class SimulationSmsService {
  constructor() {
    this.sent = [];
  }

  async sendWaitTime(patient) {
    this.sent.push({ type: "wait-time", patientId: patient.id, wait: patient.estimatedWaitMinutes });
  }

  async sendDoctorReady(patient, doctor) {
    this.sent.push({ type: "doctor-ready", patientId: patient.id, doctorId: doctor.id });
  }
}

const complaints = [
  "Chest pain",
  "Shortness of breath",
  "Fractured wrist",
  "High fever",
  "Severe abdominal pain",
  "Minor laceration",
  "Migraine",
  "Dizziness",
  "Burn injury",
  "Allergic reaction"
];

const names = [
  "Asha Rao",
  "Vikram Iyer",
  "Nina Shah",
  "Kabir Sen",
  "Leela Thomas",
  "Rohan Das",
  "Maya Nair",
  "Ishaan Mehta",
  "Tara Bose",
  "Dev Patel"
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runSimulation() {
  const eventBus = new EventBus();
  const smsService = new SimulationSmsService();
  const service = new HospitalQueueService({ eventBus, smsService });
  const start = new Date("2026-06-22T09:00:00.000Z").getTime();
  const registered = [];

  for (let index = 0; index < 20; index += 1) {
    const severityLevel = randomBetween(1, 5);
    const patient = await service.registerPatient({
      fullName: `${names[index % names.length]} ${index + 1}`,
      age: randomBetween(8, 88),
      phone: `+15550000${String(index + 1).padStart(3, "0")}`,
      chiefComplaint: complaints[index % complaints.length],
      severityLevel,
      arrivalTime: new Date(start + randomBetween(0, 90) * 60_000).toISOString()
    });
    registered.push(patient);
  }

  const deteriorationTargets = registered.filter((patient) => patient.severityLevel > 1).slice(0, 3);
  for (const patient of deteriorationTargets) {
    await service.reevaluatePatient(patient.id, {
      severityLevel: 1,
      reason: "Simulation deterioration scenario"
    });
  }

  await service.callNextPatient("doc-er-1");
  await service.callNextPatient("doc-er-2");

  console.log("Final waiting queue:");
  console.table(
    service.getQueue().map((patient) => ({
      position: patient.queuePosition,
      name: patient.fullName,
      esi: patient.severityLevel,
      arrival: patient.arrivalTime,
      wait: patient.estimatedWaitMinutes
    }))
  );
  console.log(`Events emitted: ${eventBus.events.length}`);
  console.log(`SMS triggers: ${smsService.sent.length}`);
}

runSimulation().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
