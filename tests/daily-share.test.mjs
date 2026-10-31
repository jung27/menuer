import assert from "node:assert/strict";
import { buildDailyShare } from "../lib/daily-share.ts";

const empty = { breakfast: null, lunch: null, dinner: null };
const blank = buildDailyShare("2026-11-01", empty);
assert.equal(blank.canShare, false);
assert.equal(blank.sharePath, null);
assert.equal(blank.shareText, null);
const shared = buildDailyShare("2026-11-01", {
  breakfast: { name: "김밥", userId: "private", recordId: "secret", selectedAt: "private" },
  lunch: null,
  dinner: { name: "밥 & 면 + 국물/#?" },
});
assert.equal(shared.selectedCount, 2);
assert.equal(shared.meals.lunch, null);
const url = new URL(shared.sharePath, "https://example.com");
assert.equal(url.searchParams.get("breakfast"), "김밥");
assert.equal(url.searchParams.get("dinner"), "밥 & 면 + 국물/#?");
assert.equal(url.searchParams.has("lunch"), false);
assert.equal(url.searchParams.get("date"), "2026-11-01");
assert.ok(!JSON.stringify(shared).includes("private"));
assert.ok(!JSON.stringify(shared).includes("secret"));
assert.match(shared.shareText, /아침: 김밥/);
assert.equal(buildDailyShare("2026-11-01", { ...empty, breakfast: { name: "우동" } }).meals.breakfast.name, "우동");
assert.equal(buildDailyShare("2026-11-01", { breakfast: {name:"김밥"}, lunch:{name:"우동"}, dinner:{name:"치킨"} }).selectedCount, 3);
console.log("PASS: empty/partial/full day, URL encoding, private field exclusion, latest selection");
