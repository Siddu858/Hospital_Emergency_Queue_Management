import { UserCheck } from "lucide-react";

export function DoctorView({ doctors, queue, onCallNext }) {
  return (
    <div className="space-y-3">
      {doctors.map((doctor) => (
        <article key={doctor.id} className="rounded border border-sky-200 bg-clinical-skyPanel p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{doctor.fullName}</h2>
              <p className="text-sm text-clinical-muted">{doctor.department}</p>
              <span className="mt-2 inline-block rounded border border-sky-200 bg-clinical-aqua px-2 py-1 text-xs font-semibold capitalize text-sky-900">
                {doctor.status}
              </span>
            </div>
            <button
              className="flex items-center justify-center gap-2 rounded bg-sky-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={queue.length === 0}
              onClick={() => onCallNext(doctor.id)}
              title="Call next patient"
            >
              <UserCheck size={18} />
              Call Next
            </button>
          </div>
        </article>
      ))}

      <div className="rounded border border-sky-200 bg-clinical-skyPanel p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase text-sky-900">Next patient</h3>
        {queue[0] ? (
          <div className="mt-3">
            <p className="font-semibold">{queue[0].fullName}</p>
            <p className="text-sm text-clinical-muted">
              ESI {queue[0].severityLevel} - {queue[0].chiefComplaint}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-clinical-muted">Queue is clear.</p>
        )}
      </div>
    </div>
  );
}
