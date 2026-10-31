// 인증 API 호출. 성공하면 null, 실패하면 화면에 보여줄 오류 메시지를 돌려줌.
export async function postAuth(url: string, body: object): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error?.message ?? "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
  } catch {
    return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  }
}

export const inputClass =
  "rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-900";
export const buttonClass =
  "rounded-xl bg-neutral-900 py-3 font-medium text-white disabled:opacity-50";
