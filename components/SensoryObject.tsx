"use client";

import React, {
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useState,
} from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Food, Tag } from "@/app/food-card/taste";

// 음식 스탯 기반 3D 카드 물리·시각 속성 인터페이스
export interface SensoryPhysicsProps {
  baseColor?: string;       // 카드 겉면(또는 본체) 색상
  crackColor?: string;      // 안쪽 속살 색상
  squish?: number;          // 0 ~ 1: 말랑거림 (누를 때 움푹 들어가는 정도)
  hardness?: number;        // 0 ~ 1: 단단함 (높을수록 덜 눌리고 단단히 버팀)
  viscosity?: number;       // 0 ~ 1: 점성/질김 (높을수록 치즈/떡처럼 끈적하게 늘어남)
  maxStretch?: number;      // 0.3 ~ 2.0: 최대로 잡아당길 수 있는 거리
  crack?: number;           // 0 ~ 1: 딱딱한 겉껍질 생성 및 파쇄 정도 (바삭함)
  shake?: number;           // 0 ~ 1: 진동 강도 (매운맛)
  fluidity?: number;        // 0 ~ 1: 묽기/출렁거림 (국물)
  inflate?: number;         // 0 ~ 1: 부풀어 오르는 정도 (든든함/기름짐)
  steam?: number;           // 0 ~ 1: 김/연기가 모락모락 올라오는 정도 (뜨거움)
  boil?: number;            // 0 ~ 1: 보글보글 기포가 끓어오르는 정도 (국물+뜨거움)
  redness?: number;         // 0 ~ 1: 매운 열기로 더 빨개지는 정도
  roughness?: number;       // 0 ~ 1: 표면 거칠기
  glossiness?: number;      // 0 ~ 1: 유광 코팅(Clearcoat) 강도
}

export type SensoryPresetType =
  | "crispy"
  | "spicy"
  | "hot"
  | "soup"
  | "hearty"
  | "chewy";

// 기본 프리셋 (food prop이 없을 때의 폴백용)
export const SENSORY_PRESETS: Record<
  SensoryPresetType,
  { label: string; desc: string; config: Required<SensoryPhysicsProps> }
> = {
  crispy: {
    label: "바삭함",
    desc: "딱딱한 3D 카드를 연타해 껍질을 깨뜨려보세요!",
    config: {
      baseColor: "#eab308",
      crackColor: "#fef3c7",
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
      roughness: 0.35,
      glossiness: 0.65,
    },
  },
  spicy: {
    label: "매움",
    desc: "매운 진동과 열기가 느껴지는 3D 카드입니다!",
    config: {
      baseColor: "#dc2626",
      crackColor: "#fde047",
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
    desc: "모락모락 김이 피어오르는 뜨거운 3D 카드입니다!",
    config: {
      baseColor: "#ea580c",
      crackColor: "#fef08a",
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
    desc: "누를수록 묵직하게 부풀어 오르는 3D 카드입니다!",
    config: {
      baseColor: "#d97706",
      crackColor: "#fef3c7",
      squish: 0.7,
      hardness: 0.45,
      viscosity: 0.75,
      maxStretch: 1.35,
      crack: 0.35,
      shake: 0.1,
      fluidity: 0.1,
      inflate: 0.9,
      steam: 0.6,
      boil: 0.0,
      redness: 0.2,
      roughness: 0.4,
      glossiness: 0.55,
    },
  },
  chewy: {
    label: "질김 / 쫀득함",
    desc: "잡아당기면 치즈처럼 끝까지 늘어나는 3D 카드입니다!",
    config: {
      baseColor: "#a855f7",
      crackColor: "#f3e8ff",
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

/**
 * 음식(Food)의 6대 스탯(매운맛, 단맛, 짠맛, 기름짐, 국물, 바삭함)을 분석하여
 * 색상(빨개짐), 껍질 유무/단단함, 늘어나는 길이(질김), 진동, 묽기/출렁임, 연기(김), 끓는 기포 효과를 자동 합성합니다.
 */
export function derivePhysicsFromFood(food: Food): Required<SensoryPhysicsProps> {
  const t = food.tags;
  const spicy = t["매운맛"] ?? 0;
  const sweet = t["단맛"] ?? 0;
  const salty = t["짠맛"] ?? 0;
  const oily = t["기름짐"] ?? 0;
  const soupy = t["국물"] ?? 0;
  const crispy = t["바삭함"] ?? 0;

  const isCold = COLD_FOOD_NAMES.has(food.name);

  // 1) 음식 스탯 조합에 따른 기본 컬러 및 속살 컬러 계산 (매울수록 더 빨개짐)
  const baseCol = new THREE.Color("#f5d0a9"); // 기본 따뜻한 미색/베이지 반죽 톤
  const spicyCol = new THREE.Color("#dc2626"); // 강렬한 매운 레드
  const extremeSpicyCol = new THREE.Color("#991b1b"); // 마라/불닭 딥 크림슨
  const crispyCol = new THREE.Color("#eab308"); // 황금빛 튀김/바삭 톤
  const oilyCol = new THREE.Color("#d97706"); // 노릇한 기름짐/구이 톤
  const soupyCol = isCold
    ? new THREE.Color("#38bdf8") // 냉면 등 차가운 육수 톤
    : new THREE.Color("#ea580c"); // 따뜻한 국물/전골 톤
  const sweetCol = new THREE.Color("#f472b6"); // 달콤한 핑크/카라멜 톤
  const freshCol = new THREE.Color("#22c55e"); // 샐러드 등 신선한 그린 톤

  if (food.name === "샐러드") {
    baseCol.lerp(freshCol, 0.75);
  } else if (food.name === "짜장면") {
    baseCol.set("#451a03"); // 춘장 다크 브라운
  } else {
    baseCol.lerp(oilyCol, oily * 0.55);
    baseCol.lerp(crispyCol, crispy * 0.7);
    baseCol.lerp(soupyCol, soupy * 0.45);
    baseCol.lerp(sweetCol, sweet * 0.25);
    // 매운맛 수치에 따라 확실하게 빨개지도록 적용
    if (spicy > 0) {
      baseCol.lerp(spicyCol, Math.min(1, spicy * 0.95));
      if (spicy > 0.7) {
        baseCol.lerp(extremeSpicyCol, (spicy - 0.7) * 1.5);
      }
    }
  }

  // 속살 색상 (갈라졌을 때 안쪽 색상: 매울수록 용암빛 노랑/주황, 바삭할수록 하얀/크림 속살)
  const innerCol = new THREE.Color("#fffbeb");
  if (spicy >= 0.5) {
    innerCol.set("#fde047").lerp(new THREE.Color("#fb923c"), spicy * 0.6);
  } else if (crispy >= 0.4) {
    innerCol.set("#fef3c7");
  } else {
    innerCol.copy(baseCol).lerp(new THREE.Color("#ffffff"), 0.45);
  }

  // 2) 물리 파라미터 계산
  // 바삭함이 있으면 딱딱한 겉껍질 생성 (바삭할수록 단단하고 잘 깨짐)
  const crack = crispy >= 0.15 ? Math.min(1, 0.35 + crispy * 0.65) : 0;
  const hardness = THREE.MathUtils.clamp(
    crispy * 0.75 + (1 - soupy) * 0.15,
    0.08,
    0.92,
  );

  // 말랑함 & 묽기(출렁임)
  const fluidity = THREE.MathUtils.clamp(soupy * 0.95, 0, 1);
  const squish = THREE.MathUtils.clamp(
    0.45 + soupy * 0.4 + sweet * 0.25 - crispy * 0.35,
    0.22,
    1.0,
  );

  // 질김 / 점성 & 최대로 당길 수 있는 길이 (떡볶이, 피자, 짜장면, 면류 등은 길게 늘어남)
  const chewinessFactor = THREE.MathUtils.clamp(
    oily * 0.45 + sweet * 0.4 + salty * 0.3 - soupy * 0.25,
    0.15,
    0.98,
  );
  const maxStretch = THREE.MathUtils.lerp(
    0.65,
    1.95,
    THREE.MathUtils.clamp(chewinessFactor + (1 - hardness) * 0.3, 0, 1),
  );

  // 진동 (매울수록 강하게 떨림)
  const shake = THREE.MathUtils.clamp(spicy * 1.1, 0, 1);

  // 뜨거움 연기(Steam) & 끓는 기포(Boil)
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
    squish,
    hardness,
    viscosity: chewinessFactor,
    maxStretch,
    crack,
    shake,
    fluidity,
    inflate: THREE.MathUtils.clamp(oily * 0.55 + salty * 0.25, 0.08, 0.85),
    steam: heatLevel,
    boil: boilLevel,
    redness: spicy,
    roughness: THREE.MathUtils.clamp(
      0.06 + crispy * 0.38 - soupy * 0.15 - oily * 0.1,
      0.03,
      0.55,
    ),
    glossiness: THREE.MathUtils.clamp(
      0.55 + soupy * 0.45 + oily * 0.35 + sweet * 0.2 - crispy * 0.2,
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
      // 바삭한 껍질 타격음
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
      // 국물/보글거리는 물방울 소리
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
      // 말랑/쫀득 슬라임 소리
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

// 3:4 세로형 카드 비율 직육면체 상수 (오직 카드 비율 직육면체만 사용!)
const CARD_WIDTH = 1.62;
const CARD_HEIGHT = 2.16;
const CARD_DEPTH = 0.28;
const CARD_BEVEL = 0.075;

/**
 * 3:4 카드 비율의 고밀도 직육면체 생성 (모서리 용접 + 베벨링으로 절대 면이 분리되지 않음)
 */
function createWeldedCardGeometry(detailScale = 1.5): THREE.BufferGeometry {
  const sx = Math.round(22 * detailScale);
  const sy = Math.round(28 * detailScale);
  const sz = Math.round(6 * detailScale);
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
  const bevel = CARD_BEVEL;
  const innerW = halfW - bevel;
  const innerH = halfH - bevel;
  const innerD = Math.max(0.02, halfD - bevel);

  const nonIndexed = rawBox.index ? rawBox.toNonIndexed() : rawBox;
  const posAttr = nonIndexed.attributes.position;
  const vertexMap = new Map<string, number>();
  const uniquePos: number[] = [];
  const indices: number[] = [];
  const temp = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    temp.fromBufferAttribute(posAttr, i);
    const key = `${Math.round(temp.x * 1000)}_${Math.round(temp.y * 1000)}_${Math.round(temp.z * 1000)}`;
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
      if (len > 1e-5) {
        uniquePos.push(
          cx + (dx / len) * bevel,
          cy + (dy / len) * bevel,
          cz + (dz / len) * bevel,
        );
      } else {
        uniquePos.push(temp.x, temp.y, temp.z);
      }
    }
    indices.push(idx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(uniquePos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
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

/**
 * 3D 카드 직육면체 전용 딱딱한 바깥 껍질(Rigid Outer Crust) 생성
 */
function buildRigidCardCrust(randomSeed: number): RigidCrustData {
  const baseGeo = createWeldedCardGeometry(1.2);
  const posAttr = baseGeo.attributes.position;
  const indexAttr = baseGeo.index!;

  let s = Math.floor(randomSeed * 1000) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  // 카드 비율에 맞춘 46개의 촘촘한 보로노이 강체 조각 시드 생성
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
  const shardIds: number[] = [];
  const shellThickness = 0.045;

  const pushTriangle = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    shardId: number,
  ) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
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
          pushTriangle(poly[0], poly[p], poly[p + 1], myIdx);
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
          pushTriangle(poly[p], innerPoly[p], poly[nextP], myIdx);
          pushTriangle(poly[nextP], innerPoly[p], innerPoly[nextP], myIdx);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(positions);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
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
  value: number;
  randomSeed: number;
  onInteract: (delta: number) => void;
}

const STAT_BADGE_COLORS: Record<Tag, string> = {
  매운맛: "bg-red-500/90 text-white",
  단맛: "bg-pink-500/90 text-white",
  짠맛: "bg-amber-500/90 text-white",
  기름짐: "bg-yellow-500/90 text-black",
  국물: "bg-sky-500/90 text-white",
  바삭함: "bg-orange-500/90 text-white",
};

function SensoryCard3D({
  config,
  food,
  value,
  randomSeed,
  onInteract,
}: InternalCardProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const textOverlayGroupRef = useRef<THREE.Group>(null);
  const innerFleshRef = useRef<THREE.Mesh>(null);
  const innerMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const outerCrustRef = useRef<THREE.Mesh>(null);
  const outerMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const steamRef = useRef<THREE.InstancedMesh>(null);
  const bubblesRef = useRef<THREE.InstancedMesh>(null);

  const interactionMode = useRef<"none" | "interact" | "rotate">("none");

  // 수동 회전 상태 (정면에서 살짝 입체감이 보이는 카드 각도, 자동 회전 없음)
  const targetRotation = useRef({ x: 0.08, y: -0.16 });
  const currentRotation = useRef({ x: 0.08, y: -0.16 });
  const prevPointerScreen = useRef({ x: 0, y: 0 });

  // 드래그 끊김 방지용 가상 평면 & 레이캐스터
  const dragPlane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());
  const pointerNDC = useRef(new THREE.Vector2());
  const planeIntersect = useRef(new THREE.Vector3());

  // 점성 및 눌림 물리 상태
  const targetHit = useRef(new THREE.Vector3(0, 0, CARD_DEPTH / 2));
  const viscousHit = useRef(new THREE.Vector3(0, 0, CARD_DEPTH / 2));
  const targetDrag = useRef(new THREE.Vector3(0, 0, 0));
  const viscousDrag = useRef(new THREE.Vector3(0, 0, 0));
  const pressDepth = useRef(0);
  const rippleEnergy = useRef(0);
  const touchHeat = useRef(0); // 만질수록 더 빨개지고 뜨거워지는 누적 열기

  const hitHistory = useRef<Array<{ pos: THREE.Vector3; power: number }>>([]);

  // 음식이 바뀌거나 초기화되면 타격 기록 및 열기 리셋
  useEffect(() => {
    hitHistory.current = [];
    touchHeat.current = 0;
    targetRotation.current = { x: 0.08, y: -0.16 };
  }, [food?.id, randomSeed]);

  // 1겹: 안쪽 속살(또는 단일 본체) 3D 카드 메쉬
  const { innerGeo, innerBasePos } = useMemo(() => {
    const geo = createWeldedCardGeometry(1.65);
    const posAttr = geo.attributes.position;
    const hasCrust = config.crack > 0.05;
    const scaleXY = hasCrust ? 0.96 : 1.0;
    const scaleZ = hasCrust ? 0.88 : 1.0;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) * scaleXY,
        posAttr.getY(i) * scaleXY,
        posAttr.getZ(i) * scaleZ,
      );
    }
    geo.computeVertexNormals();
    return {
      innerGeo: geo,
      innerBasePos: new Float32Array(posAttr.array),
    };
  }, [config.crack]);

  // 2겹: 딱딱한 바깥 껍질(Rigid Crust) 3D 카드 메쉬
  const crustData = useMemo(() => {
    if (config.crack <= 0.05) return null;
    return buildRigidCardCrust(randomSeed);
  }, [config.crack, randomSeed]);

  // 파편 파티클 풀 (바삭한 껍질 파편)
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

  // 연기/김(Steam) 파티클 풀 (뜨거운 음식에서 모락모락 피어오름)
  const steamParticles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * (CARD_WIDTH * 0.75),
        (Math.random() - 0.3) * (CARD_HEIGHT * 0.7),
        CARD_DEPTH * 0.55 + Math.random() * 0.15,
      ),
      phase: (i / 18) * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.3,
      sway: 0.2 + Math.random() * 0.3,
      size: 0.14 + Math.random() * 0.16,
    }));
  }, []);

  // 끓는 기포(Boiling Bubbles) 파티클 풀 (국물/찌개/마라탕 등에서 보글보글 끓어오름)
  const bubbleParticles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * (CARD_WIDTH * 0.8),
        (Math.random() - 0.5) * (CARD_HEIGHT * 0.8),
        CARD_DEPTH * 0.52,
      ),
      phase: (i / 24) * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.5,
      maxScale: 0.045 + Math.random() * 0.055,
    }));
  }, []);

  const spawnShards = useCallback(
    (localPt: THREE.Vector3) => {
      if (config.crack <= 0.05) return;
      shardParticles.forEach((p) => {
        if (p.life <= 0.05 && Math.random() < 0.48) {
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
          const s = (0.045 + Math.random() * 0.075) * config.crack;
          p.scale.set(s * 1.1, s * 0.4, s * 0.9);
          p.life = 1.0;
        }
      });
    },
    [config.crack, shardParticles],
  );

  // 3D 카드 본체 클릭 시작
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

      if (config.crack > 0.05) {
        hitHistory.current.push({
          pos: localPt.clone(),
          power: 0.75 + Math.random() * 0.45,
        });
        if (hitHistory.current.length > 16) {
          hitHistory.current.shift();
        }
        spawnShards(localPt);
      }
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

  // 카드 바깥 빈 영역 드래그: 3D 카드 수동 회전
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

        targetRotation.current.y = THREE.MathUtils.clamp(
          targetRotation.current.y + dx * 0.011,
          -Math.PI * 0.42,
          Math.PI * 0.42,
        );
        targetRotation.current.x = THREE.MathUtils.clamp(
          targetRotation.current.x + dy * 0.011,
          -Math.PI * 0.38,
          Math.PI * 0.38,
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
          // 음식의 maxStretch(질김/점성) 스탯에 비례해 더 멀리 당길 수 있도록 허용
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

  const baseColorObj = useMemo(
    () => new THREE.Color(config.baseColor),
    [config.baseColor],
  );
  const spicyFlushColorObj = useMemo(() => new THREE.Color("#b91c1c"), []);
  const currentColorObj = useMemo(() => new THREE.Color(), []);

  // 속살(또는 껍질 없는 카드 본체) 정점 변형 함수
  const deformCardPoint = useCallback(
    (
      bx: number,
      by: number,
      bz: number,
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
      const inf = Math.max(0, 1 - dist / 1.35);
      const smoothInf = inf * inf * (3 - 2 * inf);

      // 단단함(hardness)이 높을수록 적게 눌리고, 말랑함(squish)이 높을수록 깊게 눌림
      const effectiveSquish = config.squish * (1 - config.hardness * 0.55);

      if (effectiveSquish > 0) {
        const dent = smoothInf * pressDepth.current * effectiveSquish * 0.24;
        const bulge =
          Math.sin(inf * Math.PI) *
          (1 - smoothInf) *
          pressDepth.current *
          effectiveSquish *
          0.14;
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

      // 질김/점성(viscosity)에 비례해 당기는 방향으로 쭉 늘어남
      if (config.viscosity > 0) {
        const pull = Math.pow(inf, 1.25) * (0.35 + config.viscosity * 0.85);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;
      }

      // 묽기/국물(fluidity)이 높으면 카드 표면이 찰랑찰랑 물결침
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
    [config.squish, config.hardness, config.viscosity, config.fluidity],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();
    const isInteracting = interactionMode.current === "interact";
    const activeLevel = Math.max(value / 100, touchHeat.current);

    const restoreSpeed = THREE.MathUtils.lerp(10.0, 1.6, config.viscosity);
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
      viscousDrag.current.lerp(new THREE.Vector3(0, 0, 0), dt * restoreSpeed);
      pressDepth.current = THREE.MathUtils.lerp(
        pressDepth.current,
        0.0,
        dt * restoreSpeed,
      );
      touchHeat.current = THREE.MathUtils.lerp(
        touchHeat.current,
        0,
        dt * 0.35,
      );
    }
    rippleEnergy.current = THREE.MathUtils.lerp(
      rippleEnergy.current,
      0,
      dt * 4.2,
    );

    // 수동 회전 보간
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

      // 매운맛(shake) 스탯에 비례해 건드릴수록 부르르 떨리는 진동 효과
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

    // 3D 카드 위의 음식 이름·스탯 텍스트도 카드가 당겨지거나 눌릴 때 같이 움직이고 기울어지도록 동기화
    if (textOverlayGroupRef.current) {
      const dragX = viscousDrag.current.x * 0.45;
      const dragY = viscousDrag.current.y * 0.45;
      const dragZ =
        CARD_DEPTH * 0.56 -
        pressDepth.current * config.squish * 0.08 +
        viscousDrag.current.z * 0.35;

      textOverlayGroupRef.current.position.set(dragX, dragY, dragZ);
      textOverlayGroupRef.current.rotation.set(
        -viscousDrag.current.y * 0.18,
        viscousDrag.current.x * 0.18,
        -viscousDrag.current.x * 0.08,
      );
    }

    // 매운 음식(redness)은 만질수록 더 붉게 달아오름
    if (config.redness > 0.1) {
      const flushMix = Math.min(
        1,
        config.redness * (0.25 + touchHeat.current * 0.75),
      );
      currentColorObj.copy(baseColorObj).lerp(spicyFlushColorObj, flushMix);
      if (outerMatRef.current) {
        outerMatRef.current.color.copy(currentColorObj);
      } else if (innerMatRef.current) {
        innerMatRef.current.color.copy(currentColorObj);
      }
    }

    // [1겹] 안쪽 속살(또는 단일 본체) 정점 업데이트
    if (innerFleshRef.current) {
      const posAttr = innerGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        deformCardPoint(
          innerBasePos[idx],
          innerBasePos[idx + 1],
          innerBasePos[idx + 2],
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

    // [2겹] 바깥 껍질(Rigid Crust): 휘어지지 않는 딱딱한 강체 조각 물리
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
          fracture * (0.13 + rippleEnergy.current * 0.05) -
          rigidDent +
          viscousDrag.current.length() * smoothInf * 0.1;

        shardOffsets[sIdx]
          .copy(outDir)
          .multiplyScalar(outwardLift)
          .addScaledVector(viscousDrag.current, rigidPull);

        const tiltAngle =
          fracture * 0.36 + smoothInf * pressDepth.current * 0.12;
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

    // [파티클 1] 바삭한 파편 업데이트
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

    // [파티클 2] 뜨거운 연기/김(Steam) 업데이트
    if (steamRef.current && config.steam > 0.05) {
      steamParticles.forEach((sp, idx) => {
        const cycle = (time * sp.speed + sp.phase) % 1;
        const yPos = -CARD_HEIGHT * 0.3 + cycle * (CARD_HEIGHT * 0.85);
        const xSway =
          sp.pos.x + Math.sin(time * 2.2 + sp.phase) * sp.sway * 0.25;
        const zPos =
          sp.pos.z + Math.cos(time * 1.8 + sp.phase) * 0.08;
        // 올라갈수록 커지다가 서서히 사라짐
        const alphaScale =
          Math.sin(cycle * Math.PI) *
          sp.size *
          config.steam *
          (0.8 + touchHeat.current * 0.5);

        dummy.position.set(xSway, yPos, zPos);
        dummy.rotation.set(0, 0, time * 0.5 + sp.phase);
        dummy.scale.setScalar(alphaScale);
        dummy.updateMatrix();
        steamRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      steamRef.current.instanceMatrix.needsUpdate = true;
    }

    // [파티클 3] 보글보글 끓는 기포(Boiling Bubbles) 업데이트
    if (bubblesRef.current && config.boil > 0.05) {
      const speedMult = 1 + touchHeat.current * 1.2 + rippleEnergy.current;
      bubbleParticles.forEach((bp, idx) => {
        const cycle = (time * bp.speed * speedMult + bp.phase) % 1;
        const yPos =
          -CARD_HEIGHT * 0.42 + cycle * (CARD_HEIGHT * 0.84);
        const xJitter =
          bp.pos.x + Math.sin(time * 8 + bp.phase) * 0.035;
        // 커지다가 꼭대기에서 톡 터짐
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

  const hasCrust = config.crack > 0.05;
  const innerColor = hasCrust ? config.crackColor : config.baseColor;

  // 표시할 상위 음식 스탯 추출 (값이 0보다 큰 스탯들)
  const foodStats = useMemo(() => {
    if (!food) return [];
    return (Object.entries(food.tags) as Array<[Tag, number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [food]);

  return (
    <>
      {/* 카드 바깥 여백 드래그 시 3D 카드 전체를 회전시키는 배경 플레인 */}
      <mesh position={[0, 0, -2]} onPointerDown={handleBackgroundPointerDown}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} onPointerDown={handleModelPointerDown}>
        {/* 1겹: 안쪽 속살(또는 단일 본체) 3D 카드 메쉬 */}
        <mesh ref={innerFleshRef} geometry={innerGeo} castShadow receiveShadow>
          <meshPhysicalMaterial
            ref={innerMatRef}
            color={innerColor}
            emissive={
              config.redness > 0.4
                ? "#dc2626"
                : hasCrust
                  ? config.crackColor
                  : "#000000"
            }
            emissiveIntensity={
              config.redness > 0.4 ? config.redness * 0.25 : hasCrust ? 0.18 : 0
            }
            roughness={hasCrust ? 0.14 : config.roughness}
            metalness={0.04}
            clearcoat={hasCrust ? 0.95 : config.glossiness}
            clearcoatRoughness={0.06}
            ior={1.45}
          />
        </mesh>

        {/* 2겹: 바삭함이 있는 음식일 때 생성되는 딱딱한 겉껍질 조각 메쉬 */}
        {crustData && (
          <mesh
            ref={outerCrustRef}
            geometry={crustData.geometry}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              ref={outerMatRef}
              color={config.baseColor}
              roughness={config.roughness}
              metalness={0.05}
              clearcoat={config.glossiness}
              clearcoatRoughness={Math.max(0.05, config.roughness * 0.4)}
              ior={1.45}
              flatShading
            />
          </mesh>
        )}

        {/* 3D 카드 표면에 부착되어 카드의 회전·진동·늘어남에 따라 함께 움직이는 음식 이름 & 스탯 UI */}
        {food && (
          <group
            ref={textOverlayGroupRef}
            position={[0, 0, CARD_DEPTH * 0.56]}
          >
            <Html
              transform
              distanceFactor={2.6}
              center
              style={{
                pointerEvents: "none",
                userSelect: "none",
                width: "210px",
              }}
            >
              <div className="flex flex-col justify-between h-[285px] p-3.5 rounded-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                {/* 상단: 음식 이름 */}
                <div className="text-center bg-black/35 backdrop-blur-md rounded-xl py-2 px-3 border border-white/20">
                  <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
                    {food.name}
                  </h2>
                  <p className="text-[10px] text-white/80 mt-0.5 font-medium">
                    카드를 누르거나 당겨 감각을 느껴보세요
                  </p>
                </div>

                {/* 하단: 음식 스탯 게이지 & 뱃지 */}
                <div className="bg-black/45 backdrop-blur-md rounded-xl p-2.5 border border-white/15 flex flex-col gap-1.5">
                  {foodStats.length > 0 ? (
                    foodStats.map(([tag, val]) => {
                      const pct = Math.round(val * 100);
                      return (
                        <div key={tag} className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${STAT_BADGE_COLORS[tag]}`}
                          >
                            {tag}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[10px] w-7 text-right">
                            {pct}%
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs text-white/75">
                      담백한 기본 스탯
                    </p>
                  )}
                </div>
              </div>
            </Html>
          </group>
        )}

        {/* 바삭한 껍질 파편 파티클 */}
        <instancedMesh
          ref={shardsRef}
          args={[undefined, undefined, shardParticles.length]}
        >
          <dodecahedronGeometry args={[0.3, 0]} />
          <meshPhysicalMaterial
            color={config.baseColor}
            roughness={config.roughness}
            clearcoat={config.glossiness}
            flatShading
          />
        </instancedMesh>

        {/* 뜨거운 음식 연기/김(Steam) 3D 파티클 */}
        {config.steam > 0.05 && (
          <instancedMesh
            ref={steamRef}
            args={[undefined, undefined, steamParticles.length]}
          >
            <sphereGeometry args={[1, 12, 12]} />
            <meshPhysicalMaterial
              color="#ffffff"
              transparent
              opacity={0.22}
              roughness={1}
              depthWrite={false}
            />
          </instancedMesh>
        )}

        {/* 끓는 국물/소스 기포(Boiling Bubbles) 3D 파티클 */}
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
  value: number;
  onChange: (newValue: number) => void;
}

export default function SensoryObject({
  food,
  preset = "crispy",
  customConfig,
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
          value={value}
          randomSeed={randomSeed}
          onInteract={handleInteract}
        />
      </Canvas>
    </div>
  );
}
