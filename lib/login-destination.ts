// 로그인 후 이동은 추천·내 계정 화면만 허용합니다. 외부 URL은 허용하지 않습니다.
export function loginDestination(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next) return "/";
  try {
    const url = new URL(next, "https://menuer.local");
    if (url.origin !== "https://menuer.local") return "/";
    if (url.pathname === "/custom-foods/explore") return `${url.pathname}${url.searchParams.get("q") ? `?q=${encodeURIComponent(url.searchParams.get("q")!.slice(0, 60))}` : ""}`;
    if (/^\/custom-foods\/explore\/[0-9a-f-]{36}$/i.test(url.pathname)) return url.pathname;
    if (url.pathname === "/custom-foods" || url.pathname === "/mypage") return url.pathname;
    if (url.pathname === "/custom-foods/new") {
      const edit = url.searchParams.get("edit");
      return `/custom-foods/new${edit && /^[0-9a-f-]{36}$/i.test(edit) ? `?edit=${encodeURIComponent(edit)}` : ""}`;
    }
    if (url.pathname !== "/food-card") return "/";
    const query = new URLSearchParams();
    for (const key of ["date", "meal"]) {
      const value = url.searchParams.get(key);
      if (value) query.set(key, value);
    }
    return `/food-card${query.size ? `?${query}` : ""}`;
  } catch { return "/"; }
}
