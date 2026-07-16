import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { api, API_BASE_URL } from "./api.js";

export function useEmergencyQueue() {
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [triageLevels, setTriageLevels] = useState([]);
  const [connectionState, setConnectionState] = useState("offline");

  useEffect(() => {
    api.getQueue().then((data) => setQueue(data.queue)).catch(console.error);
    api.getDoctors().then((data) => setDoctors(data.doctors)).catch(console.error);
    api.getTriageLevels().then((data) => setTriageLevels(data.triageLevels)).catch(console.error);
  }, []);

  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => setConnectionState("online"));
    socket.on("disconnect", () => setConnectionState("offline"));
    socket.on("queue:snapshot", setQueue);
    socket.on("queue:patient-called", () => {
      api.getDoctors().then((data) => setDoctors(data.doctors)).catch(console.error);
    });

    return () => socket.disconnect();
  }, []);

  const actions = useMemo(
    () => ({
      registerPatient: async (payload) => {
        await api.registerPatient(payload);
      },
      reevaluatePatient: async (patientId, payload) => {
        await api.reevaluatePatient(patientId, payload);
      },
      callNextPatient: async (doctorId) => {
        await api.callNextPatient(doctorId);
        const doctorsData = await api.getDoctors();
        setDoctors(doctorsData.doctors);
      }
    }),
    []
  );

  return {
    queue,
    doctors,
    triageLevels,
    connectionState,
    ...actions
  };
}
