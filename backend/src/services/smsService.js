import twilio from "twilio";

export class SmsService {
  constructor(config = process.env) {
    this.from = config.TWILIO_FROM_NUMBER;
    this.sentMessages = [];
    this.client =
      config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN
        ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
        : null;
  }

  async sendSms(to, body) {
    if (!to) {
      return { skipped: true, reason: "missing phone number" };
    }

    this.sentMessages.push({ to, body, sentAt: new Date().toISOString() });

    if (!this.client || !this.from) {
      console.log(`[SMS fallback] ${to}: ${body}`);
      return { mocked: true };
    }

    return this.client.messages.create({
      from: this.from,
      to,
      body
    });
  }

  async sendWaitTime(patient) {
    return this.sendSms(
      patient.phone,
      `You are registered in the emergency queue. Estimated wait: ${patient.estimatedWaitMinutes} minutes.`
    );
  }

  async sendDoctorReady(patient, doctor) {
    return this.sendSms(
      patient.phone,
      `Doctor ${doctor.fullName} is ready to see you now. Please proceed to the consultation room.`
    );
  }
}
