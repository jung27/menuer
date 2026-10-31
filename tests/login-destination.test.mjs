import test from "node:test";
import assert from "node:assert/strict";
import { loginDestination } from "../lib/login-destination.ts";
const destination = next => loginDestination(`?next=${encodeURIComponent(next)}`);

test("login returns to recommendations with date and meal", () => {
  assert.equal(destination("/food-card?date=2026-10-31&meal=lunch&extra=x"), "/food-card?date=2026-10-31&meal=lunch");
});
test("login returns to the account food list, editor and profile", () => {
  for (const path of ["/custom-foods", "/custom-foods/new", "/mypage"]) assert.equal(destination(path), path);
  const edit = "1567891b-3946-4123-9a97-9c9089d02073";
  assert.equal(destination(`/custom-foods/new?edit=${edit}`), `/custom-foods/new?edit=${edit}`);
  assert.equal(destination("/custom-foods/new?edit=invalid"), "/custom-foods/new");
  assert.equal(destination(`/custom-foods/explore/${edit}`), `/custom-foods/explore/${edit}`);
  assert.equal(destination("/custom-foods/explore?q=돈가스"), `/custom-foods/explore?q=${encodeURIComponent("돈가스")}`);
});
test("unapproved destinations and external redirects fall back to home", () => {
  for (const next of ["https://other.invalid/food-card", "//other.invalid/custom-foods", "/api/auth/logout", "/login", "https://menuer.local.other.invalid/mypage"]) assert.equal(destination(next), "/");
  assert.equal(loginDestination(""), "/");
});
