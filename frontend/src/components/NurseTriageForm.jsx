import { useState } from "react";
import { Plus } from "lucide-react";

const initialState = {
  fullName: "",
  age: "",
  phone: "",
  chiefComplaint: "",
  severityLevel: 3
};

export function NurseTriageForm({ triageLevels, onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit({
        ...form,
        age: Number(form.age),
        severityLevel: Number(form.severityLevel)
      });
      setForm(initialState);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="rounded border border-sky-200 bg-clinical-skyPanel p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <Field label="Patient name">
          <input
            className="input"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input
              className="input"
              type="number"
              min="0"
              value={form.age}
              onChange={(event) => updateField("age", event.target.value)}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+15551234567"
            />
          </Field>
        </div>

        <Field label="Chief complaint">
          <textarea
            className="input min-h-24 resize-none"
            value={form.chiefComplaint}
            onChange={(event) => updateField("chiefComplaint", event.target.value)}
            required
          />
        </Field>

        <Field label="ESI severity">
          <select
            className="input"
            value={form.severityLevel}
            onChange={(event) => updateField("severityLevel", event.target.value)}
          >
            {triageLevels.map((level) => (
              <option key={level.level} value={level.level}>
                ESI {level.level} - {level.label}
              </option>
            ))}
          </select>
        </Field>

        {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button className="flex w-full items-center justify-center gap-2 rounded bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">
          <Plus size={18} />
          Register Patient
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-sky-950">{label}</span>
      {children}
    </label>
  );
}
