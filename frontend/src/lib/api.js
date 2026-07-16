export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Request failed");
  }
  return data;
}

export const api = {
  getQueue: () => request("/api/patients/queue"),
  getDoctors: () => request("/api/doctors"),
  getTriageLevels: () => request("/api/triage-levels"),
  registerPatient: (payload) =>
    request("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reevaluatePatient: (patientId, payload) =>
    request(`/api/patients/${patientId}/reevaluate`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  callNextPatient: (doctorId) =>
    request(`/api/doctors/${doctorId}/call-next`, {
      method: "POST"
    })
};
