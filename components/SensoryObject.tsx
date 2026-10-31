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
  squish?: number; // 0 ~ 1: 속살이 말랑하게 들어가는 탄성
  viscosity?: number; // 0 ~ 1: 속살의 점성 (치즈/슬라임처럼 늘어남)
  crack?: number; // 0 ~ 1: 딱딱한 바깥 껍질이 조각나며 벌어지는 정도
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
    desc: "모델을 눌러 딱딱한 겉껍질을 깨뜨리고, 빈 배경을 드래그해 돌려보세요!",
    config: {
      shape: "box",
      baseColor: "#eab308", // 노란 바삭 겉껍질
      crackColor: "#fb7185", // 안쪽 말랑한 속살
      squish: 0.45,
      viscosity: 0.55,
      crack: 1.0, // 딱딱한 겉껍질 조각 파쇄 최대
      shake: 0.25,
      inflate: 0.05,
      roughness: 0.32,
      glossiness: 0.7,
    },
  },
  spicy: {
    label: "매움",
    desc: "꾹 누르고 당겨 붉은 껍질 속 화끈한 매운맛 코어를 깨워보세요!",
    config: {
      shape: "sphere",
      baseColor: "#dc2626",
      crackColor: "#fde047",
      squish: 0.7,
      viscosity: 0.65,
      crack: 0.8,
      shake: 1.0,
      inflate: 0.15,
      roughness: 0.22,
      glossiness: 0.85,
    },
  },
  hot: {
    label: "뜨거움",
    desc: "문질러서 딱딱한 겉껍질 사이로 뜨거운 속살이 올라오게 달궈보세요!",
    config: {
      shape: "box",
      baseColor: "#ea580c",
      crackColor: "#fef08a",
      squish: 0.6,
      viscosity: 0.6,
      crack: 0.65,
      shake: 0.55,
      inflate: 0.28,
      roughness: 0.28,
      glossiness: 0.8,
    },
  },
  soup: {
    label: "국물",
    desc: "껍질 없이 탱글하고 찰랑거리는 물방울을 잡고 끝까지 늘려보세요!",
    config: {
      shape: "sphere",
      baseColor: "#0ea5e9",
      crackColor: "#e0f2fe",
      squish: 1.0,
      viscosity: 0.45,
      crack: 0.0,
      shake: 0.15,
      inflate: 0.12,
      roughness: 0.03,
      glossiness: 1.0,
    },
  },
  hearty: {
    label: "든든함",
    desc: "누를수록 겉껍질이 갈라지며 묵직한 속살 반죽이 부풀어 오릅니다!",
    config: {
      shape: "box",
      baseColor: "#d97706",
      crackColor: "#fef3c7",
      squish: 0.75,
      viscosity: 0.8,
      crack: 0.5,
      shake: 0.05,
      inflate: 0.85,
      roughness: 0.42,
      glossiness: 0.5,
    },
  },
  chewy: {
    label: "질김 / 쫀득함",
    desc: "모델을 잡고 화면 끝까지 치즈·슬라임처럼 쫀득하게 늘려보세요!",
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
        1150 + Math.random() * 850 + intensity * 500,
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
 * 고밀도 일체형 베이스 도형 생성 (육면체 형태 유지 + 모서리 용접)
 */
function createWeldedBaseShape(
  shape: "box" | "sphere" | "torus",
  detailScale = 1.5,
): THREE.BufferGeometry {
  if (shape === "torus") {
    const radialSegs = Math.round(36 * detailScale);
    const tubularSegs = Math.round(56 * detailScale);
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
    const subdiv = Math.round(14 * detailScale);
    const raw = new THREE.IcosahedronGeometry(0.92, subdiv);
    return weldAndMapGeometry(raw, (v) => v);
  }

  // shape === 'box': 고밀도 직육면체 (모서리 베벨링 + 완전 용접)
  const sx = Math.round(20 * detailScale);
  const sy = Math.round(14 * detailScale);
  const sz = Math.round(14 * detailScale);
  const rawBox = new THREE.BoxGeometry(1.48, 1.04, 1.04, sx, sy, sz);

  const halfW = 0.74;
  const halfH = 0.52;
  const halfD = 0.52;
  const bevel = 0.095;
  const innerW = halfW - bevel;
  const innerH = halfH - bevel;
  const innerD = halfD - bevel;

  return weldAndMapGeometry(rawBox, (v) => {
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
 * 고밀도 딱딱한 바깥 껍질(Rigid Outer Crust) 생성:
 * 메쉬 밀도를 대폭 높이고(detailScale = 1.45), 42개의 보로노이 강체 조각으로 분할
 */
function buildRigidFracturedCrust(
  shape: "box" | "sphere" | "torus",
  randomSeed: number,
): RigidCrustData {
  // 껍질 메쉬 해상도 대폭 상향
  const baseGeo = createWeldedBaseShape(shape, 1.45);
  const posAttr = baseGeo.attributes.position;
  const indexAttr = baseGeo.index!;

  let s = Math.floor(randomSeed * 1000) + 1;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  // 42개의 촘촘한 보로노이 껍질 조각 시드 생성
  const shardCount = 42;
  const shardCenters: THREE.Vector3[] = [];
  const shardOutDirs: THREE.Vector3[] = [];
  const shardRotAxes: THREE.Vector3[] = [];
  const shardLiftScale = new Float32Array(shardCount);

  for (let i = 0; i < shardCount; i++) {
    const dir = new THREE.Vector3(
      rand() - 0.5,
      rand() - 0.5,
      rand() - 0.5,
    ).normalize();
    shardCenters.push(dir.clone().multiplyScalar(0.65 + rand() * 0.25));
    shardOutDirs.push(dir.clone());
    // 각 조각이 깨질 때 기울어지는 고유 회전축
    shardRotAxes.push(
      new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
        .cross(dir)
        .normalize(),
    );
    shardLiftScale[i] = 0.55 + rand() * 0.75;
  }

  const positions: number[] = [];
  const shardIds: number[] = [];
  const shellThickness = 0.055;

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

    // 가장 가까운 5개 시드와 평면 절단 수행
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
        // 윗면
        for (let p = 1; p < poly.length - 1; p++) {
          pushTriangle(poly[0], poly[p], poly[p + 1], myIdx);
        }
        // 입체 두께 옆면
        const innerPoly = poly.map((pt) =>
          pt.clone().multiplyScalar(1 - shellThickness),
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

  // 각 조각의 실제 정점 평균 위치로 shardCenter 보정 (회전 시 자연스러운 중심축 확보)
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
      shardOutDirs[sIdx].copy(shardCenters[sIdx]).normalize();
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
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const innerFleshRef = useRef<THREE.Mesh>(null);
  const outerCrustRef = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);

  // 조작 모드: 'none' | 'interact'(모델 위 드래그: 감각 조작) | 'rotate'(모델 바깥 드래그: 수동 회전)
  const interactionMode = useRef<"none" | "interact" | "rotate">("none");

  // 수동 회전 상태 (자동 회전 제거, 초기 얼짱 각도 세팅)
  const targetRotation = useRef({ x: 0.28, y: -0.42 });
  const currentRotation = useRef({ x: 0.28, y: -0.42 });
  const prevPointerScreen = useRef({ x: 0, y: 0 });

  // 모델 바깥으로 마우스가 나가도 드래그가 절대 끊기지 않게 해주는 3D 가상 평면 & 레이캐스터
  const dragPlane = useRef(new THREE.Plane());
  const raycaster = useRef(new THREE.Raycaster());
  const pointerNDC = useRef(new THREE.Vector2());
  const planeIntersect = useRef(new THREE.Vector3());

  // 점성 및 눌림 물리 상태
  const targetHit = useRef(new THREE.Vector3(0, 0, 1));
  const viscousHit = useRef(new THREE.Vector3(0, 0, 1));
  const targetDrag = useRef(new THREE.Vector3(0, 0, 0));
  const viscousDrag = useRef(new THREE.Vector3(0, 0, 0));
  const pressDepth = useRef(0);
  const rippleEnergy = useRef(0);

  const hitHistory = useRef<Array<{ pos: THREE.Vector3; power: number }>>([]);

  useEffect(() => {
    if (value === 0) {
      hitHistory.current = [];
    }
  }, [value]);

  // 1겹: 말랑하고 쫀득한 안쪽 속살 메쉬 (고밀도 1.6배)
  const { innerGeo, innerBasePos } = useMemo(() => {
    const geo = createWeldedBaseShape(config.shape, 1.6);
    const posAttr = geo.attributes.position;
    const scale = config.crack > 0 ? 0.94 : 1.0;
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

  // 2겹: 휘어지지 않는 딱딱한 바깥 껍질 메쉬 (42개 강체 보로노이 조각)
  const crustData = useMemo(() => {
    if (config.crack <= 0) return null;
    return buildRigidFracturedCrust(config.shape, randomSeed);
  }, [config.shape, config.crack, randomSeed]);

  // 튀어나가는 파편 파티클 풀
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
            (Math.random() - 0.5) * 0.12,
            Math.random() * 0.11 + 0.03,
            (Math.random() - 0.5) * 0.12,
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
          const s = (0.05 + Math.random() * 0.08) * config.crack;
          p.scale.set(s * 1.1, s * 0.4, s * 0.9);
          p.life = 1.0;
        }
      });
    },
    [config.crack, shardParticles],
  );

  // 모델 내부 클릭 시작: 껍질이든 속살이든 상관없이 카메라 수직 드래그 평면을 생성해 끊김 없는 추적 시작
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

      // 카메라 시선 수직 평면을 타격 지점에 생성 (마우스가 모델 밖으로 나가도 이 평면 위에서 계속 드래그됨)
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir, worldPt);

      if (config.crack > 0) {
        hitHistory.current.push({
          pos: localPt.clone(),
          power: 0.7 + Math.random() * 0.45,
        });
        if (hitHistory.current.length > 14) {
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

  // 모델 바깥 배경 클릭 시작: 수동 회전 모드 진입
  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    interactionMode.current = "rotate";
    prevPointerScreen.current = { x: e.clientX, y: e.clientY };
  };

  // Window 레벨 포인터 이동/해제 추적: 마우스가 껍질↔속살, 모델 안↔모델 밖 어디로 가든 절대 끊기지 않음
  useEffect(() => {
    const domElement = gl.domElement;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (interactionMode.current === "none") return;

      if (interactionMode.current === "rotate") {
        const dx = e.clientX - prevPointerScreen.current.x;
        const dy = e.clientY - prevPointerScreen.current.y;
        prevPointerScreen.current = { x: e.clientX, y: e.clientY };

        targetRotation.current.y += dx * 0.011;
        targetRotation.current.x = THREE.MathUtils.clamp(
          targetRotation.current.x + dy * 0.011,
          -Math.PI * 0.48,
          Math.PI * 0.48,
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
            .clampLength(0, 1.25);

          if (targetDrag.current.length() > 0.1) {
            rippleEnergy.current = Math.min(1.0, rippleEnergy.current + 0.035);
            onInteract(0.45);
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
  }, [camera, gl, onInteract]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempOut = useMemo(() => new THREE.Vector3(), []);
  const shardQuats = useMemo(
    () => Array.from({ length: 42 }, () => new THREE.Quaternion()),
    [],
  );
  const shardOffsets = useMemo(
    () => Array.from({ length: 42 }, () => new THREE.Vector3()),
    [],
  );

  // 말랑한 속살 전용 변형 함수 (정점 단위로 쫀득하게 늘어나고 눌림)
  const deformSoftFleshPoint = useCallback(
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

      const rLen = Math.sqrt(x * x + y * y + z * z) || 1;
      const rx = x / rLen;
      const ry = y / rLen;
      const rz = z / rLen;

      const dx = x - viscousHit.current.x;
      const dy = y - viscousHit.current.y;
      const dz = z - viscousHit.current.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const inf = Math.max(0, 1 - dist / 1.25);
      const smoothInf = inf * inf * (3 - 2 * inf);

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

      if (config.viscosity > 0) {
        const pull = Math.pow(inf, 1.3) * (0.35 + config.viscosity * 0.85);
        x += viscousDrag.current.x * pull;
        y += viscousDrag.current.y * pull;
        z += viscousDrag.current.z * pull;

        if (config.viscosity > 0.4) {
          const slimeWave =
            Math.sin(bx * 3.0 + time * 2.2) *
            Math.cos(by * 3.0 - time * 1.9) *
            (config.viscosity - 0.3) *
            (0.02 + gaugeRatio * 0.04);
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
    const isInteracting = interactionMode.current === "interact";

    const restoreSpeed = THREE.MathUtils.lerp(9.5, 1.5, config.viscosity);
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
    }
    rippleEnergy.current = THREE.MathUtils.lerp(
      rippleEnergy.current,
      0,
      dt * 4.5,
    );

    // 수동 회전 부드러운 보간 (자동 회전 완전 제거!)
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
        config.inflate * gaugeRatio * 0.24 +
        rippleEnergy.current * config.squish * 0.05;
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

      groupRef.current.rotation.x = currentRotation.current.x;
      groupRef.current.rotation.y = currentRotation.current.y;
    }

    // [1겹] 안쪽 속살(Inner Flesh): 말랑하고 쫀득하게 정점 변형
    if (innerFleshRef.current) {
      const posAttr = innerGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        deformSoftFleshPoint(
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

    // [2겹] 바깥 껍질(Outer Crust): 휘어지지 않는 딱딱한 강체 조각(Rigid Shard) 물리!
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

      // 먼저 42개 각 강체 조각(Shard)별 이동 벡터(Offset)와 회전 쿼터니언(Tilt)만 계산
      for (let sIdx = 0; sIdx < crustData.shardCount; sIdx++) {
        const center = crustData.shardCenters[sIdx];
        const outDir = crustData.shardOutDirs[sIdx];
        const rotAxis = crustData.shardRotAxes[sIdx];
        const liftScale = crustData.shardLiftScale[sIdx];

        // 타격 데미지 합산
        let localDamage = gaugeRatio * 0.65;
        for (let h = 0; h < hitHistory.current.length; h++) {
          const hit = hitHistory.current[h];
          const d = center.distanceTo(hit.pos);
          if (d < 1.05) {
            localDamage += (1 - d / 1.05) * hit.power * 0.5;
          }
        }
        const fracture = Math.min(1.3, localDamage * config.crack) * liftScale;

        // 드래그 지점과의 거리 (속살이 늘어날 때 그 위의 딱딱한 껍질 조각도 휘지 않고 통째로 밀려나게 함)
        const distToHit = center.distanceTo(viscousHit.current);
        const inf = Math.max(0, 1 - distToHit / 1.15);
        const smoothInf = inf * inf * (3 - 2 * inf);

        // 누를 때는 딱딱한 판째로 살짝 안으로 눌리고, 드래그할 때는 속살 위에서 판째로 따라 움직임
        const rigidDent = smoothInf * pressDepth.current * config.squish * 0.16;
        const rigidPull =
          Math.pow(inf, 1.35) * (0.28 + config.viscosity * 0.65);

        // 조각이 바깥으로 들려 올라가는 거리 (속살이 삐져나오지 않도록 드래그 시 추가 리프트 부여)
        const outwardLift =
          fracture * (0.14 + rippleEnergy.current * 0.05) -
          rigidDent +
          viscousDrag.current.length() * smoothInf * 0.12;

        shardOffsets[sIdx]
          .copy(outDir)
          .multiplyScalar(outwardLift)
          .addScaledVector(viscousDrag.current, rigidPull);

        // 딱딱한 조각이 깨지면서 비스듬히 기울어지는 강체 회전 각도
        const tiltAngle =
          fracture * 0.38 + smoothInf * pressDepth.current * 0.12;
        shardQuats[sIdx].setFromAxisAngle(rotAxis, tiltAngle);
      }

      // 각 정점에 자신이 속한 조각(Shard)의 강체 회전 + 강체 이동만 적용 (조각 자체는 절대 구부러지지 않음!)
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        const sId = vShardIds[i];
        const center = crustData.shardCenters[sId];
        const quat = shardQuats[sId];
        const offset = shardOffsets[sId];

        // 조각 중심 기준 상대 좌표 회전 후 이동
        tempOut.set(
          base[idx] - center.x,
          base[idx + 1] - center.y,
          base[idx + 2] - center.z,
        );
        tempOut.applyQuaternion(quat);

        arr[idx] = center.x + tempOut.x + offset.x;
        arr[idx + 1] = center.y + tempOut.y + offset.y;
        arr[idx + 2] = center.z + tempOut.z + offset.z;

        // 법선 벡터도 동일하게 강체 회전만 적용해 칼각 단면 유지
        tempOut.set(baseNorm[idx], baseNorm[idx + 1], baseNorm[idx + 2]);
        tempOut.applyQuaternion(quat);
        normArr[idx] = tempOut.x;
        normArr[idx + 1] = tempOut.y;
        normArr[idx + 2] = tempOut.z;
      }

      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;
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
    <>
      {/* 모델 바깥 허공을 드래그했을 때 수동 회전을 받아주는 투명 배경 플레인 */}
      <mesh position={[0, 0, -2]} onPointerDown={handleBackgroundPointerDown}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={groupRef} onPointerDown={handleModelPointerDown}>
        {/* 1겹: 말랑하고 쫀득하게 늘어나는 안쪽 속살 메쉬 */}
        <mesh ref={innerFleshRef} geometry={innerGeo} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={innerColor}
            emissive={config.crack > 0 ? config.crackColor : "#000000"}
            emissiveIntensity={config.crack > 0 ? 0.2 : 0}
            roughness={config.crack > 0 ? 0.12 : config.roughness}
            metalness={0.05}
            clearcoat={config.crack > 0 ? 0.95 : config.glossiness}
            clearcoatRoughness={0.06}
            ior={1.45}
          />
        </mesh>

        {/* 2겹: 구부러지지 않고 딱딱한 판(Rigid Plate)째로 깨지고 들리는 고밀도 바깥 껍질 메쉬 */}
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
              flatShading // 딱딱한 껍질 조각의 칼각 단면 강조
            />
          </mesh>
        )}

        {/* 타격 시 튀어나가는 파편들 */}
        <instancedMesh
          ref={shardsRef}
          args={[undefined, undefined, shardParticles.length]}
        >
          <dodecahedronGeometry args={[0.32, 0]} />
          <meshPhysicalMaterial
            color={config.baseColor}
            roughness={config.roughness}
            clearcoat={config.glossiness}
            flatShading
          />
        </instancedMesh>
      </group>
    </>
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
