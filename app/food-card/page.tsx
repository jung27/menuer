"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import SensoryObject, {
  VISIBLE_SENSORY_TAGS,
} from "@/components/SensoryObject";

export default function Home() {
  const [index, setIndex] = useState(0);
  const [taste, setTaste] = useState(emptyTaste);
  const [cardDamage, setCardDamage] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [finished, setFinished] = useState(false);
  const leaving = useRef(false);

  const food: Food | undefined = FOODS[index];
  const done = finished || !food;

  const bump = (w: number) => {
    if (!food) return;
    setTaste((t) => applyInteraction(t, food, w));
  };

  // 왼쪽(-1)은 이전 카드, 오른쪽(+1)은 다음 카드로 이동
  function skip(dir: number) {
    if (!food || leaving.current) return;
    if (dir < 0 && index <= 0) return;
    leaving.current = true;
    setPos({ x: dir * 600, y: 0 });
    setTimeout(() => {
      leaving.current = false;
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
      {/* 외부로 드러나는 4대 물리 감각 특성(매운맛·바삭함·국물·기름짐)만 표시 */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {VISIBLE_SENSORY_TAGS.map((t) => (
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

      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          카드 {index + 1} / {FOODS.length}
        </p>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm active:scale-95"
          onClick={() => setShowInfo((prev) => !prev)}
        >
          {showInfo ? "음식 정보 끄기" : "음식 정보 켜기"}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        <SkipButton
          label="이전 카드로 이동"
          disabled={index === 0}
          onClick={() => skip(-1)}
        >
          ‹
        </SkipButton>

        {/* 감각 오브제 자체가 3차원 카드로 동작 */}
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
              showInfo={showInfo}
              value={cardDamage}
              onChange={(newVal) => {
                const delta = Math.max(1, newVal - cardDamage);
                setCardDamage(newVal);
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
  const router = useRouter();
  const [selectionContext, setSelectionContext] = useState<{
    recordId: string;
    date: string;
    meal: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [ranking, setRanking] = useState<Ranked[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef<string | null>(null);
  const pending = useRef<{
    attempt: number;
    promise: Promise<{
      recommendations: Ranked[];
      recordId: string;
      date: string;
      meal: string;
    }>;
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
        const todayResponse = await fetch("/api/selections/today", {
          cache: "no-store",
        });
        const today = await todayResponse.json();
        if (!todayResponse.ok)
          throw new Error(
            today.error?.message ?? "오늘 날짜를 불러오지 못했어요.",
          );
        const params = new URLSearchParams(window.location.search);
        const meal = params.get("meal") ?? "lunch";
        return {
          recommendations: data.recommendations as Ranked[],
          recordId: data.recordId as string,
          date: params.get("date") ?? (today.date as string),
          meal: ["breakfast", "lunch", "dinner"].includes(meal)
            ? meal
            : "lunch",
        };
      });
      pending.current = { attempt, promise };
    }
    pending.current.promise
      .then((result) => {
        if (active) {
          setRanking(result.recommendations);
          setSelectionContext({
            recordId: result.recordId,
            date: result.date,
            meal: result.meal,
          });
        }
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

  async function selectMenu(menuId: string) {
    if (!selectionContext || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/selections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectionContext, menuId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "선정 메뉴를 저장하지 못했어요.",
        );
      router.push("/");
      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "저장에 실패했어요.",
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-center text-xl font-bold">오늘의 추천 메뉴</h1>
      {selectionContext && (
        <label className="flex items-center justify-center gap-3 text-sm">
          {selectionContext.date}
          <select
            aria-label="선정할 끼니"
            disabled={saving}
            value={selectionContext.meal}
            onChange={(event) =>
              setSelectionContext({
                ...selectionContext,
                meal: event.target.value,
              })
            }
          >
            <option value="breakfast">아침</option>
            <option value="lunch">점심</option>
            <option value="dinner">저녁</option>
          </select>
        </label>
      )}
      {saveError && (
        <p role="alert" className="text-center text-red-500">
          {saveError}
        </p>
      )}
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
            <button
              disabled={saving || !selectionContext}
              className="mt-4 rounded-xl bg-white px-5 py-2 font-bold text-orange-600 disabled:opacity-50"
              onClick={() => selectMenu(ranking[0].menuId)}
            >
              {saving ? "저장 중..." : "메뉴로 선정"}
            </button>
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
                <span className="text-gray-500">{Math.round(f.score)}점</span>
                <button
                  disabled={saving || !selectionContext}
                  aria-label={`${f.name} 메뉴로 선정`}
                  className="rounded-lg bg-orange-100 px-3 py-1 text-orange-800 disabled:opacity-50"
                  onClick={() => selectMenu(f.menuId)}
                >
                  선정
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
      <button
        disabled={saving}
        className="rounded-xl bg-gray-200 py-3 disabled:opacity-50"
        onClick={onRestart}
      >
        다시 하기
      </button>
    </main>
  );
}
