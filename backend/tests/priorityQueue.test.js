import test from "node:test";
import assert from "node:assert/strict";
import { PriorityQueue } from "../src/queue/PriorityQueue.js";

function patient(id, severityLevel, arrivalTime) {
  return { id, fullName: id, severityLevel, arrivalTime };
}

const testNow = () => new Date("2026-06-22T10:30:00.000Z");

test("priority queue sorts by severity before arrival time", () => {
  const queue = new PriorityQueue([], { nowProvider: testNow });

  queue.enqueue(patient("late-critical", 1, "2026-06-22T10:30:00.000Z"));
  queue.enqueue(patient("early-low", 5, "2026-06-22T09:00:00.000Z"));
  queue.enqueue(patient("mid-urgent", 2, "2026-06-22T09:30:00.000Z"));

  assert.equal(queue.dequeue().id, "late-critical");
  assert.equal(queue.dequeue().id, "mid-urgent");
  assert.equal(queue.dequeue().id, "early-low");
});

test("priority queue uses arrival time as tie breaker for identical severity", () => {
  const queue = new PriorityQueue([], { nowProvider: testNow });

  queue.enqueue(patient("second", 3, "2026-06-22T10:30:00.000Z"));
  queue.enqueue(patient("first", 3, "2026-06-22T10:00:00.000Z"));
  queue.enqueue(patient("third", 3, "2026-06-22T11:00:00.000Z"));

  assert.deepEqual(
    [queue.dequeue().id, queue.dequeue().id, queue.dequeue().id],
    ["first", "second", "third"]
  );
});

test("reevaluating a patient repositions the patient in the heap", () => {
  const queue = new PriorityQueue([], { nowProvider: testNow });

  queue.enqueue(patient("stable", 4, "2026-06-22T09:00:00.000Z"));
  queue.enqueue(patient("worsening", 4, "2026-06-22T09:10:00.000Z"));
  queue.update("worsening", { severityLevel: 1 });

  assert.equal(queue.peek().id, "worsening");
});

test("aging allows a long-waiting low severity patient to beat a newly arrived slightly higher severity patient", () => {
  const queue = new PriorityQueue([], {
    agingIntervalMinutes: 60,
    nowProvider: () => new Date("2026-06-22T12:00:00.000Z")
  });

  queue.enqueue(patient("long-waiting-esi-5", 5, "2026-06-22T09:00:00.000Z"));
  queue.enqueue(patient("new-esi-4", 4, "2026-06-22T12:00:00.000Z"));

  const next = queue.dequeue();
  assert.equal(next.id, "long-waiting-esi-5");
  assert.equal(next.priorityDetails.agedPriorityScore, 2);
});

test("clinical safeguard prevents aged ESI 4 and 5 patients from crossing ESI 2", () => {
  const queue = new PriorityQueue([], {
    agingIntervalMinutes: 30,
    nowProvider: () => new Date("2026-06-22T14:00:00.000Z")
  });

  queue.enqueue(patient("very-old-esi-5", 5, "2026-06-22T08:00:00.000Z"));
  queue.enqueue(patient("active-esi-2", 2, "2026-06-22T13:59:00.000Z"));

  assert.equal(queue.dequeue().id, "active-esi-2");
  assert.equal(queue.dequeue().priorityDetails.agedPriorityScore, 2);
});

test("SLA breach scan forces a patient to the highest safe processing score", () => {
  const queue = new PriorityQueue([], {
    agingIntervalMinutes: 120,
    slaBreachMinutes: 120,
    nowProvider: () => new Date("2026-06-22T11:00:00.000Z")
  });

  queue.enqueue(patient("breached-esi-5", 5, "2026-06-22T08:30:00.000Z"));
  queue.enqueue(patient("new-esi-3", 3, "2026-06-22T11:00:00.000Z"));

  const flagged = queue.flagSlaBreaches(new Date("2026-06-22T11:00:00.000Z"));

  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].slaBreached, true);
  assert.equal(queue.dequeue().id, "breached-esi-5");
});
