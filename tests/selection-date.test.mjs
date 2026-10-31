import assert from "node:assert/strict";
import { selectionDay } from "../lib/selection-date.ts";
assert.deepEqual(selectionDay(new Date("2026-10-31T14:59:59.999Z")), {
  today: "2026-10-31", yesterday: "2026-10-30", closesAt: "2026-10-31T15:00:00.000Z",
});
assert.deepEqual(selectionDay(new Date("2026-10-31T15:00:00.000Z")), {
  today: "2026-11-01", yesterday: "2026-10-31", closesAt: "2026-11-01T15:00:00.000Z",
});
assert.equal(selectionDay(new Date("2027-01-01T00:00:00+09:00")).yesterday, "2026-12-31");
assert.equal(selectionDay(new Date("2028-03-01T00:00:00+09:00")).yesterday, "2028-02-29");
console.log("PASS: Korean midnight, month/year rollover, leap day");
