import test from "node:test";
import assert from "node:assert/strict";
import { EventBus } from "../src/services/eventBus.js";
import { HospitalQueueService } from "../src/services/hospitalQueueService.js";

class FakeSmsService {
  constructor() {
    this.waitTimeMessages = [];
    this.doctorReadyMessages = [];
  }

  async sendWaitTime(patient) {
    this.waitTimeMessages.push(patient);
  }

  async sendDoctorReady(patient, doctor) {
    this.doctorReadyMessages.push({ patient, doctor });
  }
}

test("register, reevaluate, and call-next emit websocket events and SMS triggers", async () => {
  const eventBus = new EventBus();
  const smsService = new FakeSmsService();
  const service = new HospitalQueueService({ eventBus, smsService });

  const first = await service.registerPatient({
    fullName: "Patient One",
    age: 31,
    phone: "+15550000001",
    chiefComplaint: "Fever",
    severityLevel: 4,
    arrivalTime: "2026-06-22T09:00:00.000Z"
  });

  const second = await service.registerPatient({
    fullName: "Patient Two",
    age: 44,
    phone: "+15550000002",
    chiefComplaint: "Chest pain",
    severityLevel: 3,
    arrivalTime: "2026-06-22T09:05:00.000Z"
  });

  await service.reevaluatePatient(first.id, {
    severityLevel: 1,
    reason: "Patient became unstable"
  });

  const called = await service.callNextPatient("doc-er-1");

  assert.equal(called.patient.id, first.id);
  assert.equal(service.getQueue()[0].id, second.id);
  assert.equal(smsService.waitTimeMessages.length, 3);
  assert.equal(smsService.doctorReadyMessages.length, 1);
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:patient-added"));
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:patient-updated"));
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:patient-called"));
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:snapshot"));
});

test("SLA scan flags patients and emits queue update events", async () => {
  const eventBus = new EventBus();
  const smsService = new FakeSmsService();
  const service = new HospitalQueueService({
    eventBus,
    smsService,
    queueOptions: {
      agingIntervalMinutes: 120,
      slaBreachMinutes: 120,
      nowProvider: () => new Date("2026-06-22T11:00:00.000Z")
    }
  });

  const patient = await service.registerPatient({
    fullName: "Long Waiting Patient",
    age: 57,
    phone: "+15550000003",
    chiefComplaint: "Persistent pain",
    severityLevel: 5,
    arrivalTime: "2026-06-22T08:30:00.000Z"
  });

  const flagged = service.scanSlaBreaches(new Date("2026-06-22T11:00:00.000Z"));

  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].id, patient.id);
  assert.equal(service.getQueue()[0].slaBreached, true);
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:sla-breached"));
  assert.ok(eventBus.events.some((event) => event.eventName === "queue:snapshot"));
});
