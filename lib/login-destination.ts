// 로그인 후 이동은 추천 화면만 허용합니다. 외부 URL은 허용하지 않습니다.
export function loginDestination(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next) return "/";
  try {
    const url = new URL(next, "https://menuer.local");
    if (url.origin !== "https://menuer.local" || url.pathname !== "/food-card") return "/";
    const query = new URLSearchParams();
    for (const key of ["date", "meal"]) {
      const value = url.searchParams.get(key);
      if (value) query.set(key, value);
    }
    return `/food-card${query.size ? `?${query}` : ""}`;
  } catch { return "/"; }
}
