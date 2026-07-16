const MINUTES_PER_PATIENT_BY_SEVERITY = {
  1: 0,
  2: 8,
  3: 15,
  4: 25,
  5: 35
};

export function estimateWaitMinutes(patient, sortedQueue) {
  const patientIndex = sortedQueue.findIndex((queued) => queued.id === patient.id);
  const patientsAhead = patientIndex <= 0 ? [] : sortedQueue.slice(0, patientIndex);

  return patientsAhead.reduce((total, queued) => {
    return total + (MINUTES_PER_PATIENT_BY_SEVERITY[queued.severityLevel] ?? 20);
  }, 0);
}

export function withEstimatedWaits(sortedQueue) {
  return sortedQueue.map((patient, index) => ({
    ...patient,
    queuePosition: index + 1,
    estimatedWaitMinutes: estimateWaitMinutes(patient, sortedQueue)
  }));
}
