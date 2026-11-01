"use client";
import { readApiResponse } from "@/lib/read-api-response";
import "./recommendation-results.css";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCardDeck } from "./deck";
import {
  TAGS,
  WEIGHTS,
  applyInteraction,
  emptyTaste,
  toGauge,
  type Food,
  type Taste,
} from "./taste";
import SensoryObject, {
  StatDonutBadge,
  VISIBLE_SENSORY_TAGS,
} from "@/components/SensoryObject";
import ShareButton from "@/app/share/ShareButton";
import useShareFeedbackGroup from "@/features/sharing/useShareFeedbackGroup";
import Tutorial from "@/components/Tutorial";

const SHAKE_ACCEL = 10;
const SHAKE_HOLD_MS = 300;
const TICK_MS = 100;

type Saved = { recordId: string; recommendations: Ranked[] };

// "다시 고르기"로 들어오면(오늘 이미 고른 끼니) 그때 받은 추천 결과를 다시 보여 줌
async function loadSaved(): Promise<Saved | null> {
  const meal = new URLSearchParams(window.location.search).get("meal");
  if (!meal) return null;
  const today = await fetch("/api/selections/today", { cache: "no-store" }).then(readApiResponse);
  const recordId = today.meals?.[meal]?.recordId;
  if (!recordId) return null;
  const { records } = await fetch(`/api/records?date=${today.date}`, { cache: "no-store" }).then(readApiResponse);
  return (records as Saved[] | undefined)?.find((r) => r.recordId === recordId) ?? null;
}

// Next.js가 다른 페이지로 갔다 와도 화면 상태를 그대로 보존해서(cacheComponents),
// 링크로 새로 들어올 때마다 카드부터 다시 시작하도록 bfcacheId로 초기화. 뒤로 가기에서는 그대로 유지됨.
export default function FoodCard(props: { initialFoods: Food[] }) {
  const { bfcacheId } = useRouter();
  return <Home key={bfcacheId} {...props} />;
}

function Home({ initialFoods }: { initialFoods: Food[] }) {
  const [foods, setFoods] = useState(initialFoods);
  const [index, setIndex] = useState(0);
  const [taste, setTaste] = useState(emptyTaste);
  const [cardDamage, setCardDamage] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined); // undefined = 확인 중
  const [restartPending, setRestartPending] = useState(false);
  const [restartError, setRestartError] = useState("");
  const restartLock = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    loadSaved().then(setSaved, () => setSaved(null));
  }, []);

  const food: Food | undefined = foods[index];
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

  async function restart() {
    if (restartLock.current) return;
    restartLock.current = true;
    setRestartPending(true); setRestartError("");
    try {
      // 저장/수정/포함 설정을 바꾼 뒤에도 가장 최근의 내 음식 목록으로 다시 시작합니다.
      const response = await fetch("/api/food-card/catalog", { cache: "no-store" });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "음식 카드를 불러오지 못했어요.");
      setFoods(createCardDeck(data.foods as Food[]));
      setIndex(0);
      setCardDamage(0);
      setTaste(emptyTaste());
      setFinished(false);
      setSaved(null);
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : "음식 카드를 불러오지 못했어요.");
    } finally { restartLock.current = false; setRestartPending(false); }
  }

  if (saved === undefined) return <p className="p-8 text-center text-gray-500">불러오는 중...</p>;
  if (saved || done) return <Result taste={taste} saved={saved ?? undefined} foods={foods}
    onRestart={() => void restart()} restartPending={restartPending} restartError={restartError} />;

  const gauge = toGauge(taste);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col gap-3 overflow-x-clip p-4">
      {/* 6대 미각·식감 추천 기준(매운맛·단맛·짠맛·기름짐·국물·바삭함)을 대표 아이콘 중심의 도넛 게이지로 표시 */}
      <ul className="grid grid-cols-6 gap-2 py-1">
        {VISIBLE_SENSORY_TAGS.map((t) => (
          <li
            key={t}
            aria-label={t}
            className="flex items-center justify-center"
          >
            <StatDonutBadge tag={t} ratio={gauge[t] / 100} size={44} />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          카드 {index + 1} / {foods.length}
        </p>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm active:scale-95"
          onClick={() => setShowInfo((prev) => !prev)}
        >
          {showInfo ? "음식 정보 끄기" : "음식 정보 켜기"}
        </button>
      </div>

      <div className="relative flex w-full items-center justify-center">
        <div className="absolute left-0 top-1/2 z-20 -translate-y-1/2">
        <SkipButton
          label="이전 카드로 이동"
          disabled={index === 0}
          onClick={() => skip(-1)}
        >
          ‹
        </SkipButton>
        </div>

        {/* 감각 오브제 자체가 3차원 카드로 동작 */}
        <div
          role="group"
          aria-label={`${food.name} 음식 카드`}
          data-tutorial="card"
          className="relative z-10 flex aspect-[4/5] max-h-[600px] w-full min-w-0 select-none items-center justify-center overflow-visible"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x / 20}deg)`,
            transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="w-full h-full">
            <SensoryObject
              preserveOriginalCardSize
              food={food}
              customConfig={food.customConfig}
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

        <div className="absolute right-0 top-1/2 z-20 -translate-y-1/2">
        <SkipButton label="다음 카드로 이동" tutorial="card" onClick={() => skip(1)}>
          ›
        </SkipButton>
        </div>
      </div>

      <Tutorial
        step="card"
        text={"끌리는 메뉴만 카드를 눌러 보고 당겨 보세요.\n딱히 끌리지 않으면 › 로 넘겨요.\n다 골랐으면 '추천 받기'!"}
      />
      <button
        data-tutorial="card"
        className="rounded-xl bg-accent py-3 font-semibold text-accent-ink shadow-md hover:bg-accent-hover active:scale-[0.99]"
        onClick={() => setFinished(true)}
      >
        추천 받기
      </button>
    </main>
  );
}

function SkipButton(props: {
  label: string;
  tutorial?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={props.label}
      data-tutorial={props.tutorial}
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

function Result({ taste, saved, foods, onRestart, restartPending, restartError }: {
  taste: Taste; saved?: Saved; foods: Food[]; onRestart: () => void;
  restartPending: boolean; restartError: string;
}) {
  const router = useRouter();
  const shareFeedback = useShareFeedbackGroup();
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
      // 저장된 결과가 있으면 새로 추천받지 않고 그대로 사용
      const recommend: Promise<Saved> = saved
        ? Promise.resolve(saved)
        : fetch("/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: requestId.current,
              tasteScores: JSON.parse(body),
            }),
          }).then(async (response) => {
            const data = await readApiResponse(response);
            if (!response.ok)
              throw new Error(data.error?.message ?? "추천을 불러오지 못했어요.");
            return data;
          });
      const promise = recommend.then(async (data) => {
        const todayResponse = await fetch("/api/selections/today", {
          cache: "no-store",
        });
        const today = await readApiResponse(todayResponse);
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
  }, [body, attempt, saved]);

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
      const result = await readApiResponse(response);
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
        <label className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          {selectionContext.date}
          <span className={`relative inline-flex min-h-12 min-w-24 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-base leading-relaxed focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-focus ${saving || restartPending ? "opacity-50" : ""}`}>
            {/* Render the visible label outside the native select so its text cannot be clipped. */}
            <span aria-hidden="true">{{ breakfast: "아침", lunch: "점심", dinner: "저녁" }[selectionContext.meal]}</span>
            <svg aria-hidden="true" className="pointer-events-none size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            <select
              aria-label="선정할 끼니"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
              disabled={saving || restartPending}
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
          </span>
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
            className="rounded-xl bg-accent-soft p-3 text-accent-ink"
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
          <Tutorial
            step="result"
            finishOnClick
            text={"마음에 드는 메뉴를 선정하거나\n친구에게 공유해 보세요!"}
          />
          <ol className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            {ranking.slice(0, 5).map((f, i) => (
              <li
                key={f.menuId}
                className={`flex flex-col gap-2 rounded-2xl bg-white p-3 shadow ${
                  i === 0 ? "col-span-full border-2 border-accent-border p-4" : i > 2 ? "col-span-full" : ""
                }`}
              >
                <div className="relative flex min-h-9 items-center justify-center px-9 text-center">
                  <Medal rank={i + 1} />
                  <span className={`font-bold ${i === 0 ? "text-3xl" : "text-lg"}`}>{f.name}</span>
                </div>
                {i < 3 && (
                  <FoodImage name={f.name} custom={f.menuId.startsWith("custom:")}
                    image={foods.find(food => food.id === f.menuId)?.image}
                    className={i === 0 ? "aspect-[4/3]" : "aspect-square"} />
                )}
                <p className="text-center text-xs text-gray-500">유사도 {Math.round(f.score)}점</p>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <button
                    data-tutorial={i === 0 ? "result" : undefined}
                    disabled={saving || restartPending || !selectionContext}
                    aria-label={`${f.name} 메뉴로 선정`}
                    className="flex min-h-11 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-xl bg-accent px-2 py-2 font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
                    onClick={() => selectMenu(f.menuId)}
                  >
                    <span className="min-w-0 truncate">{saving ? "저장 중..." : "선정"}</span>
                  </button>
                  <ShareButton
                    data-tutorial={i === 0 ? "result" : undefined}
                    menu={f.name}
                    feedback={shareFeedback.forButton(f.menuId, "result")}
                    copiedLabel={i === 1 || i === 2 ? "복사됨" : undefined}
                    className={`flex min-h-11 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-xl border border-gray-300 py-2 text-gray-600 ${i === 1 || i === 2 ? "px-1" : "px-2"}`}
                  />
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {restartError && <p role="alert" className="text-center text-red-500">{restartError}</p>}
      <button
        disabled={saving || restartPending}
        className="rounded-xl bg-gray-200 py-3 disabled:opacity-50"
        onClick={onRestart}
      >
        {restartPending ? "불러오는 중…" : "다시 하기"}
      </button>
    </main>
  );
}

function Medal({ rank }: { rank: number }) {
  return (
    <span
      aria-label={`${rank}위`}
      data-rank={rank}
      className="recommendation-rank absolute left-0 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
    >
      {rank}
    </span>
  );
}

// 내 음식은 저장한 그림을 사용하고, 기본 메뉴는 음식 사진 API를 사용합니다.
function FoodImage({ name, className, image, custom }: {
  name: string; className: string; image?: string | null; custom: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const isPho = !custom && name === "쌀국수";
  return failed || (custom && !image) ? (
    <div className={`flex items-center justify-center rounded-xl bg-accent-soft text-5xl ${className}`} aria-hidden>
      🍽️
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- 외부 사진 주소가 음식마다 달라서 일반 img 사용
    <img
      src={custom ? image! : isPho ? "/food-images/pho-ai.webp" : `/api/food-image?name=${encodeURIComponent(name)}`}
      alt={name}
      decoding="async"
      onError={() => setFailed(true)}
      className={`w-full rounded-xl object-cover ${className}`}
    />
  );
}
