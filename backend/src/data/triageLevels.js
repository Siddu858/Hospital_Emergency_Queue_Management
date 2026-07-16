export const triageLevels = [
  {
    level: 1,
    code: "ESI-1",
    label: "Immediate",
    color: "red",
    targetResponseMinutes: 0,
    description: "Life-saving intervention required immediately."
  },
  {
    level: 2,
    code: "ESI-2",
    label: "Emergent",
    color: "orange",
    targetResponseMinutes: 10,
    description: "High-risk situation, confused/lethargic/disoriented, or severe pain/distress."
  },
  {
    level: 3,
    code: "ESI-3",
    label: "Urgent",
    color: "yellow",
    targetResponseMinutes: 30,
    description: "Stable but expected to need multiple resources."
  },
  {
    level: 4,
    code: "ESI-4",
    label: "Less Urgent",
    color: "blue",
    targetResponseMinutes: 60,
    description: "Stable and expected to need one resource."
  },
  {
    level: 5,
    code: "ESI-5",
    label: "Non-Urgent",
    color: "green",
    targetResponseMinutes: 120,
    description: "Stable and expected to need no resources."
  }
];

export function getTriageLevel(level) {
  return triageLevels.find((item) => item.level === Number(level));
}
