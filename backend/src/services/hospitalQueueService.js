import { randomUUID } from "node:crypto";
import { PriorityQueue } from "../queue/PriorityQueue.js";
import { getTriageLevel } from "../data/triageLevels.js";
import { withEstimatedWaits } from "./waitTime.js";

export class HospitalQueueService {
  constructor({ eventBus, smsService, queueOptions } = {}) {
    this.queue = new PriorityQueue([], queueOptions);
    this.patients = new Map();
    this.doctors = new Map([
      [
        "doc-er-1",
        {
          id: "doc-er-1",
          fullName: "Srinadh",
          department: "Emergency",
          status: "available"
        }
      ],
      [
        "doc-er-2",
        {
          id: "doc-er-2",
          fullName: "Vishnu",
          department: "Emergency",
          status: "available"
        }
      ]
    ]);
    this.eventBus = eventBus;
    this.smsService = smsService;
  }

  async registerPatient(input) {
    this.#validatePatientInput(input);

    const patient = {
      id: randomUUID(),
      fullName: input.fullName.trim(),
      age: Number(input.age),
      phone: input.phone?.trim() ?? "",
      chiefComplaint: input.chiefComplaint.trim(),
      severityLevel: Number(input.severityLevel),
      triage: getTriageLevel(input.severityLevel),
      arrivalTime: input.arrivalTime ?? new Date().toISOString(),
      status: "waiting",
      assignedDoctorId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const queued = this.queue.enqueue(patient);
    this.patients.set(queued.id, queued);
    this.#refreshWaitTimes();

    const registered = this.patients.get(queued.id);
    this.eventBus?.emit("queue:patient-added", registered);
    this.#broadcastSnapshot();
    await this.smsService?.sendWaitTime(registered);

    return registered;
  }

  getQueue() {
    return withEstimatedWaits(this.queue.toSortedArray());
  }

  getDoctors() {
    return Array.from(this.doctors.values());
  }

  scanSlaBreaches(referenceTime = new Date()) {
    const flaggedPatients = this.queue.flagSlaBreaches(referenceTime);

    flaggedPatients.forEach((patient) => {
      this.patients.set(patient.id, patient);
      this.eventBus?.emit("queue:sla-breached", patient);
    });

    if (flaggedPatients.length > 0) {
      this.#refreshWaitTimes();
      this.#broadcastSnapshot();
    }

    return flaggedPatients;
  }

  async reevaluatePatient(patientId, input) {
    const patient = this.patients.get(patientId);
    if (!patient) {
      const error = new Error("Patient not found");
      error.statusCode = 404;
      throw error;
    }

    if (patient.status !== "waiting") {
      const error = new Error("Only waiting patients can be re-evaluated in the queue");
      error.statusCode = 409;
      throw error;
    }

    const severityLevel = Number(input.severityLevel);
    if (!getTriageLevel(severityLevel)) {
      const error = new Error("severityLevel must be an ESI value from 1 to 5");
      error.statusCode = 400;
      throw error;
    }

    const updated = this.queue.update(patientId, {
      severityLevel,
      triage: getTriageLevel(severityLevel),
      reevaluationReason: input.reason ?? "",
      updatedAt: new Date().toISOString()
    });

    this.patients.set(patientId, updated);
    this.#refreshWaitTimes();

    const refreshed = this.patients.get(patientId);
    this.eventBus?.emit("queue:patient-updated", refreshed);
    this.#broadcastSnapshot();
    await this.smsService?.sendWaitTime(refreshed);

    return refreshed;
  }

  async callNextPatient(doctorId) {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) {
      const error = new Error("Doctor not found");
      error.statusCode = 404;
      throw error;
    }

    const patient = this.queue.dequeue();
    if (!patient) {
      return null;
    }

    const calledPatient = {
      ...patient,
      status: "called",
      assignedDoctorId: doctor.id,
      updatedAt: new Date().toISOString()
    };

    const updatedDoctor = {
      ...doctor,
      status: "busy",
      currentPatientId: calledPatient.id
    };

    this.patients.set(calledPatient.id, calledPatient);
    this.doctors.set(doctor.id, updatedDoctor);
    this.#refreshWaitTimes();

    this.eventBus?.emit("queue:patient-called", { patient: calledPatient, doctor: updatedDoctor });
    this.#broadcastSnapshot();
    await this.smsService?.sendDoctorReady(calledPatient, updatedDoctor);

    return { patient: calledPatient, doctor: updatedDoctor };
  }

  #validatePatientInput(input) {
    const requiredFields = ["fullName", "age", "chiefComplaint", "severityLevel"];
    for (const field of requiredFields) {
      if (input[field] === undefined || input[field] === null || input[field] === "") {
        const error = new Error(`${field} is required`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (!Number.isInteger(Number(input.age)) || Number(input.age) < 0) {
      const error = new Error("age must be a non-negative integer");
      error.statusCode = 400;
      throw error;
    }

    if (!getTriageLevel(input.severityLevel)) {
      const error = new Error("severityLevel must be an ESI value from 1 to 5");
      error.statusCode = 400;
      throw error;
    }
  }

  #refreshWaitTimes() {
    const refreshed = this.getQueue();
    refreshed.forEach((patient) => this.patients.set(patient.id, patient));
  }

  #broadcastSnapshot() {
    this.eventBus?.emit("queue:snapshot", this.getQueue());
  }
}
