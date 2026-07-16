import { AlertTriangle, ArrowUpCircle } from "lucide-react";

const severityClasses = {
  1: "border-red-600 bg-red-50 text-red-950 ring-1 ring-red-100",
  2: "border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-100",
  3: "border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-100",
  4: "border-cyan-500 bg-cyan-50 text-cyan-950 ring-1 ring-cyan-100",
  5: "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100"
};

export function WaitingRoomDashboard({ queue, onReevaluate }) {
  if (queue.length === 0) {
    return (
      <div className="rounded border border-dashed border-clinical-line bg-white/90 p-8 text-center text-clinical-muted">
        No patients are waiting.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((patient) => (
        <article
          key={patient.id}
          className={`rounded border-l-4 p-4 shadow-sm ${severityClasses[patient.severityLevel]}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white/85 px-2 py-1 text-xs font-bold shadow-sm">
                  #{patient.queuePosition}
                </span>
                <span className="rounded bg-white/85 px-2 py-1 text-xs font-bold shadow-sm">
                  ESI {patient.severityLevel}
                </span>
                {patient.severityLevel <= 2 ? (
                  <span className="flex items-center gap-1 rounded bg-white/85 px-2 py-1 text-xs font-bold shadow-sm">
                    <AlertTriangle size={14} />
                    Critical
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{patient.fullName}</h2>
              <p className="mt-1 text-sm opacity-80">{patient.chiefComplaint}</p>
              <p className="mt-2 text-xs opacity-70">
                Arrived {new Date(patient.arrivalTime).toLocaleTimeString()} - Wait{" "}
                {patient.estimatedWaitMinutes} min
              </p>
            </div>

            <button
              className="flex shrink-0 items-center justify-center gap-2 rounded border border-current bg-white/90 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() =>
                onReevaluate(patient.id, {
                  severityLevel: Math.max(1, patient.severityLevel - 1),
                  reason: "Condition worsened from live dashboard"
                })
              }
              disabled={patient.severityLevel === 1}
              title="Escalate severity"
            >
              <ArrowUpCircle size={17} />
              Escalate
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
