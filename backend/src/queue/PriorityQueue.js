const DEFAULT_AGING_INTERVAL_MINUTES = 60;
const DEFAULT_LOW_ACUITY_SAFE_THRESHOLD = 2;
const DEFAULT_SLA_BREACH_MINUTES = 120;

function minutesBetween(start, end) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

/**
 * Array-backed binary min-heap for emergency queueing.
 *
 * Lower score means higher priority. The dynamic score follows:
 *
 *   finalScore = baseSeverity - (waitTimeMinutes / agingIntervalFactor)
 *
 * Clinical safeguard:
 * ESI 4 and ESI 5 patients can age upward, but their effective score is clamped
 * at ESI 2. They can eventually move ahead of ESI 3 patients, but they cannot
 * overtake actively dying or immediately emergent ESI 1/2 patients.
 */
export class PriorityQueue {
  constructor(items = [], options = {}) {
    this.heap = [];
    this.sequence = 0;
    this.agingIntervalMinutes = options.agingIntervalMinutes ?? DEFAULT_AGING_INTERVAL_MINUTES;
    this.lowAcuitySafeThreshold = options.lowAcuitySafeThreshold ?? DEFAULT_LOW_ACUITY_SAFE_THRESHOLD;
    this.slaBreachMinutes = options.slaBreachMinutes ?? DEFAULT_SLA_BREACH_MINUTES;
    this.nowProvider = options.nowProvider ?? (() => new Date());
    items.forEach((item) => this.enqueue(item));
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  enqueue(patient) {
    const node = {
      ...patient,
      sequenceNumber: patient.sequenceNumber ?? this.sequence++,
      slaBreached: patient.slaBreached ?? false
    };
    this.heap.push(node);
    this.rebuild();
    return this.#decorate(node);
  }

  peek() {
    this.rebuild();
    return this.heap[0] ? this.#decorate(this.heap[0]) : null;
  }

  dequeue() {
    this.rebuild();
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.#decorate(this.heap.pop());

    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.#sinkDown(0);
    return this.#decorate(root);
  }

  removeById(patientId) {
    const index = this.heap.findIndex((patient) => patient.id === patientId);
    if (index === -1) return null;

    const removed = this.heap[index];
    const last = this.heap.pop();
    if (index < this.heap.length) {
      this.heap[index] = last;
      this.#bubbleUp(index);
      this.#sinkDown(index);
    }
    return this.#decorate(removed);
  }

  update(patientId, patch) {
    const existing = this.removeById(patientId);
    if (!existing) return null;

    return this.enqueue({
      ...existing,
      ...patch,
      sequenceNumber: existing.sequenceNumber
    });
  }

  flagSlaBreaches(referenceTime = this.nowProvider()) {
    const flagged = [];

    this.heap = this.heap.map((patient) => {
      const waitTimeMinutes = minutesBetween(patient.arrivalTime, referenceTime);
      if (waitTimeMinutes < this.slaBreachMinutes || patient.slaBreached) {
        return patient;
      }

      const updated = {
        ...patient,
        slaBreached: true,
        slaBreachedAt: new Date(referenceTime).toISOString()
      };
      flagged.push(this.#decorate(updated, referenceTime));
      return updated;
    });

    if (flagged.length > 0) {
      this.rebuild(referenceTime);
    }

    return flagged;
  }

  toSortedArray(referenceTime = this.nowProvider()) {
    this.rebuild(referenceTime);
    const clone = new PriorityQueue([], {
      agingIntervalMinutes: this.agingIntervalMinutes,
      lowAcuitySafeThreshold: this.lowAcuitySafeThreshold,
      slaBreachMinutes: this.slaBreachMinutes,
      nowProvider: () => new Date(referenceTime)
    });
    clone.sequence = this.sequence;
    clone.heap = this.heap.map((item) => ({ ...item }));

    const sorted = [];
    while (!clone.isEmpty()) {
      sorted.push(clone.dequeue());
    }
    return sorted;
  }

  rebuild(referenceTime = this.nowProvider()) {
    for (let index = Math.floor(this.heap.length / 2) - 1; index >= 0; index -= 1) {
      this.#sinkDown(index, referenceTime);
    }
  }

  getPriorityDetails(patient, referenceTime = this.nowProvider()) {
    const waitTimeMinutes = minutesBetween(patient.arrivalTime, referenceTime);
    const agingCredit = waitTimeMinutes / this.agingIntervalMinutes;
    const rawAgedScore = patient.severityLevel - agingCredit;
    const minimumSafeScore =
      patient.severityLevel >= 4 ? this.lowAcuitySafeThreshold : patient.severityLevel;
    const agedPriorityScore = patient.slaBreached
      ? minimumSafeScore
      : Math.max(minimumSafeScore, rawAgedScore);

    return {
      baseSeverity: patient.severityLevel,
      waitTimeMinutes: Math.floor(waitTimeMinutes),
      agingIntervalMinutes: this.agingIntervalMinutes,
      agingCredit,
      rawAgedScore,
      agedPriorityScore,
      clinicalMinimumScore: minimumSafeScore,
      slaBreached: patient.slaBreached ?? false
    };
  }

  compare(a, b, referenceTime = this.nowProvider()) {
    const scoreA = this.getPriorityDetails(a, referenceTime).agedPriorityScore;
    const scoreB = this.getPriorityDetails(b, referenceTime).agedPriorityScore;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    const aIsProtectedEmergency = a.severityLevel <= this.lowAcuitySafeThreshold;
    const bIsProtectedEmergency = b.severityLevel <= this.lowAcuitySafeThreshold;
    if (aIsProtectedEmergency !== bIsProtectedEmergency) {
      return aIsProtectedEmergency ? -1 : 1;
    }

    if ((a.slaBreached ?? false) !== (b.slaBreached ?? false)) {
      return a.slaBreached ? -1 : 1;
    }

    const arrivalDelta = new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
    if (arrivalDelta !== 0) return arrivalDelta;

    return a.sequenceNumber - b.sequenceNumber;
  }

  #decorate(patient, referenceTime = this.nowProvider()) {
    return {
      ...patient,
      priorityDetails: this.getPriorityDetails(patient, referenceTime)
    };
  }

  #bubbleUp(index, referenceTime = this.nowProvider()) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.compare(this.heap[currentIndex], this.heap[parentIndex], referenceTime) >= 0) break;

      this.#swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  #sinkDown(index, referenceTime = this.nowProvider()) {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let bestIndex = currentIndex;

      if (
        leftIndex < this.heap.length &&
        this.compare(this.heap[leftIndex], this.heap[bestIndex], referenceTime) < 0
      ) {
        bestIndex = leftIndex;
      }

      if (
        rightIndex < this.heap.length &&
        this.compare(this.heap[rightIndex], this.heap[bestIndex], referenceTime) < 0
      ) {
        bestIndex = rightIndex;
      }

      if (bestIndex === currentIndex) break;
      this.#swap(currentIndex, bestIndex);
      currentIndex = bestIndex;
    }
  }

  #swap(a, b) {
    [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]];
  }
}
