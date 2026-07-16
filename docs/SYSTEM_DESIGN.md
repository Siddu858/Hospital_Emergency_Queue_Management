# System Design

## Product Goal

Hospital Emergency Queue Management prioritizes emergency department patients by Emergency Severity Index (ESI). Lower ESI values are more urgent, so ESI 1 patients always rank above ESI 2-5 patients. For the same ESI level, the earliest arrival is called first.

## Recommended Scalable Tech Stack

- Frontend: React + Vite + Tailwind CSS for a fast, component-oriented dashboard.
- Backend: Node.js + Express for REST APIs and Socket.io for real-time queue updates.
- Database: PostgreSQL with Prisma or Drizzle in production.
- Cache/coordination: Redis for distributed queue snapshots and Socket.io adapter when multiple backend instances are deployed.
- Messaging: Twilio for SMS, with a retrying outbox table in production.
- Deployment: Docker containers behind Nginx or a cloud load balancer.
- Observability: OpenTelemetry traces, structured logs, and alerting on wait-time SLAs.

## Core Priority Rule

1. Sort by `severityLevel` ascending. `1` is most critical and `5` is least urgent.
2. If severity is equal, sort by `arrivalTime` ascending.
3. If both match, sort by monotonically increasing `sequenceNumber` to guarantee deterministic ordering.

## Dynamic Aging Mechanism With Clinical Safeguards

The queue prevents starvation by calculating a dynamic composite priority score:

```text
Final Score = Base Severity - (Wait Time Minutes / Aging Interval Factor)
```

The implementation uses a binary min-heap, so the patient with the lowest final score is called first. The heap recalculates dynamic scores whenever patients are inserted, updated, sorted, scanned for SLA breaches, or called.

Clinical safeguard rules:

- ESI 1 remains the highest clinical emergency class.
- ESI 2 remains protected from low-acuity aging crossover.
- ESI 4 and ESI 5 patients may age upward, but their final score is clamped at `2`.
- SLA-breached patients are moved to the highest safe processing score, also clamped at `2`.

Example:

```text
ESI 5 patient waiting 180 minutes with a 60 minute aging factor:
5 - (180 / 60) = 2
```

That patient can move ahead of new ESI 3/4/5 arrivals, but cannot outrank ESI 1 or ESI 2 patients.

## Database Schema

### triage_levels

```sql
CREATE TABLE triage_levels (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
  code VARCHAR(16) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  color VARCHAR(16) NOT NULL,
  target_response_minutes INTEGER NOT NULL,
  description TEXT NOT NULL
);
```

### doctors

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL DEFAULT 'Emergency',
  status VARCHAR(24) NOT NULL CHECK (status IN ('available', 'busy', 'offline')),
  current_patient_id UUID NULL,
  phone VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### patients

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0),
  phone VARCHAR(32),
  chief_complaint TEXT NOT NULL,
  severity_level INTEGER NOT NULL REFERENCES triage_levels(level),
  arrival_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('waiting', 'called', 'in_treatment', 'discharged')),
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 0,
  assigned_doctor_id UUID NULL REFERENCES doctors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_queue_order
ON patients (status, severity_level ASC, arrival_time ASC);
```

### triage_events

```sql
CREATE TABLE triage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  previous_severity_level INTEGER,
  new_severity_level INTEGER NOT NULL,
  reason TEXT NOT NULL,
  recorded_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### notification_outbox

```sql
CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('sms', 'websocket')),
  event_type VARCHAR(48) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
```

## REST API

### Register Patient

`POST /api/patients`

```json
{
  "fullName": "Asha Rao",
  "age": 42,
  "phone": "+15551234567",
  "chiefComplaint": "Severe chest pain",
  "severityLevel": 2
}
```

Returns the registered patient, estimated wait time, and emits `queue:patient-added`.

### Fetch Queue

`GET /api/patients/queue`

Returns all waiting patients sorted by priority.

### Re-evaluate Patient

`POST /api/patients/:id/reevaluate`

```json
{
  "severityLevel": 1,
  "reason": "Blood pressure dropped and patient became confused"
}
```

Updates queue position and emits `queue:patient-updated`.

### SLA Breach Scan

`POST /api/patients/sla-breaches/scan`

```json
{
  "referenceTime": "2026-06-22T11:00:00.000Z"
}
```

Flags waiting patients over the hard maximum wait threshold and moves them to the highest safe processing position. The backend also runs this scan periodically in the server process.

### Call Next Patient

`POST /api/doctors/:doctorId/call-next`

Pops the highest-priority patient, marks them called, emits `queue:patient-called`, and sends an SMS.

## Real-Time Events

- `queue:snapshot`: complete sorted waiting queue
- `queue:patient-added`: patient registered
- `queue:patient-updated`: severity changed
- `queue:patient-called`: doctor called a patient

## Implementation Roadmap

1. Build queue engine with deterministic heap ordering.
2. Add Express REST API and input validation.
3. Add Socket.io queue broadcasts.
4. Add Twilio SMS abstraction and production outbox later.
5. Build nurse, waiting room, and doctor frontend views.
6. Add tests for queue ordering, API behavior, websocket events, and SMS triggers.
7. Replace in-memory repository with PostgreSQL persistence.
8. Add authentication, audit logs, rate limits, and HIPAA-aligned operational controls before real clinical use.

## Safety Note

This project demonstrates software architecture and prioritization mechanics. Real emergency triage requires licensed clinical governance, validated medical workflows, privacy compliance, downtime procedures, and human override controls.
