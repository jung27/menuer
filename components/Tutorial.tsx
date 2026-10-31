"use client";

import { useEffect, useState } from "react";

// 처음 로그인한 사람에게 한 번만 보여 주는 튜토리얼.
// 화면을 어둡게 하고 data-tutorial="단계"가 붙은 요소만 밝게 띄움.
// ponytail: 진행 상태를 브라우저(localStorage)에 저장 → 다른 기기에서는 다시 나옴. 계정별로 하려면 서버에 저장.
const KEY = "menuer_tutorial";
const ORDER = ["home", "card", "result", "done"] as const;
type Step = Exclude<(typeof ORDER)[number], "done">;

function readStep() {
  try {
    return localStorage.getItem(KEY) ?? "home";
  } catch {
    return "done"; // 저장소를 못 쓰면 튜토리얼 생략
  }
}
function saveStep(step: string) {
  try {
    localStorage.setItem(KEY, step);
  } catch {}
}

export default function Tutorial({
  step,
  text,
  finishOnClick = false, // 밝게 띄운 버튼을 누르면 튜토리얼 끝
}: {
  step: Step;
  text: string;
  finishOnClick?: boolean;
}) {
  const [active, setActive] = useState(false);

  // 아직 이 단계를 안 지났고 로그인한 상태일 때만 시작
  useEffect(() => {
    if (ORDER.indexOf(readStep() as Step) > ORDER.indexOf(step)) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok || cancelled) return;
        saveStep(step);
        setActive(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step]);

  // 대상 요소를 어두운 막 위로 올림. 결과 버튼처럼 늦게 나타나는 요소도 있어서 주기적으로 다시 찾음.
  useEffect(() => {
    if (!active) return;
    const raised = new Map<HTMLElement, [string, string]>();
    const raise = () => {
      document.querySelectorAll<HTMLElement>(`[data-tutorial~="${step}"]`).forEach((el) => {
        if (raised.has(el)) return;
        raised.set(el, [el.style.position, el.style.zIndex]);
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        el.style.zIndex = "61";
      });
    };
    raise();
    const id = setInterval(raise, 300);

    const onClick = (e: MouseEvent) => {
      if (finishOnClick && (e.target as Element).closest?.(`[data-tutorial~="${step}"]`)) finish();
    };
    document.addEventListener("click", onClick, true);

    return () => {
      clearInterval(id);
      document.removeEventListener("click", onClick, true);
      raised.forEach(([position, zIndex], el) => {
        el.style.position = position;
        el.style.zIndex = zIndex;
      });
    };
  }, [active, step, finishOnClick]);

  function finish() {
    saveStep("done");
    setActive(false);
  }

  if (!active) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/65" aria-hidden />
      <div
        role="dialog"
        aria-live="polite"
        className="fixed inset-x-4 top-4 z-[62] mx-auto max-w-md rounded-2xl bg-white p-4 text-center shadow-xl"
      >
        <p className="whitespace-pre-line font-medium text-neutral-900">{text}</p>
        <button onClick={finish} className="mt-2 text-sm text-neutral-500 underline">
          건너뛰기
        </button>
      </div>
    </>
  );
}
