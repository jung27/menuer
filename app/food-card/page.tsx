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
import "./gauge.css";
import SensoryObject from "@/components/SensoryObject";
import ShareButton from "@/app/share/ShareButton";

const SHAKE_ACCEL = 10;
const SHAKE_HOLD_MS = 300;
const TICK_MS = 100;

export default function Home() {
  const [index, setIndex] = useState(0);
  const [taste, setTaste] = useState(emptyTaste);
  const [cardDamage, setCardDamage] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [finished, setFinished] = useState(false);
  const [shakeOn, setShakeOn] = useState(false);
  const leaving = useRef(false);
  const shakingUntil = useRef(0);

  const food: Food | undefined = FOODS[index];
  const done = finished || !food;

  const bump = (w: number) => {
    if (!food) return;
    setTaste((t) => applyInteraction(t, food, w));
  };

  // 모바일 흔들기(DeviceMotion) 시 현재 음식 스탯 반영 및 카드 데미지 증가
  useEffect(() => {
    if (!food) return;
    const id = setInterval(() => {
      const now = Date.now();
      const rate = now < shakingUntil.current ? WEIGHTS.shakePerSec : 0;
      if (!rate) return;
      setTaste((t) => applyInteraction(t, food, (rate * TICK_MS) / 1000));
      setCardDamage((prev) => Math.min(100, prev + 4));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [food]);

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
    const DM = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DM.requestPermission && (await DM.requestPermission()) !== "granted")
      return;
    setShakeOn(true);
  }

  // 왼쪽(-1)은 이전 카드, 오른쪽(+1)은 다음 카드로 이동하도록 버그 수정
  function skip(dir: number) {
    if (!food || leaving.current) return;
    if (dir < 0 && index <= 0) return;
    leaving.current = true;
    setPos({ x: dir * 600, y: 0 });
    setTimeout(() => {
      leaving.current = false;
      shakingUntil.current = 0;
      setPos({ x: 0, y: 0 });
      setCardDamage(0);
      setIndex((i) => Math.max(0, i + dir));
    }, 200);
  }

  function restart() {
    setIndex(0);
    setCardDamage(0);
    setTaste(emptyTaste());
    setFinished(false);
  }

  if (done) return <Result taste={taste} onRestart={restart} />;

  const gauge = toGauge(taste);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
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
        카드 {index + 1} / {FOODS.length}
      </p>

      <div className="flex flex-1 items-center justify-center gap-2">
        <SkipButton
          label="이전 카드로 이동"
          disabled={index === 0}
          onClick={() => skip(-1)}
        >
          ‹
        </SkipButton>

        {/* 감각 오브제 자체가 3차원 카드로 동작 (배경 박스 없이 3D 카드 직육면체 렌더링) */}
        <div
          className="relative z-10 flex aspect-[3/4] min-w-0 max-w-xs flex-1 select-none items-center justify-center overflow-visible"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 20}deg)`,
            transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="w-full h-full">
            <SensoryObject
              food={food}
              value={cardDamage}
              onChange={(newVal) => {
                const delta = Math.max(1, newVal - cardDamage);
                setCardDamage(newVal);
                // 카드를 만지거나 당긴 정도에 비례해 해당 음식의 감각 스탯 흡수
                bump(delta >= 10 ? WEIGHTS.tap : WEIGHTS.holdPerSec * 0.2);
              }}
            />
          </div>
        </div>

        <SkipButton label="다음 카드로 이동" onClick={() => skip(1)}>
          ›
        </SkipButton>
      </div>

      <button
        className="rounded-xl bg-orange-500 py-3 font-semibold text-white shadow-md active:scale-[0.99]"
        onClick={() => setFinished(true)}
      >
        추천 받기
      </button>
      {!shakeOn && (
        <button
          className="text-sm text-gray-500 underline"
          onClick={enableShake}
        >
          흔들기 켜기
        </button>
      )}
    </main>
  );
}

function SkipButton(props: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={props.label}
      disabled={props.disabled}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-gray-500 shadow active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

type Ranked = { menuId: string; name: string; score: number; reason: string };
const API_KEYS = {
  매운맛: "spicy",
  단맛: "sweet",
  짠맛: "salty",
  기름짐: "oily",
  국물: "soupy",
  바삭함: "crispy",
} as const;

function Result({ taste, onRestart }: { taste: Taste; onRestart: () => void }) {
  const [ranking, setRanking] = useState<Ranked[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef<string | null>(null);
  const pending = useRef<{
    attempt: number;
    promise: Promise<Ranked[]>;
  } | null>(null);
  const body = JSON.stringify(
    Object.fromEntries(TAGS.map((tag) => [API_KEYS[tag], taste[tag]])),
  );

  useEffect(() => {
    let active = true;
    if (!pending.current || pending.current.attempt !== attempt) {
      requestId.current ??= crypto.randomUUID();
      const promise = fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          tasteScores: JSON.parse(body),
        }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message ?? "추천을 불러오지 못했어요.");
        return data.recommendations as Ranked[];
      });
      pending.current = { attempt, promise };
    }
    pending.current.promise
      .then((recommendations) => {
        if (active) setRanking(recommendations);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "추천을 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, [body, attempt]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-center text-xl font-bold">오늘의 추천 메뉴</h1>
      {error && (
        <>
          <p className="text-center text-red-500">{error}</p>
          <button
            className="rounded-xl bg-orange-100 p-3"
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            다시 요청
          </button>
        </>
      )}
      {!ranking && !error && (
        <p className="text-center text-gray-500">고르는 중...</p>
      )}
      {ranking && ranking.length > 0 && (
        <>
          <div className="rounded-3xl bg-orange-500 p-8 text-center text-white shadow-xl">
            <p className="text-sm">1위</p>
            <p className="text-4xl font-bold">{ranking[0].name}</p>
            <p className="text-sm">
              유사도 점수 {Math.round(ranking[0].score)} / 100
            </p>
            <p className="mt-2 text-sm">기록에 저장했어요.</p>
            <ShareButton
              menu={ranking[0].name}
              className="mt-4 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium"
            />
          </div>
          <ol className="flex flex-col gap-2">
            {ranking.slice(1).map((f, i) => (
              <li
                key={f.menuId}
                className="flex justify-between rounded-xl bg-white p-3 shadow"
              >
                <span>
                  {i + 2}위 {f.name}
                </span>
                <span className="flex items-center gap-3 text-gray-500">
                  {Math.round(f.score)}점
                  <ShareButton
                    menu={f.name}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs"
                  />
                </span>
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
