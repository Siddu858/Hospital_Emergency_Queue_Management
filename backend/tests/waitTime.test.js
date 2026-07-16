import test from "node:test";
import assert from "node:assert/strict";
import { withEstimatedWaits } from "../src/services/waitTime.js";

test("estimated wait time only counts patients ahead in the sorted queue", () => {
  const queue = withEstimatedWaits([
    { id: "critical", severityLevel: 1 },
    { id: "emergent", severityLevel: 2 },
    { id: "urgent", severityLevel: 3 },
    { id: "minor", severityLevel: 5 }
  ]);

  assert.equal(queue[0].estimatedWaitMinutes, 0);
  assert.equal(queue[1].estimatedWaitMinutes, 0);
  assert.equal(queue[2].estimatedWaitMinutes, 8);
  assert.equal(queue[3].estimatedWaitMinutes, 23);
});
