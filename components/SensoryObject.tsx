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

export interface SensoryPhysicsProps {
  shape?: "box" | "sphere" | "torus";
  baseColor?: string; // 바깥 껍질 색상
  crackColor?: string; // 안쪽 속살 색상
  squish?: number; // 0 ~ 1: 누를 때 말랑하게 들어가는 탄성
  viscosity?: number; // 0 ~ 1: 점성 (높을수록 치즈/슬라임처럼 끈적하게 늘어남)
  crack?: number; // 0 ~ 1: 바깥 껍질이 조각조각 갈라져 속살이 드러나는 정도
  shake?: number; // 0 ~ 1: 진동 강도
  inflate?: number; // 0 ~ 1: 부풀어 오르는 정도
  roughness?: number; // 0 ~ 1: 겉껍질 거칠기
  glossiness?: number; // 0 ~ 1: 광택(Clearcoat) 강도
}

export type SensoryPresetType =
  | "crispy"
  | "spicy"
  | "hot"
  | "soup"
  | "hearty"
  | "chewy";

export const SENSORY_PRESETS: Record<
  SensoryPresetType,
  { label: string; desc: string; config: Required<SensoryPhysicsProps> }
> = {
  crispy: {
    label: "바삭함",
    desc: "연타할수록 바삭한 겉껍질 블록이 조각나며 안쪽 속살이 드러납니다!",
    config: {
      shape: "box", // 각진 직육면체 유지
      baseColor: "#eab308", // 노란 튀김/치즈블록 겉껍질
      crackColor: "#fb7185", // 갈라진 틈으로 보이는 핑크/주황 속살
      squish: 0.25,
      viscosity: 0.15,
      crack: 1.0, // 겉껍질 조각 분리 최대
      shake: 0.25,
      inflate: 0.05,
      roughness: 0.3,
      glossiness: 0.75,
    },
  },
  spicy: {
    label: "매움",
    desc: "꾹 누르고 문질러 붉은 껍질 속 화끈한 매운맛 코어를 깨워보세요!",
    config: {
      shape: "sphere",
      baseColor: "#dc2626",
      crackColor: "#fde047",
      squish: 0.65,
      viscosity: 0.55,
      crack: 0.7,
      shake: 1.0,
      inflate: 0.15,
      roughness: 0.2,
      glossiness: 0.9,
    },
  },
  hot: {
    label: "뜨거움",
    desc: "문질러서 겉껍질 사이로 뜨거운 열기가 올라오게 달궈보세요!",
    config: {
      shape: "box",
      baseColor: "#ea580c",
      crackColor: "#fef08a",
      squish: 0.55,
      viscosity: 0.45,
      crack: 0.5,
      shake: 0.6,
      inflate: 0.3,
      roughness: 0.25,
      glossiness: 0.85,
    },
  },
  soup: {
    label: "국물",
    desc: "껍질 없이 탱글하고 찰랑거리는 물방울을 통통 튕겨보세요!",
    config: {
      shape: "sphere",
      baseColor: "#0ea5e9",
      crackColor: "#e0f2fe",
      squish: 1.0,
      viscosity: 0.3,
      crack: 0.0, // 국물은 껍질 균열 없이 순수 유체 탄성
      shake: 0.2,
      inflate: 0.12,
      roughness: 0.03,
      glossiness: 1.0,
    },
  },
  hearty: {
    label: "든든함",
    desc: "누를수록 묵직한 육면체 반죽이 빵빵하게 부풀어 오릅니다!",
    config: {
      shape: "box", // 묵직한 식빵/두부 같은 육면체
      baseColor: "#d97706",
      crackColor: "#fef3c7",
      squish: 0.75,
      viscosity: 0.75,
      crack: 0.35,
      shake: 0.05,
      inflate: 0.85,
      roughness: 0.4,
      glossiness: 0.55,
    },
  },
  chewy: {
    label: "질김 / 쫀득함",
    desc: "꾹 잡고 사방으로 치즈·슬라임처럼 쫀득하게 늘려보세요!",
    config: {
      shape: "torus",
      baseColor: "#a855f7",
      crackColor: "#f3e8ff",
      squish: 0.9,
      viscosity: 0.96,
      crack: 0.0,
      shake: 0.05,
      inflate: 0.1,
      roughness: 0.06,
      glossiness: 1.0,
    },
  },
};

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

function playSensorySound(crack: number, viscosity: number, intensity: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (crack > 0.4) {
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
        1100 + Math.random() * 850 + intensity * 500,
        now,
      );

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.085);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 160 + (1 - viscosity) * 110 + intensity * 130;
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

/**
 * 직육면체(Box)의 평평한 6면 형태는 그대로 유지하면서,
 * 모서리 정점들을 100% 하나로 용접(Welding)하고 부드러운 베벨(Bevel)을 주는 함수
 */
function createWeldedBaseShape(
  shape: "box" | "sphere" | "torus",
  detailScale = 1,
): THREE.BufferGeometry {
  if (shape === "torus") {
    const radialSegs = Math.round(32 * detailScale);
    const tubularSegs = Math.round(48 * detailScale);
    const R = 0.68;
    const r = 0.28;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j < radialSegs; j++) {
      const v = (j / radialSegs) * Math.PI * 2;
      for (let i = 0; i < tubularSegs; i++) {
        const u = (i / tubularSegs) * Math.PI * 2;
        positions.push(
          (R + r * Math.cos(v)) * Math.cos(u),
          (R + r * Math.cos(v)) * Math.sin(u),
          r * Math.sin(v),
        );
      }
    }
    for (let j = 0; j < radialSegs; j++) {
      const nextJ = (j + 1) % radialSegs;
      for (let i = 0; i < tubularSegs; i++) {
        const nextI = (i + 1) % tubularSegs;
        const a = j * tubularSegs + i;
        const b = nextJ * tubularSegs + i;
        const c = nextJ * tubularSegs + nextI;
        const d = j * tubularSegs + nextI;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  if (shape === "sphere") {
    const subdiv = Math.round(12 * detailScale);
    const raw = new THREE.IcosahedronGeometry(0.92, subdiv);
    return weldAndMapGeometry(raw, (v) => v);
  }

  // shape === 'box': 육면체의 6개 평면과 각진 형태를 100% 유지하되 모서리가 절대 떨어지지 않도록 용접된 Beveled Box 생성
  const sx = Math.round(14 * detailScale);
  const sy = Math.round(10 * detailScale);
  const sz = Math.round(10 * detailScale);
  const rawBox = new THREE.BoxGeometry(1.48, 1.04, 1.04, sx, sy, sz);

  // 내부 코어 박스 밖으로 일정 반경(bevel)만큼 투영하여 평평한 6면 + 매끈한 모서리를 가진 일체형 육면체 완성
  const halfW = 0.74;
  const halfH = 0.52;
  const halfD = 0.52;
  const bevel = 0.11;
  const innerW = halfW - bevel;
  const innerH = halfH - bevel;
  const innerD = halfD - bevel;

  return weldAndMapGeometry(rawBox, (v) => {
    // 정점을 내부 박스에 클램핑한 뒤 차이 벡터를 정규화해 베벨 반경을 더함 (100% 정확한 Rounded Box 공식)
    const cx = THREE.MathUtils.clamp(v.x, -innerW, innerW);
    const cy = THREE.MathUtils.clamp(v.y, -innerH, innerH);
    const cz = THREE.MathUtils.clamp(v.z, -innerD, innerD);
    const dx = v.x - cx;
    const dy = v.y - cy;
    const dz = v.z - cz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 1e-5) {
      return new THREE.Vector3(
        cx + (dx / len) * bevel,
        cy + (dy / len) * bevel,
        cz + (dz / len) * bevel,
      );
    }
    return v;
  });
}

function weldAndMapGeometry(
  raw: THREE.BufferGeometry,
  mapper: (v: THREE.Vector3) => THREE.Vector3,
): THREE.BufferGeometry {
  const nonIndexed = raw.index ? raw.toNonIndexed() : raw;
  const posAttr = nonIndexed.attributes.position;
  const vertexMap = new Map<string, number>();
  const uniquePos: number[] = [];
  const indices: number[] = [];
  const temp = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    temp.fromBufferAttribute(posAttr, i);
    // 용접 키는 변형 전 좌표 기준 (BoxGeometry의 6개 면 모서리에 겹쳐 있는 정점들을 완벽히 하나로 합침)
    const key = `${Math.round(temp.x * 1000)}_${Math.round(temp.y * 1000)}_${Math.round(temp.z * 1000)}`;
    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = uniquePos.length / 3;
      vertexMap.set(key, idx);
      const mapped = mapper(temp);
      uniquePos.push(mapped.x, mapped.y, mapped.z);
    }
    indices.push(idx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(uniquePos, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sutherland-Hodgman 3D 평면 클리핑:
 * 바깥 껍질을 계단 현상 없이 칼같이 직선으로 쪼개어 입체 조각(Voronoi Slab)으로 만듦
 */
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

interface CrustShellData {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  shardCenters: Float32Array;
  shardDirs: Float32Array;
  shardLiftScale: Float32Array;
}

/**
 * 바깥 껍질(Outer Crust) 전용:
 * 기본 도형을 랜덤 3D 보로노이 평면으로 칼같이 절단하고, 두께(Extrusion)를 주어
 * 갈라질 때 입체적인 껍질 단면과 안쪽 속살이 보이도록 생성
 */
function buildFracturedCrustShell(
  shape: "box" | "sphere" | "torus",
  randomSeed: number,
): CrustShellData {
  // 평면 클리핑 속도와 직선 단면을 위해 적당한 밀도의 베이스 메쉬 생성
  const baseGeo = createWeldedBaseShape(shape, 0.75);
  const posAttr = baseGeo.attributes.position;
  const indexAttr = baseGeo.index!;

  // 의사 난수 생성기
  let s = Math.floor(randomSeed * 1000) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  // 랜덤 보로노이 조각 중심점(Seeds) 18개 생성
  const seedCount = 18;
  const seeds = Array.from({ length: seedCount }, () => {
    const dir = new THREE.Vector3(
      rand() - 0.5,
      rand() - 0.5,
      rand() - 0.5,
    ).normalize();
    return {
      pos: dir.clone().multiplyScalar(0.65 + rand() * 0.25),
      outDir: dir.clone(),
      lift: 0.55 + rand() * 0.75,
    };
  });

  const positions: number[] = [];
  const shardCenters: number[] = [];
  const shardDirs: number[] = [];
  const shardLifts: number[] = [];

  const shellThickness = 0.055; // 바깥 껍질의 실제 3D 두께

  const pushVertex = (v: THREE.Vector3, seedIdx: number) => {
    positions.push(v.x, v.y, v.z);
    const sd = seeds[seedIdx];
    shardCenters.push(sd.pos.x, sd.pos.y, sd.pos.z);
    shardDirs.push(sd.outDir.x, sd.outDir.y, sd.outDir.z);
    shardLifts.push(sd.lift);
  };

  const pushTriangle = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    seedIdx: number,
  ) => {
    pushVertex(a, seedIdx);
    pushVertex(b, seedIdx);
    pushVertex(c, seedIdx);
  };

  // 모든 기본 삼각형을 보로노이 수직이등분 평면으로 클리핑하여 계단 현상이 0%인 칼단면 다각형 조각 생성
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

    // 이 삼각형 근처의 상위 4개 시드만 검사 (성능 최적화 및 깔끔한 절단면)
    const sortedSeeds = seeds
      .map((sd, idx) => ({ idx, dist: triCenter.distanceToSquared(sd.pos) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);

    for (let k = 0; k < sortedSeeds.length; k++) {
      const myIdx = sortedSeeds[k].idx;
      const mySeed = seeds[myIdx].pos;
      let poly: THREE.Vector3[] = [v0.clone(), v1.clone(), v2.clone()];

      for (let m = 0; m < sortedSeeds.length; m++) {
        if (k === m) continue;
        const otherSeed = seeds[sortedSeeds[m].idx].pos;
        const planeNormal = new THREE.Vector3().subVectors(otherSeed, mySeed);
        const midPoint = new THREE.Vector3()
          .addVectors(mySeed, otherSeed)
          .multiplyScalar(0.5);
        const planeConst = midPoint.dot(planeNormal);

        poly = clipPolygonByPlane(poly, planeNormal, planeConst);
        if (poly.length < 3) break;
      }

      if (poly.length >= 3) {
        // 1) 바깥 껍질 윗면 (Outer Cap)
        for (let p = 1; p < poly.length - 1; p++) {
          pushTriangle(poly[0], poly[p], poly[p + 1], myIdx);
        }

        // 2) 바깥 껍질의 3D 옆면 두께 단면 (Side Walls: 갈라졌을 때 종이처럼 얇아 보이지 않고 껍질 두께가 보이게 함)
        const innerPoly = poly.map((pt) =>
          pt.clone().multiplyScalar(1 - shellThickness),
        );
        for (let p = 0; p < poly.length; p++) {
          const nextP = (p + 1) % poly.length;
          const oA = poly[p];
          const oB = poly[nextP];
          const iA = innerPoly[p];
          const iB = innerPoly[nextP];

          pushTriangle(oA, iA, oB, myIdx);
          pushTriangle(oB, iA, iB, myIdx);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  const posFloat = new Float32Array(positions);
  geo.setAttribute("position", new THREE.BufferAttribute(posFloat, 3));
  geo.computeVertexNormals();

  return {
    geometry: geo,
    basePositions: new Float32Array(posFloat),
    shardCenters: new Float32Array(shardCenters),
    shardDirs: new Float32Array(shardDirs),
    shardLiftScale: new Float32Array(shardLifts),
  };
}

interface InternalMeshProps {
  config: Required<SensoryPhysicsProps>;
  value: number;
  randomSeed: number;
  onInteract: (delta: number) => void;
}

function DualLayerSensoryMesh({
  config,
  value,
  randomSeed,
  onInteract,
}: InternalMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerFleshRef = useRef<THREE.Mesh>(null);
  const outerCrustRef = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);

  // 인터랙션 및 점성 물리 상태
  const isPressed = useRef(false);
  const targetHit = useRef(new THREE.Vector3(0, 0, 1));
  const viscousHit = useRef(new THREE.Vector3(0, 0, 1));
  const targetDrag = useRef(new THREE.Vector3(0, 0, 0));
  const viscousDrag = useRef(new THREE.Vector3(0, 0, 0));
  const pressDepth = useRef(0);
  const rippleEnergy = useRef(0);

  // 타격한 지점 기록 (타격한 위치의 껍질 조각이 집중적으로 깨지도록)
  const hitHistory = useRef<Array<{ pos: THREE.Vector3; power: number }>>([]);

  useEffect(() => {
    if (value === 0) {
      hitHistory.current = [];
    }
  }, [value]);

  // 1겹: 안쪽 속살 메쉬 (이음새 0% 일체형)
  const { innerGeo, innerBasePos } = useMemo(() => {
    const geo = createWeldedBaseShape(config.shape, 1.25);
    const posAttr = geo.attributes.position;
    // 껍질이 있는 프리셋(crack > 0)은 속살이 겉껍질 바로 안쪽(0.95 스케일)에 위치하도록 설정
    const scale = config.crack > 0 ? 0.945 : 1.0;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) * scale,
        posAttr.getY(i) * scale,
        posAttr.getZ(i) * scale,
      );
    }
    geo.computeVertexNormals();
    return {
      innerGeo: geo,
      innerBasePos: new Float32Array(posAttr.array),
    };
  }, [config.shape, config.crack]);

  // 2겹: 바깥 껍질 메쉬 (평면 절단된 입체 보로노이 조각들)
  const crustData = useMemo(() => {
    if (config.crack <= 0) return null;
    return buildFracturedCrustShell(config.shape, randomSeed);
  }, [config.shape, config.crack, randomSeed]);

  // 튀어나가는 파편 파티클 풀
  const shardParticles = useMemo(() => {
    return Array.from({ length: 24 }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
      rotVel: new THREE.Vector3(),
      scale: new THREE.Vector3(),
      life: 0,
    }));
  }, []);

  const spawnShards = useCallback(
    (localPt: THREE.Vector3) => {
      if (config.crack <= 0.1) return;
      shardParticles.forEach((p) => {
        if (p.life <= 0.05 && Math.random() < 0.45) {
          p.pos
            .copy(localPt)
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
              ),
            );
          p.vel.set(
            (Math.random() - 0.5) * 0.11,
            Math.random() * 0.1 + 0.03,
            (Math.random() - 0.5) * 0.11,
          );
          p.rot.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          );
          p.rotVel.set(
            (Math.random() - 0.5) * 0.22,
            (Math.random() - 0.5) * 0.22,
            (Math.random() - 0.5) * 0.22,
          );
          const s = (0.05 + Math.random() * 0.09) * config.crack;
          p.scale.set(s * 1.1, s * 0.4, s * 0.9);
          p.life = 1.0;
        }
      });
    },
    [config.crack, shardParticles],
  );

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPressed.current = true;

    if (groupRef.current) {
      const localPt = groupRef.current.worldToLocal(e.point.clone());
      targetHit.current.copy(localPt);
      if (pressDepth.current < 0.15) {
        viscousHit.current.copy(localPt);
      }

      if (config.crack > 0) {
        hitHistory.current.push({
          pos: localPt.clone(),
          power: 0.65 + Math.random() * 0.45,
        });
        if (hitHistory.current.length > 12) {
          hitHistory.current.shift();
        }
        spawnShards(localPt);
      }
    }

    targetDrag.current.set(0, 0, 0);
    rippleEnergy.current = Math.min(1.2, rippleEnergy.current + 0.65);
    playSensorySound(config.crack, config.viscosity, value / 100);
    onInteract(8);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPressed.current || !groupRef.current) return;
    e.stopPropagation();
    const currentLocal = groupRef.current.worldToLocal(e.point.clone());
    targetDrag.current
      .subVectors(currentLocal, targetHit.current)
      .clampLength(0, 0.95);

    if (targetDrag.current.length() > 0.1) {
      rippleEnergy.current = Math.min(1.0, rippleEnergy.current + 0.04);
      onInteract(0.5);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPressed.current = false;
    targetDrag.current.set(0, 0, 0);
  };

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempOut = useMemo(() => new THREE.Vector3(), []);

  /**
   * 안쪽 속살과 바깥 껍질이 100% 동일하게 공유하는 연속 공간 변형 함수:
   * 면의 방향(Normal)이 아니라 3D 좌표(x, y, z)만을 기준으로 변형하므로
   * 육면체 모서리가 절대 벌어지지 않으며, 속살이 겉껍질을 뚫고 나오는 현상이 원천 차단됨
   */
  const deformSpacePoint = useCallback(
    (
      bx: number,
      by: number,
      bz: number,
      time: number,
      gaugeRatio: number,
      out: THREE.Vector3,
    ) => {
      let x = bx;
      let y = by;
      let z = bz;

      // 중심에서 바깥을 향하는 연속 방사형 단위벡터
      const rLen = Math.sqrt(x * x + y * y + z * z) || 1;
      const rx = x / rLen;
      const ry = y / rLen;
      const rz = z / rLen;

      // 타격점과의 거리
      const dx = x - viscousHit.current.x;
      const dy = y - viscousHit.current.y;
      const dz = z - viscousHit.current.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const inf = Math.max(0, 1 - dist / 1.15);
      const smoothInf = inf * inf * (3 - 2 * inf);

      // 1) 말랑이 눌림 & 주변 볼륨 팽창
      if (config.squish > 0) {
        const dent = smoothInf * pressDepth.current * config.squish * 0.28;
        const bulge =
          Math.sin(inf * Math.PI) *
          (1 - smoothInf) *
          pressDepth.current *
          config.squish *
          0.14;
        const wave =
          Math.sin(dist * 7 - time * 13) *
          rippleEnergy.current *
          config.squish *
          0.035;

        const radialShift = -dent + bulge + wave;
        x += rx * radialShift;
        y += ry * radialShift;
        z += rz * radialShift;
      }

      // 2) 점성(Viscosity) 드래그 늘어남 & 슬라임 일렁임
      if (config.viscosity > 0) {
        const pull = Math.pow(inf, 1.35) * (0.3 + config.viscosity * 0.75);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;

        if (config.viscosity > 0.4) {
          const slimeWave =
            Math.sin(bx * 3.0 + time * 2.2) *
            Math.cos(by * 3.0 - time * 1.9) *
            (config.viscosity - 0.3) *
            (0.025 + gaugeRatio * 0.045);
          x += rx * slimeWave;
          y += ry * slimeWave;
          z += rz * slimeWave;
        }
      }

      out.set(x, y, z);
    },
    [config.squish, config.viscosity],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();
    const gaugeRatio = value / 100;

    const restoreSpeed = THREE.MathUtils.lerp(9.5, 1.5, config.viscosity);
    const followSpeed = THREE.MathUtils.lerp(15.0, 4.2, config.viscosity);

    viscousHit.current.lerp(targetHit.current, dt * followSpeed);
    if (isPressed.current) {
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
    }
    rippleEnergy.current = THREE.MathUtils.lerp(
      rippleEnergy.current,
      0,
      dt * 4.5,
    );

    if (groupRef.current) {
      // 화면 밖으로 나가지 않도록 최대 팽창 스케일 제한
      const scaleVal =
        1 +
        config.inflate * gaugeRatio * 0.25 +
        rippleEnergy.current * config.squish * 0.06;
      groupRef.current.scale.lerp(
        new THREE.Vector3(scaleVal, scaleVal, scaleVal),
        dt * 8,
      );

      const shakeAmt =
        config.shake * (gaugeRatio * 0.03 + rippleEnergy.current * 0.045);
      groupRef.current.position.set(
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt,
        0,
      );
      groupRef.current.rotation.y = Math.sin(time * 0.55) * 0.32;
      groupRef.current.rotation.x = 0.22 + Math.cos(time * 0.45) * 0.12;
    }

    // [1겹] 안쪽 속살(Inner Flesh) 정점 업데이트
    if (innerFleshRef.current) {
      const posAttr = innerGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        deformSpacePoint(
          innerBasePos[idx],
          innerBasePos[idx + 1],
          innerBasePos[idx + 2],
          time,
          gaugeRatio,
          tempOut,
        );
        arr[idx] = tempOut.x;
        arr[idx + 1] = tempOut.y;
        arr[idx + 2] = tempOut.z;
      }
      posAttr.needsUpdate = true;
      innerGeo.computeVertexNormals();
    }

    // [2겹] 바깥 껍질(Outer Crust) 조각 분리 + 정점 동기화 업데이트
    if (outerCrustRef.current && crustData) {
      const posAttr = crustData.geometry.attributes
        .position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const base = crustData.basePositions;
      const centers = crustData.shardCenters;
      const dirs = crustData.shardDirs;
      const lifts = crustData.shardLiftScale;

      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        const cx = centers[idx];
        const cy = centers[idx + 1];
        const cz = centers[idx + 2];

        // 해당 껍질 조각이 타격받은 정도 계산
        let localDamage = gaugeRatio * 0.7;
        for (let h = 0; h < hitHistory.current.length; h++) {
          const hit = hitHistory.current[h];
          const dx = cx - hit.pos.x;
          const dy = cy - hit.pos.y;
          const dz = cz - hit.pos.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 1.1) {
            localDamage += (1 - d / 1.1) * hit.power * 0.45;
          }
        }
        const totalFracture =
          Math.min(1.2, localDamage * config.crack) * lifts[i];

        // 1) 조각(Slab)이 자기 중심으로 살짝 수축하면서 바깥으로 들려 올라가 틈새(속살 노출)를 만듦
        const shrink = Math.min(0.22, totalFracture * 0.18);
        const lift = totalFracture * (0.11 + rippleEnergy.current * 0.05);

        const bx =
          THREE.MathUtils.lerp(base[idx], cx, shrink) + dirs[idx] * lift;
        const by =
          THREE.MathUtils.lerp(base[idx + 1], cy, shrink) +
          dirs[idx + 1] * lift;
        const bz =
          THREE.MathUtils.lerp(base[idx + 2], cz, shrink) +
          dirs[idx + 2] * lift;

        // 2) 속살과 동일한 연속 공간 변형(눌림/점성)을 적용해 절대 속살이 껍질 밖으로 튀어나오지 않게 함
        deformSpacePoint(bx, by, bz, time, gaugeRatio, tempOut);

        arr[idx] = tempOut.x;
        arr[idx + 1] = tempOut.y;
        arr[idx + 2] = tempOut.z;
      }

      posAttr.needsUpdate = true;
      crustData.geometry.computeVertexNormals();
    }

    // 파편 파티클 업데이트
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
  });

  const innerColor = config.crack > 0 ? config.crackColor : config.baseColor;

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
    >
      {/* 1겹: 안쪽 속살 메쉬 (껍질이 갈라지면 그 틈 사이로 보이는 촉촉한 속살, 껍질 없는 프리셋은 본체 역할) */}
      <mesh ref={innerFleshRef} geometry={innerGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={innerColor}
          emissive={config.crack > 0 ? config.crackColor : "#000000"}
          emissiveIntensity={config.crack > 0 ? 0.22 : 0}
          roughness={config.crack > 0 ? 0.15 : config.roughness}
          metalness={0.05}
          clearcoat={config.crack > 0 ? 0.95 : config.glossiness}
          clearcoatRoughness={0.08}
          ior={1.45}
        />
      </mesh>

      {/* 2겹: 바깥 껍질 메쉬 (평면 절단된 입체 다각형 조각들 — 타격 시 조각이 벌어지며 안쪽 속살 노출) */}
      {crustData && (
        <mesh
          ref={outerCrustRef}
          geometry={crustData.geometry}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={config.baseColor}
            roughness={config.roughness}
            metalness={0.05}
            clearcoat={config.glossiness}
            clearcoatRoughness={Math.max(0.05, config.roughness * 0.4)}
            ior={1.45}
          />
        </mesh>
      )}

      {/* 타격 시 튀어나가는 껍질 파편들 */}
      <instancedMesh
        ref={shardsRef}
        args={[undefined, undefined, shardParticles.length]}
      >
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshPhysicalMaterial
          color={config.baseColor}
          roughness={config.roughness}
          clearcoat={config.glossiness}
        />
      </instancedMesh>
    </group>
  );
}

export interface SensoryCanvasCardProps {
  preset?: SensoryPresetType;
  customConfig?: Partial<SensoryPhysicsProps>;
  value: number;
  onChange: (newValue: number) => void;
}

export default function SensoryObject({
  preset = "crispy",
  customConfig,
  value,
  onChange,
}: SensoryCanvasCardProps) {
  const [randomSeed, setRandomSeed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setRandomSeed(Math.random() * 100);
    }
  }, [value, preset]);

  const mergedConfig: Required<SensoryPhysicsProps> = useMemo(() => {
    const base = SENSORY_PRESETS[preset].config;
    return { ...base, ...customConfig };
  }, [preset, customConfig]);

  const handleInteract = useCallback(
    (delta: number) => {
      onChange(Math.min(100, Math.round(value + delta)));
    },
    [value, onChange],
  );

  return (
    <div className="relative w-full h-full select-none touch-none">
      {/* 모델 전체가 잘리지 않고 여유 있게 담기도록 카메라 거리를 z: 5.2로 조정 */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        gl={{ antialias: true }}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.3} castShadow />
        <pointLight
          position={[-4, -3, 3]}
          intensity={0.75}
          color={mergedConfig.crackColor}
        />

        <DualLayerSensoryMesh
          config={mergedConfig}
          value={value}
          randomSeed={randomSeed}
          onInteract={handleInteract}
        />
      </Canvas>
    </div>
  );
}
