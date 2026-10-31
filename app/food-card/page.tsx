"use client";

import { useEffect, useRef, useState } from "react";
import { FOODS } from "./foods";
import {
  TAGS,
  WEIGHTS,
  applyInteraction,
  emptyTaste,
  toGauge,
  toPercent,
  type Food,
  type Taste,
} from "./taste";
import "./gauge.css";

const SWIPE_PX = 100; // 이 거리 넘게 던지면 스와이프
const TAP_PX = 10; // 이보다 덜 움직이고 빨리 떼면 누르기
const TAP_MS = 300;
const SHAKE_ACCEL = 15; // m/s², 흔들기 감도
const SHAKE_HOLD_MS = 500; // 흔들기가 멈춘 뒤에도 이 시간 동안은 흔드는 중으로 봄
const HOLD_DELAY_MS = 400; // 이 시간 넘게 잡고 있어야 '잡고 있기'로 침 (던지기와 구분)
const TICK_MS = 100; // 잡기·흔들기 점수를 반영하는 간격
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
  });
  const shakingUntil = useRef(0);

  const food: Food | undefined = FOODS[index];
  const done = finished || !food;
  const bump = (w: number) => {
    if (!food) return;
    if (w > 0) touched.current = true;
    setTaste((t) => applyInteraction(t, food, w));
  };

  // 잡고 있거나 흔드는 동안 계속 조금씩 음식 점수 쪽으로 다가감
  useEffect(() => {
    if (!food) return;
    const id = setInterval(() => {
      const now = Date.now();
      const s = start.current;
      const holding =
        s && now - s.t > HOLD_DELAY_MS && Math.abs(wiggle.current.x.last - s.x) < SWIPE_PX;
      const rate =
        now < shakingUntil.current ? WEIGHTS.shakePerSec : holding ? WEIGHTS.holdPerSec : 0;
      if (!rate) return;
      touched.current = true;
      setTaste((t) => applyInteraction(t, food, (rate * TICK_MS) / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [food]);

  // 폰 흔들기
  useEffect(() => {
    if (!shakeOn) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (a && Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) > SHAKE_ACCEL) {
        shakingUntil.current = Date.now() + SHAKE_HOLD_MS;
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [shakeOn]);

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
      shakingUntil.current = 0; // 다음 카드로 흔들기가 넘어가지 않게
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
    if (w.flips.length >= WIGGLE_FLIPS) shakingUntil.current = now + SHAKE_HOLD_MS;
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
          <li
            key={t}
            className="gauge"
            style={{ "--gauge": gauge[t] } as React.CSSProperties}
            aria-label={`${t} ${gauge[t]}%`}
          >
            <div className="flex justify-between">
              <span>{t}</span>
              <span className="gauge-num tabular-nums" />
            </div>
            <div className="h-1.5 rounded bg-gray-200">
              <div className="gauge-bar h-full rounded bg-orange-500" />
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

type Ranked = Food & { score: number };

function Result({ taste, onRestart }: { taste: Taste; onRestart: () => void }) {
  const [ranking, setRanking] = useState<Ranked[] | null>(null);
  const [error, setError] = useState(false);
  const body = JSON.stringify(toPercent(taste));

  useEffect(() => {
    fetch("/food-card/api/recommend", { method: "POST", body })
      .then((r) => r.json())
      .then((d) => setRanking(d.ranking))
      .catch(() => setError(true));
  }, [body]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-center text-xl font-bold">오늘의 추천 메뉴</h1>
      {error && <p className="text-center text-red-500">추천을 불러오지 못했어요.</p>}
      {!ranking && !error && <p className="text-center text-gray-500">고르는 중...</p>}
      {ranking && (
        <>
          <div className="rounded-3xl bg-orange-500 p-8 text-center text-white shadow-xl">
            <p className="text-sm">1위</p>
            <p className="text-4xl font-bold">{ranking[0].name}</p>
            <p className="text-sm">일치도 {Math.round(ranking[0].score * 100)}%</p>
          </div>
          <ol className="flex flex-col gap-2">
            {ranking.slice(1).map((f, i) => (
              <li key={f.id} className="flex justify-between rounded-xl bg-white p-3 shadow">
                <span>
                  {i + 2}위 {f.name}
                </span>
                <span className="text-gray-500">{Math.round(f.score * 100)}%</span>
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
