import test from "node:test";
import assert from "node:assert/strict";
import { authPageHref, loginDestination } from "../lib/login-destination.ts";
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

test("signup and login preserve the destination across repeated round trips", () => {
  for (const target of ["/mypage", "/food-card?date=2026-11-01&meal=breakfast", "/custom-foods/explore?q=김치 볶음밥"]) {
    const search = `?next=${encodeURIComponent(target)}`;
    const signup = new URL(authPageHref("/login/signup", search), "https://menuer.local");
    const login = new URL(authPageHref("/login", signup.search), "https://menuer.local");
    assert.equal(signup.pathname, "/login/signup");
    assert.equal(login.pathname, "/login");
    assert.equal(loginDestination(login.search), loginDestination(search));
    assert.equal(authPageHref("/login/signup", login.search), signup.pathname + signup.search);
  }
});

test("auth links discard unsafe destinations and unrelated query parameters", () => {
  for (const page of ["/login", "/login/signup"]) {
    for (const target of ["https://other.invalid/mypage", "//other.invalid/mypage", "/api/auth/logout", "/login/signup"]) {
      assert.equal(authPageHref(page, `?next=${encodeURIComponent(target)}&password=discard`), page);
    }
    assert.equal(authPageHref(page, ""), page);
  }
});
