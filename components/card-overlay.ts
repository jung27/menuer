import type { RefObject } from "react";
import type { Camera, Group } from "three";

export type CardOverlayRefs = {
  viewport: RefObject<HTMLDivElement | null>;
  camera: RefObject<HTMLDivElement | null>;
  object: RefObject<HTMLDivElement | null>;
};

// CSS3D coordinate conversion: Three's positive Y points up, DOM's points down.
// The camera/object separation preserves perspective, rotation and card deformation.
export function syncCardOverlay(
  refs: CardOverlayRefs, group: Group, camera: Camera,
  size: { width: number; height: number },
) {
  const viewport = refs.viewport.current;
  const cameraElement = refs.camera.current;
  const objectElement = refs.object.current;
  if (!viewport || !cameraElement || !objectElement) return;
  camera.updateMatrixWorld();
  group.updateWorldMatrix(true, false);
  const fov = camera.projectionMatrix.elements[5] * size.height / 2;
  const cameraValues = camera.matrixWorldInverse.elements.map((value, i) =>
    (i % 4 === 1 ? -value : value));
  const pixelScale = 2.6 / 400; // Matches the original Html distanceFactor=2.6.
  const objectValues = group.matrixWorld.elements.map((value, i) => {
    const column = Math.floor(i / 4);
    if (column === 3) return value;
    const sign = column === 1 ? -1 : 1;
    return value * sign * (i % 4 === 3 ? 1 : pixelScale);
  });
  viewport.style.perspective = `${fov}px`;
  cameraElement.style.transform = `translateZ(${fov}px)matrix3d(${cameraValues.join(",")})translate(${size.width / 2}px,${size.height / 2}px)`;
  objectElement.style.transform = `translate(-50%,-50%)matrix3d(${objectValues.join(",")})`;
  // Hide overlays behind the camera. View-space Z is negative in front of it.
  const world = group.matrixWorld.elements;
  const view = camera.matrixWorldInverse.elements;
  const viewZ = view[2] * world[12] + view[6] * world[13] + view[10] * world[14] + view[14];
  viewport.style.visibility = viewZ < 0 ? "visible" : "hidden";
}
