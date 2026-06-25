# Hospital Emergency Queue Management using Priority Queue

A full-stack emergency department queue system that ranks patients by clinical severity using Emergency Severity Index levels 1-5, then by arrival time for patients with identical severity.

## Tech Stack

- Backend: Node.js, Express, Socket.io
- Queue Engine: Explicit binary min-heap priority queue
- Notifications: Twilio SMS integration with a console fallback
- Frontend: React, Vite, Tailwind CSS, Socket.io client
- Testing: Node test runner, mocked event bus and SMS service
- Suggested production database: PostgreSQL

## Run Locally

```bash
npm run install:all
npm run dev
```

Backend: `http://localhost:4000`

Frontend: `http://localhost:5173`

## Backend Environment

Create `backend/.env` from `backend/.env.example` to enable Twilio SMS. Without credentials, SMS messages are logged to the console.

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PORT=4000
```

## Useful Commands

```bash
npm test --prefix backend
npm run simulate --prefix backend
```

## API Overview

- `POST /api/patients` register a new triaged patient
- `GET /api/patients/queue` fetch the current sorted queue
- `POST /api/patients/:id/reevaluate` update severity when condition changes
- `POST /api/doctors/:doctorId/call-next` call the next highest-priority waiting patient
- `GET /api/triage-levels` list ESI levels and clinical labels

Detailed design, roadmap, and database schemas are in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).
