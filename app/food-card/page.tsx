"use client";

import { useEffect, useRef, useState } from "react";
import { FOODS } from "./foods";
import {
  TAGS,
  WEIGHTS,
  applyInteraction,
  emptyTaste,
  toGauge,
  type Food,
  type Taste,
} from "./taste";

const SWIPE_PX = 100; // 이 거리 넘게 던지면 스와이프
const TAP_PX = 10; // 이보다 덜 움직이고 빨리 떼면 누르기
const TAP_MS = 300;
const SHAKE_ACCEL = 15; // m/s², 흔들기 감도
const SHAKE_COOLDOWN_MS = 800;
const WIGGLE_PX = 30; // 마우스로 흔들 때 한 번 왕복에 필요한 최소 거리
const WIGGLE_MS = 600; // 이 시간 안에
const WIGGLE_FLIPS = 3; // 방향을 이만큼 바꾸면 흔들기로 침

export default function Home() {
  const [index, setIndex] = useState(0);
  const [taste, setTaste] = useState(emptyTaste);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [finished, setFinished] = useState(false);
  const [shakeOn, setShakeOn] = useState(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const leaving = useRef(false);
  const touched = useRef(false); // 지금 카드에 상호작용을 했는지
  const wiggle = useRef({
    x: { last: 0, from: 0, dir: 0 },
    y: { last: 0, from: 0, dir: 0 },
    flips: [] as number[],
    lastShake: 0,
  });

  const food: Food | undefined = FOODS[index];
  const done = finished || !food;
  const bump = (w: number) => {
    if (!food) return;
    if (w > 0) touched.current = true;
    setTaste((t) => applyInteraction(t, food, w));
  };

  useEffect(() => {
    if (!shakeOn || !food) return;
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a) return;
      const now = Date.now();
      if (Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) > SHAKE_ACCEL && now - last > SHAKE_COOLDOWN_MS) {
        last = now;
        touched.current = true;
        setTaste((t) => applyInteraction(t, food, WEIGHTS.shake));
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [shakeOn, food]);

  async function enableShake() {
    if (typeof DeviceMotionEvent === "undefined") return;
    // 아이폰은 버튼 클릭 안에서 권한을 요청해야 함
    const DM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DM.requestPermission && (await DM.requestPermission()) !== "granted") return;
    setShakeOn(true);
  }

  function swipe(dir: number) {
    if (!food || leaving.current) return;
    leaving.current = true;
    // 상호작용한 카드는 넘겨도 안 깎음. 바로 넘긴 카드만 감점.
    if (!touched.current) bump(WEIGHTS.swipe);
    setPos({ x: dir * 600, y: 0 });
    setTimeout(() => {
      leaving.current = false;
      touched.current = false;
      setPos({ x: 0, y: 0 });
      setIndex((i) => i + 1);
    }, 200);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (leaving.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    const w = wiggle.current;
    w.x = { last: e.clientX, from: e.clientX, dir: 0 };
    w.y = { last: e.clientY, from: e.clientY, dir: 0 };
    w.flips = [];
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    setPos({ x: e.clientX - s.x, y: e.clientY - s.y });

    // 잡은 채로 빠르게 왔다 갔다 하면 흔들기 (마우스/손가락용)
    const w = wiggle.current;
    const now = Date.now();
    for (const [axis, v] of [["x", e.clientX], ["y", e.clientY]] as const) {
      const a = w[axis];
      const d = Math.sign(v - a.last);
      if (d && d !== a.dir) {
        if (Math.abs(a.last - a.from) > WIGGLE_PX) w.flips.push(now);
        a.dir = d;
        a.from = a.last;
      }
      a.last = v;
    }
    w.flips = w.flips.filter((t) => now - t < WIGGLE_MS);
    if (w.flips.length >= WIGGLE_FLIPS && now - w.lastShake > SHAKE_COOLDOWN_MS) {
      w.lastShake = now;
      w.flips = [];
      bump(WEIGHTS.shake);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    start.current = null;
    setDragging(false);
    const moved = e.clientX - s.x;
    const dist = Math.hypot(moved, e.clientY - s.y);
    const held = Date.now() - s.t;
    // 옆으로 멀리 던지면 넘기기, 아니면 제자리로
    if (Math.abs(moved) > SWIPE_PX) return swipe(Math.sign(moved));
    setPos({ x: 0, y: 0 });
    if (dist < TAP_PX && held < TAP_MS) bump(WEIGHTS.tap);
    else bump(WEIGHTS.dragPerSec * Math.min(held / 1000, 3));
  }

  function restart() {
    touched.current = false;
    setIndex(0);
    setTaste(emptyTaste());
    setFinished(false);
  }

  if (done) return <Result taste={taste} onRestart={restart} />;

  const gauge = toGauge(taste);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {TAGS.map((t) => (
          <li key={t}>
            <div className="flex justify-between">
              <span>{t}</span>
              <span>{gauge[t]}%</span>
            </div>
            <div className="h-1.5 rounded bg-gray-200">
              <div
                className="h-full rounded bg-orange-500 transition-all"
                style={{ width: `${gauge[t]}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-center text-sm text-gray-500">
        넘긴 카드 {index} / {FOODS.length}
      </p>

      <div className="relative flex flex-1 items-center justify-center">
        <div
          className="flex aspect-[3/4] w-full max-w-xs cursor-grab touch-none select-none flex-col items-center justify-center gap-6 rounded-3xl bg-white p-6 shadow-xl"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 20}deg)`,
            // 놓으면 살짝 튕기면서 제자리로
            transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setPos({ x: 0, y: 0 });
          }}
        >
          <p className="text-4xl font-bold">{food.name}</p>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600">
            {TAGS.map((t) => (
              <li key={t}>
                <div className="flex justify-between">
                  <span>{t}</span>
                  <span>{Math.round(food.tags[t] * 100)}</span>
                </div>
                <div className="h-1 rounded bg-gray-100">
                  <div
                    className="h-full rounded bg-gray-400"
                    style={{ width: `${food.tags[t] * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 rounded-xl bg-gray-200 py-3" onClick={() => swipe(1)}>
          넘기기
        </button>
        <button
          className="flex-1 rounded-xl bg-orange-500 py-3 text-white"
          onClick={() => setFinished(true)}
        >
          추천 받기
        </button>
      </div>
      {!shakeOn && (
        <button className="text-sm text-gray-500 underline" onClick={enableShake}>
          흔들기 켜기
        </button>
      )}
    </main>
  );
}

type Ranked = { menuId: string; name: string; score: number; reason: string };
const API_KEYS = { 매운맛: "spicy", 단맛: "sweet", 짠맛: "salty", 기름짐: "oily", 국물: "soupy", 바삭함: "crispy" } as const;

function Result({ taste, onRestart }: { taste: Taste; onRestart: () => void }) {
  const [ranking, setRanking] = useState<Ranked[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef<string | null>(null);
  const pending = useRef<{ attempt: number; promise: Promise<Ranked[]> } | null>(null);
  const body = JSON.stringify(Object.fromEntries(TAGS.map((tag) => [API_KEYS[tag], taste[tag]])));

  useEffect(() => {
    let active = true;
    // Strict Mode의 effect 재실행도 같은 요청을 공유해 최초 쿠키 생성 경합을 피합니다.
    if (!pending.current || pending.current.attempt !== attempt) {
      requestId.current ??= crypto.randomUUID();
      const promise = fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, tasteScores: JSON.parse(body) }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "추천을 불러오지 못했어요.");
        return data.recommendations as Ranked[];
      });
      pending.current = { attempt, promise };
    }
    pending.current.promise.then((recommendations) => {
      if (active) setRanking(recommendations);
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "추천을 불러오지 못했어요.");
    });
    return () => { active = false; };
  }, [body, attempt]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-center text-xl font-bold">오늘의 추천 메뉴</h1>
      {error && <>
        <p className="text-center text-red-500">{error}</p>
        <button className="rounded-xl bg-orange-100 p-3" onClick={() => { setError(null); setAttempt((value) => value + 1); }}>다시 요청</button>
      </>}
      {!ranking && !error && <p className="text-center text-gray-500">고르는 중...</p>}
      {ranking && ranking.length > 0 && (
        <>
          <div className="rounded-3xl bg-orange-500 p-8 text-center text-white shadow-xl">
            <p className="text-sm">1위</p>
            <p className="text-4xl font-bold">{ranking[0].name}</p>
            <p className="text-sm">유사도 점수 {Math.round(ranking[0].score)} / 100</p>
            <p className="mt-2 text-sm">기록에 저장했어요.</p>
          </div>
          <ol className="flex flex-col gap-2">
            {ranking.slice(1).map((f, i) => (
              <li key={f.menuId} className="flex justify-between rounded-xl bg-white p-3 shadow">
                <span>
                  {i + 2}위 {f.name}
                </span>
                <span className="text-gray-500">{Math.round(f.score)}점</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <button className="rounded-xl bg-gray-200 py-3" onClick={onRestart}>
        다시 하기
      </button>
    </main>
  );
}
