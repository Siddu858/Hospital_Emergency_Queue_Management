import React from "react";
import { createRoot } from "react-dom/client";
import { Activity, BellRing, ClipboardPlus, Stethoscope } from "lucide-react";
import { NurseTriageForm } from "./components/NurseTriageForm.jsx";
import { WaitingRoomDashboard } from "./components/WaitingRoomDashboard.jsx";
import { DoctorView } from "./components/DoctorView.jsx";
import { useEmergencyQueue } from "./lib/useEmergencyQueue.js";
import "./styles.css";

function App() {
  const {
    queue,
    doctors,
    triageLevels,
    connectionState,
    registerPatient,
    reevaluatePatient,
    callNextPatient
  } = useEmergencyQueue();

  const criticalCount = queue.filter((patient) => patient.severityLevel <= 2).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#87ceeb_0%,#dff6ff_38%,#f2fbff_100%)] text-clinical-ink">
      <header className="border-b border-sky-200 bg-[linear-gradient(90deg,#0b4f71_0%,#0284c7_58%,#38bdf8_100%)] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Hospital Emergency Queue</h1>
            <p className="text-sm text-sky-50">Priority Queue triage using ESI severity and arrival time</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric icon={<Activity size={18} />} label="Waiting" value={queue.length} />
            <Metric icon={<BellRing size={18} />} label="Critical" value={criticalCount} />
            <Metric icon={<Stethoscope size={18} />} label="Socket" value={connectionState} />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <PanelTitle icon={<ClipboardPlus size={18} />} title="Nurse Triage" />
          <NurseTriageForm triageLevels={triageLevels} onSubmit={registerPatient} />
        </section>

        <section className="space-y-4">
          <PanelTitle icon={<Activity size={18} />} title="Live Waiting Room" />
          <WaitingRoomDashboard queue={queue} triageLevels={triageLevels} onReevaluate={reevaluatePatient} />
        </section>

        <section className="space-y-4">
          <PanelTitle icon={<Stethoscope size={18} />} title="Doctor View" />
          <DoctorView doctors={doctors} queue={queue} onCallNext={callNextPatient} />
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="flex min-w-24 items-center gap-2 rounded border border-white/30 bg-white/15 px-3 py-2 shadow-sm">
      <span className="text-sky-50">{icon}</span>
      <span>
        <span className="block text-xs uppercase text-sky-50">{label}</span>
        <span className="font-semibold">{value}</span>
      </span>
    </div>
  );
}

function PanelTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-sky-900">
      {icon}
      <span>{title}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
