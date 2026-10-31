"use client";

import React, {
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useState,
} from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Food, Tag } from "@/app/food-card/taste";

// 실제 3D 입체 지오메트리 구조 타입 (단순 2D 텍스처가 아니라 메쉬의 3D 구조와 물리 자체가 다름!)
export type SurfacePatternType =
  | "fried" // 바삭함: 딱딱한 3D 보로노이 튀김 껍질 조각 + 속살
  | "meat" // 육질: 3D 입체 근섬유 다발(Muscle Bundles)과 깊은 칼집/결 + 당기면 결대로 벌어짐
  | "noodle" // 면: 수십 가닥의 실제 3D 원통형 면발(3D Tubes) 다발 + 당기면 면발이 가닥별로 분리되며 늘어남
  | "rice" // 밥/쌀: 수백 개의 실제 3D 입체 밥알(3D Rice Grains) 군집 + 누르면 밥알이 뭉개지고 통통 튐
  | "bread" // 빵/도우: 쿠프(칼집)가 파인 폭신한 3D 베이커리 식빵/번 구조 + 메모리폼처럼 깊게 눌렸다 천천히 복원
  | "broth" // 국물: 3D 다중 파동 수면 지오메트리 + 끓어오르는 기포
  | "fresh"; // 채소/샐러드: 아삭하게 겹쳐진 3D 크리스피 리프/조각 구조

export interface SensoryPhysicsProps {
  baseColor?: string;
  crackColor?: string;
  pattern?: SurfacePatternType;
  squish?: number;
  hardness?: number;
  viscosity?: number;
  maxStretch?: number;
  crack?: number;
  shake?: number;
  fluidity?: number;
  inflate?: number;
  steam?: number;
  boil?: number;
  redness?: number;
  roughness?: number;
  glossiness?: number;
}

export type SensoryPresetType =
  | "crispy"
  | "spicy"
  | "hot"
  | "soup"
  | "hearty"
  | "chewy";

// 외부로 드러나는 물리·시각 특성만 표시 (단맛, 짠맛 제외)
export const VISIBLE_SENSORY_TAGS: Tag[] = [
  "매운맛",
  "바삭함",
  "국물",
  "기름짐",
];

// 0% 초과 특성 중 최대 3개까지만 카드에 표시
export const MAX_VISIBLE_STATS = 3;

export const SENSORY_PRESETS: Record<
  SensoryPresetType,
  { label: string; desc: string; config: Required<SensoryPhysicsProps> }
> = {
  crispy: {
    label: "바삭함",
    desc: "딱딱한 3D 튀김 껍질을 연타해 깨뜨려보세요!",
    config: {
      baseColor: "#eab308",
      crackColor: "#fef3c7",
      pattern: "fried",
      squish: 0.3,
      hardness: 0.85,
      viscosity: 0.25,
      maxStretch: 0.7,
      crack: 1.0,
      shake: 0.2,
      fluidity: 0.0,
      inflate: 0.1,
      steam: 0.4,
      boil: 0.0,
      redness: 0.1,
      roughness: 0.38,
      glossiness: 0.6,
    },
  },
  spicy: {
    label: "매움",
    desc: "매운 진동과 열기가 느껴지는 3D 카드입니다!",
    config: {
      baseColor: "#dc2626",
      crackColor: "#fde047",
      pattern: "noodle",
      squish: 0.65,
      hardness: 0.3,
      viscosity: 0.65,
      maxStretch: 1.3,
      crack: 0.3,
      shake: 1.0,
      fluidity: 0.3,
      inflate: 0.15,
      steam: 0.8,
      boil: 0.6,
      redness: 1.0,
      roughness: 0.18,
      glossiness: 0.9,
    },
  },
  hot: {
    label: "뜨거움",
    desc: "모락모락 김이 피어오르는 3D 육질 카드입니다!",
    config: {
      baseColor: "#ea580c",
      crackColor: "#fca5a5",
      pattern: "meat",
      squish: 0.6,
      hardness: 0.4,
      viscosity: 0.55,
      maxStretch: 1.2,
      crack: 0.2,
      shake: 0.5,
      fluidity: 0.4,
      inflate: 0.25,
      steam: 1.0,
      boil: 0.5,
      redness: 0.6,
      roughness: 0.22,
      glossiness: 0.85,
    },
  },
  soup: {
    label: "국물",
    desc: "찰랑거리는 물결과 기포가 끓어오르는 3D 카드입니다!",
    config: {
      baseColor: "#0ea5e9",
      crackColor: "#e0f2fe",
      pattern: "broth",
      squish: 0.95,
      hardness: 0.1,
      viscosity: 0.35,
      maxStretch: 1.4,
      crack: 0.0,
      shake: 0.15,
      fluidity: 1.0,
      inflate: 0.1,
      steam: 0.85,
      boil: 1.0,
      redness: 0.0,
      roughness: 0.04,
      glossiness: 1.0,
    },
  },
  hearty: {
    label: "든든함",
    desc: "폭신하게 눌렸다 부풀어 오르는 3D 빵/밥 카드입니다!",
    config: {
      baseColor: "#d97706",
      crackColor: "#fef3c7",
      pattern: "bread",
      squish: 0.85,
      hardness: 0.2,
      viscosity: 0.8,
      maxStretch: 1.35,
      crack: 0.0,
      shake: 0.05,
      fluidity: 0.05,
      inflate: 0.9,
      steam: 0.6,
      boil: 0.0,
      redness: 0.1,
      roughness: 0.45,
      glossiness: 0.35,
    },
  },
  chewy: {
    label: "질김 / 쫀득함",
    desc: "잡아당기면 3D 면발 가닥들이 쭉 늘어나는 카드입니다!",
    config: {
      baseColor: "#a855f7",
      crackColor: "#f3e8ff",
      pattern: "noodle",
      squish: 0.85,
      hardness: 0.2,
      viscosity: 0.96,
      maxStretch: 1.85,
      crack: 0.0,
      shake: 0.05,
      fluidity: 0.2,
      inflate: 0.15,
      steam: 0.5,
      boil: 0.2,
      redness: 0.1,
      roughness: 0.08,
      glossiness: 1.0,
    },
  },
};

const COLD_FOOD_NAMES = new Set(["냉면", "초밥", "샐러드"]);
const MEAT_FOOD_NAMES = new Set(["삼겹살", "불고기", "제육볶음"]);
const RICE_FOOD_NAMES = new Set(["비빔밥", "초밥"]);
const BREAD_FOOD_NAMES = new Set(["피자", "햄버거"]);
const NOODLE_FOOD_NAMES = new Set([
  "짜장면",
  "짬뽕",
  "라멘",
  "쌀국수",
  "냉면",
  "파스타",
  "떡볶이",
]);
const FRIED_FOOD_NAMES = new Set(["치킨", "돈까스"]);

export function getPatternForFood(food: Food): SurfacePatternType {
  if (food.name === "샐러드") return "fresh";
  if (MEAT_FOOD_NAMES.has(food.name)) return "meat";
  if (RICE_FOOD_NAMES.has(food.name)) return "rice";
  if (BREAD_FOOD_NAMES.has(food.name)) return "bread";
  if (NOODLE_FOOD_NAMES.has(food.name)) return "noodle";
  if (FRIED_FOOD_NAMES.has(food.name)) return "fried";
  if ((food.tags["바삭함"] ?? 0) >= 0.4) return "fried";
  if ((food.tags["국물"] ?? 0) >= 0.6) return "broth";
  return "meat";
}

export function derivePhysicsFromFood(
  food: Food,
): Required<SensoryPhysicsProps> {
  const t = food.tags;
  const spicy = t["매운맛"] ?? 0;
  const sweet = t["단맛"] ?? 0;
  const salty = t["짠맛"] ?? 0;
  const oily = t["기름짐"] ?? 0;
  const soupy = t["국물"] ?? 0;
  const crispy = t["바삭함"] ?? 0;

  const isCold = COLD_FOOD_NAMES.has(food.name);
  const pattern = getPatternForFood(food);

  const baseCol = new THREE.Color("#f3d5b5");
  if (pattern === "meat") baseCol.set("#b45309");
  if (pattern === "rice") baseCol.set("#fffbeb");
  if (pattern === "bread") baseCol.set("#d97706");
  if (pattern === "noodle") baseCol.set("#fde68a");
  if (pattern === "fried") baseCol.set("#eab308");
  if (pattern === "fresh") baseCol.set("#22c55e");

  const spicyCol = new THREE.Color("#dc2626");
  const extremeSpicyCol = new THREE.Color("#991b1b");
  const crispyCol = new THREE.Color("#f59e0b");
  const oilyCol = new THREE.Color("#b45309");
  const soupyCol = isCold
    ? new THREE.Color("#38bdf8")
    : new THREE.Color("#ea580c");

  if (food.name === "짜장면") {
    baseCol.set("#3b1707");
  } else if (food.name === "초밥") {
    baseCol.set("#fff7ed");
  } else if (food.name !== "샐러드") {
    baseCol.lerp(oilyCol, oily * 0.3);
    baseCol.lerp(crispyCol, crispy * 0.45);
    baseCol.lerp(soupyCol, soupy * 0.35);
    if (spicy > 0) {
      baseCol.lerp(spicyCol, Math.min(1, spicy * 0.88));
      if (spicy > 0.7) {
        baseCol.lerp(extremeSpicyCol, (spicy - 0.7) * 1.4);
      }
    }
  }

  const innerCol = new THREE.Color("#fffbeb");
  if (spicy >= 0.5) {
    innerCol.set("#fde047").lerp(new THREE.Color("#fb923c"), spicy * 0.6);
  } else if (pattern === "meat") {
    innerCol.set("#fb7185"); // 선홍빛 육즙 속살
  } else if (pattern === "bread") {
    innerCol.set("#fef3c7"); // 폭신한 빵 속살(Crumb)
  } else if (food.name === "초밥") {
    innerCol.set("#fb7185"); // 연어/참치 횟감 톤
  } else {
    innerCol.copy(baseCol).lerp(new THREE.Color("#ffffff"), 0.45);
  }

  const crack =
    pattern === "fried" || pattern === "fresh"
      ? Math.max(0.65, crispy)
      : crispy >= 0.45
        ? crispy * 0.85
        : 0;

  const hardness = THREE.MathUtils.clamp(
    crispy * 0.75 + (pattern === "meat" ? 0.25 : 0) - soupy * 0.2,
    0.08,
    0.92,
  );

  const fluidity = THREE.MathUtils.clamp(soupy * 0.95, 0, 1);
  const squish = THREE.MathUtils.clamp(
    0.5 +
      (pattern === "bread" ? 0.35 : 0) +
      soupy * 0.35 +
      sweet * 0.15 -
      crispy * 0.35,
    0.25,
    1.0,
  );

  const patternStretchBonus =
    pattern === "noodle"
      ? 0.35
      : pattern === "bread"
        ? 0.25
        : pattern === "meat"
          ? 0.2
          : 0;
  const chewinessFactor = THREE.MathUtils.clamp(
    oily * 0.4 + sweet * 0.25 + salty * 0.2 + patternStretchBonus,
    0.2,
    0.98,
  );
  const maxStretch = THREE.MathUtils.lerp(
    0.7,
    1.95,
    THREE.MathUtils.clamp(chewinessFactor + (1 - hardness) * 0.25, 0, 1),
  );

  const shake = THREE.MathUtils.clamp(spicy * 1.1, 0, 1);

  const heatLevel = isCold
    ? 0
    : THREE.MathUtils.clamp(
        0.35 + soupy * 0.5 + spicy * 0.4 + oily * 0.25,
        0,
        1,
      );
  const boilLevel = isCold
    ? 0
    : soupy >= 0.2
      ? THREE.MathUtils.clamp(soupy * 0.75 + spicy * 0.35, 0.25, 1)
      : 0;

  return {
    baseColor: `#${baseCol.getHexString()}`,
    crackColor: `#${innerCol.getHexString()}`,
    pattern,
    squish,
    hardness,
    viscosity: chewinessFactor,
    maxStretch,
    crack,
    shake,
    fluidity,
    inflate: THREE.MathUtils.clamp(
      (pattern === "bread" ? 0.55 : 0.15) + oily * 0.4,
      0.1,
      0.95,
    ),
    steam: heatLevel,
    boil: boilLevel,
    redness: spicy,
    roughness:
      pattern === "bread"
        ? 0.55
        : pattern === "rice"
          ? 0.22
          : THREE.MathUtils.clamp(
              0.08 + crispy * 0.36 - soupy * 0.15,
              0.04,
              0.55,
            ),
    glossiness:
      pattern === "bread"
        ? 0.25
        : THREE.MathUtils.clamp(
            0.6 + soupy * 0.4 + oily * 0.3 - crispy * 0.2,
            0.35,
            1.0,
          ),
  };
}

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = envTexture;
    return () => {
      envTexture.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function playSensorySound(
  crack: number,
  viscosity: number,
  fluidity: number,
  intensity: number,
) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (crack > 0.35) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.085);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.022));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(
        1150 + Math.random() * 850 + intensity * 500,
        now,
      );

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.085);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (fluidity > 0.5) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 280 + Math.random() * 180;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 150 + (1 - viscosity) * 110 + intensity * 120;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.17);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {
    // 오디오 자동재생 제한 무시
  }
}

const CARD_WIDTH = 1.62;
const CARD_HEIGHT = 2.16;
const CARD_DEPTH = 0.28;
const CARD_BEVEL = 0.075;

const STAT_HEX_COLORS: Record<string, string> = {
  매운맛: "#ef4444",
  기름짐: "#eab308",
  국물: "#0ea5e9",
  바삭함: "#f97316",
};

const PATTERN_LABELS: Record<SurfacePatternType, string> = {
  meat: "3D 입체 근섬유 육질 블록",
  rice: "3D 입체 쌀알 군집 구조",
  noodle: "3D 입체 면발 다발 구조",
  bread: "3D 폭신한 에어포켓 빵 반죽",
  fried: "3D 바삭한 크리스피 튀김 껍질",
  broth: "3D 출렁이는 국물 파동 블록",
  fresh: "3D 아삭한 크리스피 조각 블록",
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSurfacePattern(
  colorCtx: CanvasRenderingContext2D,
  bumpCtx: CanvasRenderingContext2D,
  offsetX: number,
  width: number,
  height: number,
  pattern: SurfacePatternType,
  baseColorHex: string,
) {
  const baseCol = new THREE.Color(baseColorHex);
  const lightHex = `#${baseCol.clone().lerp(new THREE.Color("#ffffff"), 0.26).getHexString()}`;
  const darkHex = `#${baseCol.clone().lerp(new THREE.Color("#000000"), 0.25).getHexString()}`;

  colorCtx.save();
  bumpCtx.save();

  colorCtx.beginPath();
  colorCtx.rect(offsetX, 0, width, height);
  colorCtx.clip();

  bumpCtx.beginPath();
  bumpCtx.rect(offsetX, 0, width, height);
  bumpCtx.clip();

  colorCtx.fillStyle = baseColorHex;
  colorCtx.fillRect(offsetX, 0, width, height);

  bumpCtx.fillStyle = "#808080";
  bumpCtx.fillRect(offsetX, 0, width, height);

  if (pattern === "meat") {
    // 육질 마블링 및 시어링 그릴 결
    for (let i = 0; i < 95; i++) {
      const y = (i / 95) * height;
      colorCtx.beginPath();
      bumpCtx.beginPath();
      for (let x = 0; x <= width; x += 20) {
        const wave =
          Math.sin(x * 0.02 + i * 0.6) * 16 + Math.cos(x * 0.045 - i) * 7;
        if (x === 0) {
          colorCtx.moveTo(offsetX + x, y + wave);
          bumpCtx.moveTo(offsetX + x, y + wave);
        } else {
          colorCtx.lineTo(offsetX + x, y + wave);
          bumpCtx.lineTo(offsetX + x, y + wave);
        }
      }
      colorCtx.strokeStyle =
        i % 4 === 0 ? "rgba(255, 235, 230, 0.55)" : darkHex;
      colorCtx.lineWidth = i % 4 === 0 ? 5.5 : 2.5;
      colorCtx.stroke();

      bumpCtx.strokeStyle = i % 2 === 0 ? "#c8c8c8" : "#404040";
      bumpCtx.lineWidth = 4;
      bumpCtx.stroke();
    }
  } else if (pattern === "bread") {
    // 빵 크러스트 노릇한 구움색 그라데이션 & 기공(Air-pockets)
    const breadGrad = colorCtx.createRadialGradient(
      offsetX + width * 0.5,
      height * 0.5,
      50,
      offsetX + width * 0.5,
      height * 0.5,
      width * 0.7,
    );
    breadGrad.addColorStop(0, lightHex);
    breadGrad.addColorStop(1, darkHex);
    colorCtx.fillStyle = breadGrad;
    colorCtx.fillRect(offsetX, 0, width, height);

    let seed = 77;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 500; i++) {
      const cx = offsetX + rand() * width;
      const cy = rand() * height;
      const r = 2 + rand() * 8;
      bumpCtx.beginPath();
      bumpCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bumpCtx.fillStyle = i % 3 === 0 ? "#303030" : "#b5b5b5";
      bumpCtx.fill();
    }
  } else if (pattern === "noodle") {
    // 면발의 윤기와 가닥 결 보조 하이라이트
    const strandCount = 22;
    for (let i = 0; i < strandCount; i++) {
      const bx = (i / strandCount) * width;
      colorCtx.beginPath();
      bumpCtx.beginPath();
      for (let y = 0; y <= height; y += 20) {
        const wx = Math.sin(y * 0.016 + i * 0.8) * 18;
        if (y === 0) {
          colorCtx.moveTo(offsetX + bx + wx, y);
          bumpCtx.moveTo(offsetX + bx + wx, y);
        } else {
          colorCtx.lineTo(offsetX + bx + wx, y);
          bumpCtx.lineTo(offsetX + bx + wx, y);
        }
      }
      colorCtx.strokeStyle = lightHex;
      colorCtx.lineWidth = 10;
      colorCtx.stroke();

      bumpCtx.strokeStyle = "#e0e0e0";
      bumpCtx.lineWidth = 12;
      bumpCtx.stroke();
    }
  } else if (pattern === "fried") {
    let seed = 101;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 650; i++) {
      const cx = offsetX + rand() * width;
      const cy = rand() * height;
      const r = 4 + rand() * 14;
      colorCtx.beginPath();
      colorCtx.arc(cx, cy, r, 0, Math.PI * 2);
      colorCtx.fillStyle = i % 2 === 0 ? lightHex : darkHex;
      colorCtx.globalAlpha = 0.38;
      colorCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bumpCtx.fillStyle = i % 2 === 0 ? "#e8e8e8" : "#353535";
      bumpCtx.fill();
    }
    colorCtx.globalAlpha = 1.0;
  }

  colorCtx.restore();
  bumpCtx.restore();
}

function createCardAtlasTextures(
  title: string,
  pattern: SurfacePatternType,
  baseColorHex: string,
  stats: Array<[string, number]>,
  showInfo: boolean,
): { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null {
  if (typeof document === "undefined") return null;

  const width = 1024;
  const height = 1024;
  const halfW = width / 2;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext("2d");

  if (!colorCtx || !bumpCtx) return null;

  drawSurfacePattern(
    colorCtx,
    bumpCtx,
    0,
    halfW,
    height,
    pattern,
    baseColorHex,
  );
  drawSurfacePattern(
    colorCtx,
    bumpCtx,
    halfW,
    halfW,
    height,
    pattern,
    baseColorHex,
  );

  if (showInfo) {
    drawRoundRect(colorCtx, 32, 48, halfW - 64, 164, 30);
    colorCtx.fillStyle = "rgba(15, 23, 42, 0.72)";
    colorCtx.fill();
    colorCtx.lineWidth = 3;
    colorCtx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    colorCtx.stroke();

    colorCtx.fillStyle = "#ffffff";
    colorCtx.font =
      "900 64px -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    colorCtx.textAlign = "center";
    colorCtx.textBaseline = "middle";
    colorCtx.fillText(title, halfW / 2, 112);

    colorCtx.fillStyle = "rgba(253, 224, 71, 0.95)";
    colorCtx.font =
      "700 21px -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    colorCtx.fillText(PATTERN_LABELS[pattern], halfW / 2, 174);

    if (stats.length > 0) {
      const rowH = 56;
      const panelH = stats.length * rowH + 44;
      const panelY = height - panelH - 48;

      drawRoundRect(colorCtx, 32, panelY, halfW - 64, panelH, 30);
      colorCtx.fillStyle = "rgba(15, 23, 42, 0.75)";
      colorCtx.fill();
      colorCtx.lineWidth = 3;
      colorCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      colorCtx.stroke();

      stats.forEach(([label, val], idx) => {
        const pct = Math.round(val * 100);
        const ry = panelY + 26 + idx * rowH;

        const badgeColor = STAT_HEX_COLORS[label] ?? "#f97316";
        drawRoundRect(colorCtx, 52, ry, 96, 38, 12);
        colorCtx.fillStyle = badgeColor;
        colorCtx.fill();

        colorCtx.fillStyle = "#ffffff";
        colorCtx.font =
          "800 21px -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
        colorCtx.textAlign = "center";
        colorCtx.textBaseline = "middle";
        colorCtx.fillText(label, 100, ry + 20);

        const barX = 164;
        const barW = 224;
        drawRoundRect(colorCtx, barX, ry + 11, barW, 16, 8);
        colorCtx.fillStyle = "rgba(255, 255, 255, 0.24)";
        colorCtx.fill();

        const fillW = Math.max(12, (barW * pct) / 100);
        drawRoundRect(colorCtx, barX, ry + 11, fillW, 16, 8);
        colorCtx.fillStyle = "#ffffff";
        colorCtx.fill();

        colorCtx.fillStyle = "#ffffff";
        colorCtx.font = "800 22px monospace";
        colorCtx.textAlign = "right";
        colorCtx.fillText(`${pct}%`, halfW - 52, ry + 20);
      });
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.needsUpdate = true;

  return { colorMap, bumpMap };
}

function createWispySteamTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 256);
  const puffs = [
    { x: 128, y: 128, r: 95, a: 0.22 },
    { x: 100, y: 140, r: 70, a: 0.18 },
    { x: 155, y: 110, r: 75, a: 0.18 },
    { x: 125, y: 85, r: 65, a: 0.15 },
  ];

  puffs.forEach((p) => {
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${p.a})`);
    grad.addColorStop(0.45, `rgba(255, 255, 255, ${p.a * 0.55})`);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * 1) 기본 3:4 카드 직육면체 및 육질(Meat) / 빵(Bread) / 튀김 알갱이(Fried)의 실제 3D 입체 요철 지오메트리 생성!
 * 단순 텍스처가 아니라 정점(Vertex) 자체가 근육 다발 골짜기, 빵 쿠프(칼집) 볼륨, 엠보싱으로 조각됩니다.
 */
function createSculpted3DCardGeometry(
  pattern: SurfacePatternType,
  detailScale = 1.65,
): {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  vertexGroupIds: Int16Array; // 면발/근섬유 다발/밥알 그룹 ID
} {
  if (pattern === "noodle") {
    return build3DNoodleBundleCardGeometry();
  }
  if (pattern === "rice") {
    return build3DRiceClusterCardGeometry();
  }

  const sx = Math.round(28 * detailScale);
  const sy = Math.round(36 * detailScale);
  const sz = Math.round(8 * detailScale);
  const rawBox = new THREE.BoxGeometry(
    CARD_WIDTH,
    CARD_HEIGHT,
    CARD_DEPTH,
    sx,
    sy,
    sz,
  );

  const halfW = CARD_WIDTH / 2;
  const halfH = CARD_HEIGHT / 2;
  const halfD = CARD_DEPTH / 2;
  const bevel = pattern === "bread" ? 0.13 : CARD_BEVEL;
  const innerW = halfW - bevel;
  const innerH = halfH - bevel;
  const innerD = Math.max(0.02, halfD - bevel);

  const nonIndexed = rawBox.index ? rawBox.toNonIndexed() : rawBox;
  const posAttr = nonIndexed.attributes.position;
  const vertexMap = new Map<string, number>();
  const uniquePos: number[] = [];
  const uvs: number[] = [];
  const groupIds: number[] = [];
  const indices: number[] = [];
  const temp = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    temp.fromBufferAttribute(posAttr, i);
    const isFront = temp.z > halfD * 0.65 ? 1 : 0;
    const key = `${Math.round(temp.x * 1000)}_${Math.round(temp.y * 1000)}_${Math.round(temp.z * 1000)}_${isFront}`;
    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = uniquePos.length / 3;
      vertexMap.set(key, idx);

      const cx = THREE.MathUtils.clamp(temp.x, -innerW, innerW);
      const cy = THREE.MathUtils.clamp(temp.y, -innerH, innerH);
      const cz = THREE.MathUtils.clamp(temp.z, -innerD, innerD);
      const dx = temp.x - cx;
      const dy = temp.y - cy;
      const dz = temp.z - cz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      let px = temp.x;
      let py = temp.y;
      let pz = temp.z;
      if (len > 1e-5) {
        px = cx + (dx / len) * bevel;
        py = cy + (dy / len) * bevel;
        pz = cz + (dz / len) * bevel;
      }

      let gId = 0;

      // 패턴별 실제 3D 정점 조각(3D Sculpting) 적용!
      if (pattern === "meat") {
        // 육질(Meat): 사선 방향의 두툼한 3D 근섬유 다발(Muscle Fiber Bundles)과 깊은 칼집 골짜기 조각
        const fiberCoord = px * 5.2 + py * 2.4 + Math.sin(py * 4.5) * 0.35;
        gId = Math.floor((fiberCoord + 10) * 1.8) % 16;
        const fiberRidge = Math.sin(fiberCoord * Math.PI * 1.8);
        // 근섬유 골짜기는 안으로 깊게 파이고 근육 다발은 볼록하게 튀어나옴
        const relief =
          (fiberRidge > 0
            ? Math.pow(fiberRidge, 0.6) * 0.045
            : fiberRidge * 0.055) +
          Math.cos(px * 14 - py * 12) * 0.012;
        pz += Math.sign(pz || 1) * relief;
      } else if (pattern === "bread") {
        // 빵(Bread): 가운데가 볼록하게 부푼 식빵/번 볼륨 + 3줄의 깊은 사선 쿠프(칼집) 슬릿 조각
        const edgeFactor =
          (1 - Math.pow(px / halfW, 2)) * (1 - Math.pow(py / halfH, 2));
        const loafPillow = Math.max(0, edgeFactor) * 0.085;

        // 3개의 사선 베이커리 칼집(Score Slashes)
        const diag = px * 1.8 - py * 1.2;
        let slashDepth = 0;
        for (const offset of [-0.55, 0, 0.55]) {
          const distToSlash = Math.abs(diag - offset);
          if (distToSlash < 0.16 && Math.abs(px) < halfW * 0.72) {
            slashDepth +=
              Math.cos((distToSlash / 0.16) * (Math.PI / 2)) * 0.065;
          }
        }
        // 빵 표면의 미세한 에어포켓(기공) 엠보싱
        const crumbNoise = Math.sin(px * 18) * Math.cos(py * 18) * 0.012;
        pz += Math.sign(pz || 1) * (loafPillow - slashDepth + crumbNoise);
        gId = Math.floor((diag + 5) * 2) % 8;
      } else if (pattern === "fried") {
        // 튀김(Fried): 겉면에 울퉁불퉁한 3D 크리스피 튀김옷 입자 요철 조각
        const batterBump =
          Math.sin(px * 22) * Math.cos(py * 22) * 0.022 +
          Math.sin(px * 37 - py * 31) * 0.014;
        pz += Math.sign(pz || 1) * batterBump;
      }

      uniquePos.push(px, py, pz);
      groupIds.push(gId);

      const normU = THREE.MathUtils.clamp(px / CARD_WIDTH + 0.5, 0.02, 0.98);
      const normV = THREE.MathUtils.clamp(py / CARD_HEIGHT + 0.5, 0.02, 0.98);
      if (isFront) {
        uvs.push(normU * 0.5, normV);
      } else {
        uvs.push(0.5 + normU * 0.5, normV);
      }
    }
    indices.push(idx);
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(uniquePos);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return {
    geometry: geo,
    basePositions: new Float32Array(posFloat),
    vertexGroupIds: new Int16Array(groupIds),
  };
}

/**
 * 2) 면(Noodle) 전용 실제 3D 입체 면발 다발 지오메트리 생성!
 * 카드 전체가 28가닥의 통통한 3D 원통형 웨이브 면발(Tubes)들이 겹겹이 얽혀 있는 진짜 3D 구조로 만들어집니다.
 * 당기면 각 면발 가닥(strandId)이 개별적으로 분리되며 쭉 늘어납니다!
 */
function build3DNoodleBundleCardGeometry(): {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  vertexGroupIds: Int16Array;
} {
  const positions: number[] = [];
  const uvs: number[] = [];
  const groupIds: number[] = [];
  const indices: number[] = [];

  const cols = 14;
  const layers = 2; // 앞뒤 2겹의 입체 면발 층
  const segsY = 40;
  const radialSegs = 10;
  const tubeRadius = 0.072;

  let vertexOffset = 0;

  for (let layer = 0; layer < layers; layer++) {
    const baseZ = (layer === 0 ? 1 : -1) * (CARD_DEPTH * 0.24);
    for (let c = 0; c < cols; c++) {
      const strandId = layer * cols + c;
      const ratioX = (c + 0.5) / cols - 0.5;
      const baseX = ratioX * (CARD_WIDTH - tubeRadius * 2.2);
      const phase = c * 0.85 + layer * 1.7;

      // 면발 1가닥의 3D 웨이브 중심선 및 링 정점 생성
      for (let iy = 0; iy <= segsY; iy++) {
        const ty = iy / segsY;
        const cy = (ty - 0.5) * (CARD_HEIGHT - tubeRadius * 1.5);
        // 구불구불한 라멘/짜장/우동 면발 웨이브
        const waveX = Math.sin(ty * Math.PI * 5 + phase) * 0.052;
        const waveZ = Math.cos(ty * Math.PI * 5 + phase) * 0.028;
        const centerX = baseX + waveX;
        const centerZ = baseZ + waveZ;

        for (let ir = 0; ir < radialSegs; ir++) {
          const angle = (ir / radialSegs) * Math.PI * 2;
          const nx = Math.cos(angle);
          const nz = Math.sin(angle);

          const vx = centerX + nx * tubeRadius;
          const vy = cy;
          const vz = centerZ + nz * tubeRadius;

          positions.push(vx, vy, vz);
          groupIds.push(strandId);

          const isFront = vz > 0 && nz > -0.2;
          const normU = THREE.MathUtils.clamp(
            vx / CARD_WIDTH + 0.5,
            0.02,
            0.98,
          );
          const normV = THREE.MathUtils.clamp(
            vy / CARD_HEIGHT + 0.5,
            0.02,
            0.98,
          );
          if (isFront) {
            uvs.push(normU * 0.5, normV);
          } else {
            uvs.push(0.5 + normU * 0.5, normV);
          }
        }
      }

      // 면발 튜브 인덱스 연결
      for (let iy = 0; iy < segsY; iy++) {
        for (let ir = 0; ir < radialSegs; ir++) {
          const nextIr = (ir + 1) % radialSegs;
          const a = vertexOffset + iy * radialSegs + ir;
          const b = vertexOffset + (iy + 1) * radialSegs + ir;
          const cIdx = vertexOffset + (iy + 1) * radialSegs + nextIr;
          const d = vertexOffset + iy * radialSegs + nextIr;
          indices.push(a, b, d, b, cIdx, d);
        }
      }

      vertexOffset += (segsY + 1) * radialSegs;
    }
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(positions);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return {
    geometry: geo,
    basePositions: new Float32Array(posFloat),
    vertexGroupIds: new Int16Array(groupIds),
  };
}

/**
 * 3) 밥/쌀(Rice) 전용 실제 3D 입체 밥알 군집 지오메트리 생성!
 * 수백 개의 통통한 3D 캡슐형 쌀알(3D Ellipsoid Rice Grains)들이 카드 표면에 촘촘히 뭉쳐 있는 진짜 3D 밥블록입니다.
 * 만지면 밥알들이 찰기 있게 뭉개지거나 낱알 단위로 들썩거립니다!
 */
function build3DRiceClusterCardGeometry(): {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  vertexGroupIds: Int16Array;
} {
  // 먼저 안쪽 찰밥 베이스 블록 생성
  const core = createSculpted3DCardGeometry("broth", 0.9);
  const positions = Array.from(core.basePositions);
  const uvs = Array.from(
    (core.geometry.attributes.uv as THREE.BufferAttribute).array,
  );
  const groupIds = Array.from(core.vertexGroupIds);
  const indices = Array.from(core.geometry.index!.array);

  let vertexOffset = positions.length / 3;

  // 단일 3D 쌀알(통통한 타원체) 템플릿
  const grainTemplate = new THREE.SphereGeometry(1, 8, 6);
  const gPos = grainTemplate.attributes.position;
  const gIdx = grainTemplate.index!;

  let seed = 303;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 앞면, 뒷면, 옆면에 380개의 입체 3D 밥알들을 촘촘히 배치
  const grainCount = 380;
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const v = new THREE.Vector3();

  for (let g = 0; g < grainCount; g++) {
    const grainGroupId = (g % 45) + 1;
    const isFrontSide = g < grainCount * 0.55;
    const gx = (rand() - 0.5) * (CARD_WIDTH - 0.14);
    const gy = (rand() - 0.5) * (CARD_HEIGHT - 0.14);
    const gz =
      (isFrontSide ? 1 : -1) * (CARD_DEPTH * 0.46 + (rand() - 0.3) * 0.025);

    euler.set((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5, rand() * Math.PI);
    quat.setFromEuler(euler);

    // 쌀알 크기 (가로 0.048, 길이 0.088, 두께 0.042의 통통한 자포니카 쌀알 비율)
    const rx = 0.048;
    const ry = 0.088;
    const rz = 0.042;

    for (let i = 0; i < gPos.count; i++) {
      v.set(gPos.getX(i) * rx, gPos.getY(i) * ry, gPos.getZ(i) * rz);
      v.applyQuaternion(quat);
      const vx = gx + v.x;
      const vy = gy + v.y;
      const vz = gz + v.z;

      positions.push(vx, vy, vz);
      groupIds.push(grainGroupId);

      const normU = THREE.MathUtils.clamp(vx / CARD_WIDTH + 0.5, 0.02, 0.98);
      const normV = THREE.MathUtils.clamp(vy / CARD_HEIGHT + 0.5, 0.02, 0.98);
      if (isFrontSide) {
        uvs.push(normU * 0.5, normV);
      } else {
        uvs.push(0.5 + normU * 0.5, normV);
      }
    }

    for (let i = 0; i < gIdx.count; i++) {
      indices.push(vertexOffset + gIdx.getX(i));
    }
    vertexOffset += gPos.count;
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(positions);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return {
    geometry: geo,
    basePositions: new Float32Array(posFloat),
    vertexGroupIds: new Int16Array(groupIds),
  };
}

function clipPolygonByPlane(
  poly: THREE.Vector3[],
  normal: THREE.Vector3,
  constant: number,
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const n = poly.length;
  if (n === 0) return out;

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const da = a.dot(normal) - constant;
    const db = b.dot(normal) - constant;

    if (da <= 1e-5) {
      out.push(a);
    }
    if (da <= 1e-5 !== db <= 1e-5) {
      const t = da / (da - db);
      out.push(new THREE.Vector3().lerpVectors(a, b, t));
    }
  }
  return out;
}

interface RigidCrustData {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  baseNormals: Float32Array;
  vertexShardIds: Int16Array;
  shardCount: number;
  shardCenters: THREE.Vector3[];
  shardOutDirs: THREE.Vector3[];
  shardRotAxes: THREE.Vector3[];
  shardLiftScale: Float32Array;
}

function buildRigidCardCrust(
  pattern: SurfacePatternType,
  randomSeed: number,
): RigidCrustData {
  const baseObj = createSculpted3DCardGeometry(
    pattern === "fried" ? "fried" : "broth",
    1.15,
  );
  const baseGeo = baseObj.geometry;
  const posAttr = baseGeo.attributes.position;
  const indexAttr = baseGeo.index!;

  let s = Math.floor(randomSeed * 1000) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const shardCount = 46;
  const shardCenters: THREE.Vector3[] = [];
  const shardOutDirs: THREE.Vector3[] = [];
  const shardRotAxes: THREE.Vector3[] = [];
  const shardLiftScale = new Float32Array(shardCount);

  for (let i = 0; i < shardCount; i++) {
    const sx = (rand() - 0.5) * CARD_WIDTH;
    const sy = (rand() - 0.5) * CARD_HEIGHT;
    const sz = (rand() > 0.5 ? 1 : -1) * (CARD_DEPTH * 0.45);
    const pt = new THREE.Vector3(sx, sy, sz);
    const outDir = new THREE.Vector3(
      sx * 0.35,
      sy * 0.35,
      sz * 2.5,
    ).normalize();
    shardCenters.push(pt);
    shardOutDirs.push(outDir);
    shardRotAxes.push(
      new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
        .cross(outDir)
        .normalize(),
    );
    shardLiftScale[i] = 0.55 + rand() * 0.75;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const shardIds: number[] = [];
  const shellThickness = 0.048;

  const pushVertexWithUV = (v: THREE.Vector3, isFrontSurface: boolean) => {
    positions.push(v.x, v.y, v.z);
    const normU = THREE.MathUtils.clamp(v.x / CARD_WIDTH + 0.5, 0.02, 0.98);
    const normV = THREE.MathUtils.clamp(v.y / CARD_HEIGHT + 0.5, 0.02, 0.98);
    if (isFrontSurface) {
      uvs.push(normU * 0.5, normV);
    } else {
      uvs.push(0.5 + normU * 0.5, normV);
    }
  };

  const pushTriangle = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    shardId: number,
    isFrontSurface: boolean,
  ) => {
    pushVertexWithUV(a, isFrontSurface);
    pushVertexWithUV(b, isFrontSurface);
    pushVertexWithUV(c, isFrontSurface);
    shardIds.push(shardId, shardId, shardId);
  };

  const triCount = indexAttr.count / 3;
  for (let t = 0; t < triCount; t++) {
    const i0 = indexAttr.getX(t * 3);
    const i1 = indexAttr.getX(t * 3 + 1);
    const i2 = indexAttr.getX(t * 3 + 2);

    const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0);
    const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i1);
    const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i2);
    const triCenter = new THREE.Vector3()
      .add(v0)
      .add(v1)
      .add(v2)
      .divideScalar(3);

    const isFrontTri = triCenter.z > CARD_DEPTH * 0.3;

    const nearest = shardCenters
      .map((center, idx) => ({
        idx,
        dist: triCenter.distanceToSquared(center),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    for (let k = 0; k < nearest.length; k++) {
      const myIdx = nearest[k].idx;
      const mySeed = shardCenters[myIdx];
      let poly: THREE.Vector3[] = [v0.clone(), v1.clone(), v2.clone()];

      for (let m = 0; m < nearest.length; m++) {
        if (k === m) continue;
        const otherSeed = shardCenters[nearest[m].idx];
        const planeNormal = new THREE.Vector3().subVectors(otherSeed, mySeed);
        const midPoint = new THREE.Vector3()
          .addVectors(mySeed, otherSeed)
          .multiplyScalar(0.5);
        const planeConst = midPoint.dot(planeNormal);

        poly = clipPolygonByPlane(poly, planeNormal, planeConst);
        if (poly.length < 3) break;
      }

      if (poly.length >= 3) {
        for (let p = 1; p < poly.length - 1; p++) {
          pushTriangle(poly[0], poly[p], poly[p + 1], myIdx, isFrontTri);
        }
        const innerPoly = poly.map(
          (pt) =>
            new THREE.Vector3(
              pt.x * (1 - shellThickness * 0.6),
              pt.y * (1 - shellThickness * 0.6),
              pt.z * (1 - shellThickness * 2.2),
            ),
        );
        for (let p = 0; p < poly.length; p++) {
          const nextP = (p + 1) % poly.length;
          pushTriangle(poly[p], innerPoly[p], poly[nextP], myIdx, false);
          pushTriangle(
            poly[nextP],
            innerPoly[p],
            innerPoly[nextP],
            myIdx,
            false,
          );
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(positions);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const normFloat = new Float32Array(geo.attributes.normal.array);

  const accumCenters = Array.from(
    { length: shardCount },
    () => new THREE.Vector3(),
  );
  const counts = new Int32Array(shardCount);
  for (let i = 0; i < shardIds.length; i++) {
    const id = shardIds[i];
    accumCenters[id].x += posFloat[i * 3];
    accumCenters[id].y += posFloat[i * 3 + 1];
    accumCenters[id].z += posFloat[i * 3 + 2];
    counts[id]++;
  }
  for (let sIdx = 0; sIdx < shardCount; sIdx++) {
    if (counts[sIdx] > 0) {
      shardCenters[sIdx].copy(accumCenters[sIdx].divideScalar(counts[sIdx]));
      shardOutDirs[sIdx]
        .set(
          shardCenters[sIdx].x * 0.35,
          shardCenters[sIdx].y * 0.35,
          Math.sign(shardCenters[sIdx].z || 1) * 1.2,
        )
        .normalize();
    }
  }

  return {
    geometry: geo,
    basePositions: new Float32Array(posFloat),
    baseNormals: normFloat,
    vertexShardIds: new Int16Array(shardIds),
    shardCount,
    shardCenters,
    shardOutDirs,
    shardRotAxes,
    shardLiftScale,
  };
}

interface InternalCardProps {
  config: Required<SensoryPhysicsProps>;
  food?: Food;
  presetLabel: string;
  showInfo: boolean;
  value: number;
  randomSeed: number;
  onInteract: (delta: number) => void;
}

function SensoryCard3D({
  config,
  food,
  presetLabel,
  showInfo,
  value,
  randomSeed,
  onInteract,
}: InternalCardProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const innerFleshRef = useRef<THREE.Mesh>(null);
  const innerMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const outerCrustRef = useRef<THREE.Mesh>(null);
  const outerMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const steamRef = useRef<THREE.InstancedMesh>(null);
  const bubblesRef = useRef<THREE.InstancedMesh>(null);

  const interactionMode = useRef<"none" | "interact" | "rotate">("none");

  const targetRotation = useRef({ x: 0.06, y: -0.14 });
  const currentRotation = useRef({ x: 0.06, y: -0.14 });
  const prevPointerScreen = useRef({ x: 0, y: 0 });

  const dragPlane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());
  const pointerNDC = useRef(new THREE.Vector2());
  const planeIntersect = useRef(new THREE.Vector3());

  const targetHit = useRef(new THREE.Vector3(0, 0, CARD_DEPTH / 2));
  const viscousHit = useRef(new THREE.Vector3(0, 0, CARD_DEPTH / 2));
  const targetDrag = useRef(new THREE.Vector3(0, 0, 0));
  const viscousDrag = useRef(new THREE.Vector3(0, 0, 0));
  const pressDepth = useRef(0);
  const rippleEnergy = useRef(0);
  const touchHeat = useRef(0);

  const hitHistory = useRef<Array<{ pos: THREE.Vector3; power: number }>>([]);

  useEffect(() => {
    hitHistory.current = [];
    touchHeat.current = 0;
    targetRotation.current = { x: 0.06, y: -0.14 };
  }, [food?.id, randomSeed]);

  const hasCrust = config.crack > 0.05;

  // 1겹: 음식 패턴(면발 다발 / 밥알 군집 / 근섬유 육질 / 폭신한 빵 / 국물)에 따라 실제 3D 입체 지오메트리 생성!
  const { innerGeo, innerBasePos, innerGroupIds } = useMemo(() => {
    const innerPattern = hasCrust ? "meat" : config.pattern;
    const built = createSculpted3DCardGeometry(innerPattern, 1.55);
    const posAttr = built.geometry.attributes.position;
    const scaleXY = hasCrust ? 0.95 : 1.0;
    const scaleZ = hasCrust ? 0.86 : 1.0;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) * scaleXY,
        posAttr.getY(i) * scaleXY,
        posAttr.getZ(i) * scaleZ,
      );
    }
    built.geometry.computeVertexNormals();
    return {
      innerGeo: built.geometry,
      innerBasePos: new Float32Array(posAttr.array),
      innerGroupIds: built.vertexGroupIds,
    };
  }, [hasCrust, config.pattern]);

  // 2겹: 딱딱한 바깥 껍질 3D 카드 메쉬
  const crustData = useMemo(() => {
    if (!hasCrust) return null;
    return buildRigidCardCrust(config.pattern, randomSeed);
  }, [hasCrust, config.pattern, randomSeed]);

  const filteredVisibleStats = useMemo(() => {
    if (food) {
      return VISIBLE_SENSORY_TAGS.map(
        (tag) => [tag, food.tags[tag] ?? 0] as [string, number],
      )
        .filter(([, val]) => val > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_VISIBLE_STATS);
    }
    const fallback: Array<[string, number]> = [
      ["바삭함", config.crack],
      ["매운맛", config.shake],
      ["국물", config.fluidity],
      ["기름짐", config.viscosity],
    ];
    return fallback
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_VISIBLE_STATS);
  }, [food, config.crack, config.shake, config.fluidity, config.viscosity]);

  const surfaceAtlas = useMemo(() => {
    const title = food ? food.name : presetLabel;
    return createCardAtlasTextures(
      title,
      config.pattern,
      config.baseColor,
      filteredVisibleStats,
      showInfo,
    );
  }, [
    food,
    presetLabel,
    config.pattern,
    config.baseColor,
    filteredVisibleStats,
    showInfo,
  ]);

  const innerFleshAtlas = useMemo(() => {
    if (!hasCrust) return null;
    return createCardAtlasTextures("", "meat", config.crackColor, [], false);
  }, [hasCrust, config.crackColor]);

  const wispySteamTex = useMemo(() => createWispySteamTexture(), []);

  useEffect(() => {
    return () => {
      surfaceAtlas?.colorMap.dispose();
      surfaceAtlas?.bumpMap.dispose();
      innerFleshAtlas?.colorMap.dispose();
      innerFleshAtlas?.bumpMap.dispose();
    };
  }, [surfaceAtlas, innerFleshAtlas]);

  const shardParticles = useMemo(() => {
    return Array.from({ length: 28 }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
      rotVel: new THREE.Vector3(),
      scale: new THREE.Vector3(),
      life: 0,
    }));
  }, []);

  const steamParticles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      baseX: (Math.random() - 0.5) * (CARD_WIDTH * 0.72),
      baseY: (Math.random() - 0.2) * (CARD_HEIGHT * 0.65),
      baseZ: CARD_DEPTH * 0.55 + Math.random() * 0.12,
      phase: (i / 16) * Math.PI * 2,
      speed: 0.22 + Math.random() * 0.18,
      swayAmp: 0.18 + Math.random() * 0.22,
      width: 0.45 + Math.random() * 0.35,
      height: 0.65 + Math.random() * 0.45,
    }));
  }, []);

  const bubbleParticles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * (CARD_WIDTH * 0.8),
        (Math.random() - 0.5) * (CARD_HEIGHT * 0.8),
        CARD_DEPTH * 0.52,
      ),
      phase: (i / 22) * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.5,
      maxScale: 0.04 + Math.random() * 0.05,
    }));
  }, []);

  const spawnParticleBurst = useCallback(
    (localPt: THREE.Vector3) => {
      // 바삭한 프리셋뿐 아니라 밥(rice)을 누를 때도 입체 밥알이 통통 튀어나가도록 지원!
      if (!hasCrust && config.pattern !== "rice") return;
      shardParticles.forEach((p) => {
        if (p.life <= 0.05 && Math.random() < 0.45) {
          p.pos
            .copy(localPt)
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                0.08,
              ),
            );
          p.vel.set(
            (Math.random() - 0.5) * 0.12,
            Math.random() * 0.11 + 0.03,
            Math.random() * 0.1 + 0.02,
          );
          p.rot.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          );
          p.rotVel.set(
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
          );
          if (config.pattern === "rice") {
            // 통통한 3D 쌀알 비율로 튀어나감
            p.scale.set(0.048, 0.088, 0.042);
          } else {
            const s = (0.045 + Math.random() * 0.075) * config.crack;
            p.scale.set(s * 1.1, s * 0.4, s * 0.9);
          }
          p.life = 1.0;
        }
      });
    },
    [hasCrust, config.pattern, config.crack, shardParticles],
  );

  const handleModelPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    interactionMode.current = "interact";

    if (groupRef.current) {
      const worldPt = e.point.clone();
      const localPt = groupRef.current.worldToLocal(worldPt.clone());
      targetHit.current.copy(localPt);
      if (pressDepth.current < 0.15) {
        viscousHit.current.copy(localPt);
      }

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir, worldPt);

      hitHistory.current.push({
        pos: localPt.clone(),
        power: 0.75 + Math.random() * 0.45,
      });
      if (hitHistory.current.length > 16) {
        hitHistory.current.shift();
      }
      spawnParticleBurst(localPt);
    }

    targetDrag.current.set(0, 0, 0);
    rippleEnergy.current = Math.min(1.3, rippleEnergy.current + 0.7);
    touchHeat.current = Math.min(1.0, touchHeat.current + 0.15);
    playSensorySound(
      config.crack,
      config.viscosity,
      config.fluidity,
      touchHeat.current,
    );
    onInteract(18);
  };

  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    interactionMode.current = "rotate";
    prevPointerScreen.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const domElement = gl.domElement;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (interactionMode.current === "none") return;

      if (interactionMode.current === "rotate") {
        const dx = e.clientX - prevPointerScreen.current.x;
        const dy = e.clientY - prevPointerScreen.current.y;
        prevPointerScreen.current = { x: e.clientX, y: e.clientY };

        targetRotation.current.y += dx * 0.013;
        targetRotation.current.x = THREE.MathUtils.clamp(
          targetRotation.current.x + dy * 0.012,
          -Math.PI * 0.85,
          Math.PI * 0.85,
        );
        return;
      }

      if (interactionMode.current === "interact" && groupRef.current) {
        const rect = domElement.getBoundingClientRect();
        pointerNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.current.setFromCamera(pointerNDC.current, camera);
        if (
          raycaster.current.ray.intersectPlane(
            dragPlane.current,
            planeIntersect.current,
          )
        ) {
          const currentLocal = groupRef.current.worldToLocal(
            planeIntersect.current.clone(),
          );
          targetDrag.current
            .subVectors(currentLocal, targetHit.current)
            .clampLength(0, config.maxStretch);

          if (targetDrag.current.length() > 0.08) {
            rippleEnergy.current = Math.min(1.1, rippleEnergy.current + 0.04);
            touchHeat.current = Math.min(1.0, touchHeat.current + 0.012);
            onInteract(1.2);
          }
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (interactionMode.current !== "none") {
        interactionMode.current = "none";
        targetDrag.current.set(0, 0, 0);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [camera, gl, config.maxStretch, onInteract]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempOut = useMemo(() => new THREE.Vector3(), []);
  const shardQuats = useMemo(
    () => Array.from({ length: 46 }, () => new THREE.Quaternion()),
    [],
  );
  const shardOffsets = useMemo(
    () => Array.from({ length: 46 }, () => new THREE.Vector3()),
    [],
  );

  const whiteColorObj = useMemo(() => new THREE.Color("#ffffff"), []);
  const spicyFlushTintObj = useMemo(() => new THREE.Color("#ef4444"), []);
  const currentTintObj = useMemo(() => new THREE.Color("#ffffff"), []);

  /**
   * 패턴별 실제 3D 입체 물성 변형:
   * - noodle(면): 각 3D 면발 가닥(groupId)이 개별 위상차를 두고 가닥가닥 따로 분리되며 출렁이고 늘어남!
   * - meat(육질): 당기거나 누르면 3D 근섬유 다발(groupId)들이 고기 결을 따라 양옆으로 쩍 벌어지며 찢어지는 탄성!
   * - rice(밥): 입체 밥알 군집(groupId)들이 찰기 있게 뭉쳐 따라오면서 알알이 들썩거림!
   * - bread(빵): 쿠프(칼집) 홈이 넓게 벌어지며 폭신한 메모리폼처럼 깊게 눌렸다 천천히 부풀어 오름!
   */
  const deformCardPoint = useCallback(
    (
      bx: number,
      by: number,
      bz: number,
      groupId: number,
      time: number,
      activeLevel: number,
      out: THREE.Vector3,
    ) => {
      let x = bx;
      let y = by;
      let z = bz;

      const rLen = Math.sqrt(x * x + y * y + z * z) || 1;
      const rx = x / rLen;
      const ry = y / rLen;
      const rz = z / rLen;

      const dx = x - viscousHit.current.x;
      const dy = y - viscousHit.current.y;
      const dz = z - viscousHit.current.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const inf = Math.max(0, 1 - dist / 1.38);
      const smoothInf = inf * inf * (3 - 2 * inf);

      const effectiveSquish = config.squish * (1 - config.hardness * 0.55);

      if (effectiveSquish > 0) {
        // 빵(bread)은 훨씬 깊고 넓게 폭신하게 눌림
        const depthMult = config.pattern === "bread" ? 0.34 : 0.24;
        const dent =
          smoothInf * pressDepth.current * effectiveSquish * depthMult;
        const bulge =
          Math.sin(inf * Math.PI) *
          (1 - smoothInf) *
          pressDepth.current *
          effectiveSquish *
          0.16;
        const wave =
          Math.sin(dist * 7.5 - time * 14) *
          rippleEnergy.current *
          effectiveSquish *
          0.04;

        z -= Math.sign(bz || 1) * dent;
        x += rx * (bulge + wave);
        y += ry * (bulge + wave);
        z += rz * (bulge + wave);
      }

      // 패턴별 고유 3D 구조 물리 반응!
      if (config.pattern === "noodle") {
        // [3D 면발 물리]: 가닥(groupId)마다 서로 다른 탄성 계수와 출렁임을 가져 당길 때 면발들이 가닥별로 갈라지며 늘어남!
        const strandVariance = 0.65 + ((groupId * 7) % 11) * 0.065;
        const strandPull =
          Math.pow(inf, 1.2) * (0.45 + config.viscosity * 0.9) * strandVariance;
        x += viscousDrag.current.x * strandPull;
        y += viscousDrag.current.y * strandPull;
        z += viscousDrag.current.z * strandPull;

        // 당기거나 만질 때 면발들이 좌우/앞뒤로 풀리며 꿈틀거리는 3D 웨이브
        const slither =
          Math.sin(by * 6.5 - time * 9 + groupId * 1.3) *
          (viscousDrag.current.length() * 0.14 + rippleEnergy.current * 0.06) *
          smoothInf;
        x += slither;
        z += Math.cos(by * 5.5 + groupId) * slither * 0.65;
      } else if (config.pattern === "meat") {
        // [3D 육질 물리]: 당기거나 누를 때 근섬유 다발(groupId)들이 결 수직 방향으로 서로 벌어지며 쫄깃하게 저항함!
        const pull = Math.pow(inf, 1.25) * (0.35 + config.viscosity * 0.8);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;

        const fiberSpread =
          (groupId % 2 === 0 ? 1 : -1) *
          (viscousDrag.current.length() * 0.12 + pressDepth.current * 0.05) *
          smoothInf;
        x += fiberSpread * 0.5;
        y -= fiberSpread * 0.85;
        z += Math.abs(fiberSpread) * 0.4;
      } else if (config.pattern === "rice") {
        // [3D 밥알 군집 물리]: 밥알 그룹(groupId > 0)들이 끈적한 전분 찰기로 뭉쳐 따라오면서 낱알들이 오밀조밀 들썩거림!
        const grainLag = groupId > 0 ? 0.75 + (groupId % 7) * 0.07 : 1.0;
        const pull =
          Math.pow(inf, 1.3) * (0.35 + config.viscosity * 0.85) * grainLag;
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;

        if (groupId > 0) {
          const popOut =
            (rippleEnergy.current * 0.065 +
              viscousDrag.current.length() * 0.08) *
            smoothInf *
            ((groupId % 5) * 0.25);
          x += rx * popOut;
          y += ry * popOut;
          z += Math.sign(bz || 1) * popOut * 1.4;
        }
      } else if (config.pattern === "bread") {
        // [3D 빵 반죽 물리]: 당기거나 누를 때 빵 윗면의 쿠프(칼집)가 옆으로 벌어지며 폭신하게 부풀어 오름!
        const pull = Math.pow(inf, 1.2) * (0.38 + config.viscosity * 0.85);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;

        const puffUp = activeLevel * 0.08 * (1 - (bx * bx + by * by) * 0.35);
        z += Math.sign(bz || 1) * Math.max(0, puffUp);
      } else if (config.viscosity > 0) {
        const pull = Math.pow(inf, 1.25) * (0.35 + config.viscosity * 0.85);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;
      }

      if (config.fluidity > 0.1) {
        const liquidWave =
          Math.sin(bx * 3.8 + time * 4.2) *
          Math.cos(by * 3.2 - time * 3.6) *
          config.fluidity *
          (0.018 + activeLevel * 0.03 + rippleEnergy.current * 0.03);
        z += liquidWave;
        x += rx * liquidWave * 0.5;
        y += ry * liquidWave * 0.5;
      }

      out.set(x, y, z);
    },
    [
      config.squish,
      config.hardness,
      config.viscosity,
      config.fluidity,
      config.pattern,
    ],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();
    const isInteracting = interactionMode.current === "interact";
    const activeLevel = Math.max(value / 100, touchHeat.current);

    // 빵(bread)은 메모리폼 반죽처럼 천천히 폭신하게 복원되고, 육질(meat)은 탱글하게 복원됨
    const baseRestore =
      config.pattern === "bread"
        ? 1.8
        : THREE.MathUtils.lerp(10.0, 1.8, config.viscosity);
    const followSpeed = THREE.MathUtils.lerp(15.0, 4.5, config.viscosity);

    viscousHit.current.lerp(targetHit.current, dt * followSpeed);
    if (isInteracting) {
      viscousDrag.current.lerp(targetDrag.current, dt * followSpeed);
      pressDepth.current = THREE.MathUtils.lerp(
        pressDepth.current,
        1.0,
        dt * 10,
      );
    } else {
      viscousDrag.current.lerp(new THREE.Vector3(0, 0, 0), dt * baseRestore);
      pressDepth.current = THREE.MathUtils.lerp(
        pressDepth.current,
        0.0,
        dt * baseRestore,
      );
      touchHeat.current = THREE.MathUtils.lerp(touchHeat.current, 0, dt * 0.35);
    }
    rippleEnergy.current = THREE.MathUtils.lerp(
      rippleEnergy.current,
      0,
      dt * 4.2,
    );

    currentRotation.current.x = THREE.MathUtils.lerp(
      currentRotation.current.x,
      targetRotation.current.x,
      dt * 12,
    );
    currentRotation.current.y = THREE.MathUtils.lerp(
      currentRotation.current.y,
      targetRotation.current.y,
      dt * 12,
    );

    if (groupRef.current) {
      const scaleVal =
        1 +
        config.inflate * activeLevel * 0.14 +
        rippleEnergy.current * config.squish * 0.04;
      groupRef.current.scale.lerp(
        new THREE.Vector3(scaleVal, scaleVal, scaleVal),
        dt * 8,
      );

      const shakeAmt =
        config.shake * (activeLevel * 0.032 + rippleEnergy.current * 0.055);
      groupRef.current.position.set(
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt,
        0,
      );

      groupRef.current.rotation.x = currentRotation.current.x;
      groupRef.current.rotation.y = currentRotation.current.y;
    }

    if (config.redness > 0.1) {
      const flushMix = Math.min(
        0.65,
        config.redness * touchHeat.current * 0.65,
      );
      currentTintObj.copy(whiteColorObj).lerp(spicyFlushTintObj, flushMix);
      if (outerMatRef.current) {
        outerMatRef.current.color.copy(currentTintObj);
      } else if (innerMatRef.current) {
        innerMatRef.current.color.copy(currentTintObj);
      }
    }

    // [1겹] 실제 3D 입체 지오메트리(면발 다발 / 밥알 군집 / 근섬유 육질 / 폭신한 빵) 정점 업데이트
    if (innerFleshRef.current) {
      const posAttr = innerGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        deformCardPoint(
          innerBasePos[idx],
          innerBasePos[idx + 1],
          innerBasePos[idx + 2],
          innerGroupIds[i],
          time,
          activeLevel,
          tempOut,
        );
        arr[idx] = tempOut.x;
        arr[idx + 1] = tempOut.y;
        arr[idx + 2] = tempOut.z;
      }
      posAttr.needsUpdate = true;
      innerGeo.computeVertexNormals();
    }

    // [2겹] 바깥 딱딱한 껍질 강체 조각 업데이트
    if (outerCrustRef.current && crustData) {
      const posAttr = crustData.geometry.attributes
        .position as THREE.BufferAttribute;
      const normAttr = crustData.geometry.attributes
        .normal as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const normArr = normAttr.array as Float32Array;
      const base = crustData.basePositions;
      const baseNorm = crustData.baseNormals;
      const vShardIds = crustData.vertexShardIds;

      for (let sIdx = 0; sIdx < crustData.shardCount; sIdx++) {
        const center = crustData.shardCenters[sIdx];
        const outDir = crustData.shardOutDirs[sIdx];
        const rotAxis = crustData.shardRotAxes[sIdx];
        const liftScale = crustData.shardLiftScale[sIdx];

        let localDamage = activeLevel * 0.55;
        for (let h = 0; h < hitHistory.current.length; h++) {
          const hit = hitHistory.current[h];
          const d = center.distanceTo(hit.pos);
          if (d < 1.1) {
            localDamage += (1 - d / 1.1) * hit.power * 0.55;
          }
        }
        const fracture = Math.min(1.35, localDamage * config.crack) * liftScale;

        const distToHit = center.distanceTo(viscousHit.current);
        const inf = Math.max(0, 1 - distToHit / 1.25);
        const smoothInf = inf * inf * (3 - 2 * inf);

        const rigidDent =
          smoothInf * pressDepth.current * (1 - config.hardness * 0.6) * 0.12;
        const rigidPull =
          Math.pow(inf, 1.35) * (0.28 + config.viscosity * 0.65);

        const outwardLift =
          fracture * (0.14 + rippleEnergy.current * 0.05) -
          rigidDent +
          viscousDrag.current.length() * smoothInf * 0.1;

        shardOffsets[sIdx]
          .copy(outDir)
          .multiplyScalar(outwardLift)
          .addScaledVector(viscousDrag.current, rigidPull);

        const tiltAngle =
          fracture * 0.38 + smoothInf * pressDepth.current * 0.12;
        shardQuats[sIdx].setFromAxisAngle(rotAxis, tiltAngle);
      }

      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        const sId = vShardIds[i];
        const center = crustData.shardCenters[sId];
        const quat = shardQuats[sId];
        const offset = shardOffsets[sId];

        tempOut.set(
          base[idx] - center.x,
          base[idx + 1] - center.y,
          base[idx + 2] - center.z,
        );
        tempOut.applyQuaternion(quat);

        arr[idx] = center.x + tempOut.x + offset.x;
        arr[idx + 1] = center.y + tempOut.y + offset.y;
        arr[idx + 2] = center.z + tempOut.z + offset.z;

        tempOut.set(baseNorm[idx], baseNorm[idx + 1], baseNorm[idx + 2]);
        tempOut.applyQuaternion(quat);
        normArr[idx] = tempOut.x;
        normArr[idx + 1] = tempOut.y;
        normArr[idx + 2] = tempOut.z;
      }

      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;
    }

    // 파편 / 튀는 밥알 파티클 업데이트
    if (shardsRef.current) {
      shardParticles.forEach((p, idx) => {
        if (p.life > 0.01) {
          p.pos.add(p.vel);
          p.vel.y -= dt * 0.35;
          p.rot.x += p.rotVel.x;
          p.rot.y += p.rotVel.y;
          p.rot.z += p.rotVel.z;
          p.life = THREE.MathUtils.lerp(p.life, 0, dt * 3.2);
        } else {
          p.life = 0;
        }
        dummy.position.copy(p.pos);
        dummy.rotation.copy(p.rot);
        dummy.scale.copy(p.scale).multiplyScalar(p.life);
        dummy.updateMatrix();
        shardsRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      shardsRef.current.instanceMatrix.needsUpdate = true;
    }

    // 수증기/김(Wispy Steam) 업데이트
    if (steamRef.current && config.steam > 0.05) {
      steamParticles.forEach((sp, idx) => {
        const cycle = (time * sp.speed + sp.phase) % 1;
        const yPos = -CARD_HEIGHT * 0.25 + cycle * (CARD_HEIGHT * 0.95);
        const xSway =
          sp.baseX +
          Math.sin(time * 1.6 + sp.phase + cycle * 3) *
            sp.swayAmp *
            (0.4 + cycle);
        const zPos = sp.baseZ + Math.cos(time * 1.2 + sp.phase) * 0.08;

        const fade = Math.sin(cycle * Math.PI);
        const sx =
          sp.width *
          (0.7 + cycle * 1.1) *
          fade *
          config.steam *
          (0.9 + touchHeat.current * 0.4);
        const sy =
          sp.height *
          (0.9 + cycle * 1.6) *
          fade *
          config.steam *
          (0.9 + touchHeat.current * 0.4);

        dummy.position.set(xSway, yPos, zPos);
        dummy.rotation.set(
          -currentRotation.current.x,
          -currentRotation.current.y,
          Math.sin(time * 0.8 + sp.phase) * 0.35,
        );
        dummy.scale.set(sx, sy, 1);
        dummy.updateMatrix();
        steamRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      steamRef.current.instanceMatrix.needsUpdate = true;
    }

    // 끓는 기포(Boiling Bubbles) 업데이트
    if (bubblesRef.current && config.boil > 0.05) {
      const speedMult = 1 + touchHeat.current * 1.2 + rippleEnergy.current;
      bubbleParticles.forEach((bp, idx) => {
        const cycle = (time * bp.speed * speedMult + bp.phase) % 1;
        const yPos = -CARD_HEIGHT * 0.42 + cycle * (CARD_HEIGHT * 0.84);
        const xJitter = bp.pos.x + Math.sin(time * 8 + bp.phase) * 0.035;
        const popScale =
          cycle < 0.88
            ? (cycle / 0.88) * bp.maxScale * config.boil
            : ((1 - cycle) / 0.12) * bp.maxScale * 1.4 * config.boil;

        dummy.position.set(xJitter, yPos, bp.pos.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(popScale);
        dummy.updateMatrix();
        bubblesRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      bubblesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const innerColorMap = hasCrust
    ? (innerFleshAtlas?.colorMap ?? null)
    : (surfaceAtlas?.colorMap ?? null);
  const innerBumpMap = hasCrust
    ? (innerFleshAtlas?.bumpMap ?? null)
    : (surfaceAtlas?.bumpMap ?? null);

  return (
    <>
      <mesh position={[0, 0, -2]} onPointerDown={handleBackgroundPointerDown}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} onPointerDown={handleModelPointerDown}>
        {/* 1겹: 3D 입체 구조 본체 (3D 면발 다발 / 3D 밥알 군집 / 3D 근섬유 육질 / 3D 쿠프 식빵 / 속살) */}
        <mesh ref={innerFleshRef} geometry={innerGeo} castShadow receiveShadow>
          <meshPhysicalMaterial
            ref={innerMatRef}
            color="#ffffff"
            map={innerColorMap}
            bumpMap={innerBumpMap}
            bumpScale={0.04}
            emissive={
              config.redness > 0.4
                ? "#dc2626"
                : hasCrust
                  ? config.crackColor
                  : "#000000"
            }
            emissiveIntensity={
              config.redness > 0.4 ? config.redness * 0.2 : hasCrust ? 0.15 : 0
            }
            roughness={hasCrust ? 0.16 : config.roughness}
            metalness={0.04}
            clearcoat={hasCrust ? 0.95 : config.glossiness}
            clearcoatRoughness={0.06}
            ior={1.45}
          />
        </mesh>

        {/* 2겹: 바삭한 겉껍질 조각 메쉬 */}
        {crustData && (
          <mesh
            ref={outerCrustRef}
            geometry={crustData.geometry}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              ref={outerMatRef}
              color="#ffffff"
              map={surfaceAtlas?.colorMap ?? null}
              bumpMap={surfaceAtlas?.bumpMap ?? null}
              bumpScale={0.05}
              roughness={config.roughness}
              metalness={0.05}
              clearcoat={config.glossiness}
              clearcoatRoughness={Math.max(0.05, config.roughness * 0.4)}
              ior={1.45}
            />
          </mesh>
        )}

        {/* 튀어나가는 파편 / 입체 쌀알 파티클 */}
        <instancedMesh
          ref={shardsRef}
          args={[undefined, undefined, shardParticles.length]}
        >
          {config.pattern === "rice" ? (
            <sphereGeometry args={[1, 10, 8]} />
          ) : (
            <dodecahedronGeometry args={[0.3, 0]} />
          )}
          <meshPhysicalMaterial
            color={config.baseColor}
            roughness={config.roughness}
            clearcoat={config.glossiness}
            flatShading={config.pattern !== "rice"}
          />
        </instancedMesh>

        {/* 수증기/김(Wispy Steam) 파티클 */}
        {config.steam > 0.05 && wispySteamTex && (
          <instancedMesh
            ref={steamRef}
            args={[undefined, undefined, steamParticles.length]}
            renderOrder={12}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={wispySteamTex}
              transparent
              opacity={0.75}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </instancedMesh>
        )}

        {/* 끓는 국물/소스 기포(Boiling Bubbles) 파티클 */}
        {config.boil > 0.05 && (
          <instancedMesh
            ref={bubblesRef}
            args={[undefined, undefined, bubbleParticles.length]}
          >
            <sphereGeometry args={[1, 14, 14]} />
            <meshPhysicalMaterial
              color={config.crackColor}
              transparent
              opacity={0.65}
              roughness={0.05}
              clearcoat={1}
              ior={1.4}
            />
          </instancedMesh>
        )}
      </group>
    </>
  );
}

export interface SensoryCanvasCardProps {
  food?: Food;
  preset?: SensoryPresetType;
  customConfig?: Partial<SensoryPhysicsProps>;
  showInfo?: boolean;
  value: number;
  onChange: (newValue: number) => void;
}

export default function SensoryObject({
  food,
  preset = "crispy",
  customConfig,
  showInfo = true,
  value,
  onChange,
}: SensoryCanvasCardProps) {
  const [randomSeed, setRandomSeed] = useState(1);

  useEffect(() => {
    setRandomSeed(Math.random() * 100 + 1);
  }, [food?.id, preset]);

  const mergedConfig: Required<SensoryPhysicsProps> = useMemo(() => {
    const base = food
      ? derivePhysicsFromFood(food)
      : SENSORY_PRESETS[preset].config;
    return { ...base, ...customConfig };
  }, [food, preset, customConfig]);

  const handleInteract = useCallback(
    (delta: number) => {
      onChange(Math.min(100, Math.round(value + delta)));
    },
    [value, onChange],
  );

  return (
    <div className="relative w-full h-full select-none touch-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.65], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1.35} castShadow />
        <pointLight
          position={[-4, -3, 3]}
          intensity={0.8}
          color={mergedConfig.crackColor}
        />

        <SensoryCard3D
          config={mergedConfig}
          food={food}
          presetLabel={SENSORY_PRESETS[preset].label}
          showInfo={showInfo}
          value={value}
          randomSeed={randomSeed}
          onInteract={handleInteract}
        />
      </Canvas>
    </div>
  );
}
