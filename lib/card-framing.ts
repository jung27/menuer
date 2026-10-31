// Fit a camera-facing bounding box, including depth, into a perspective viewport.
export function cardCameraDistance(halfWidth: number, halfHeight: number, halfDepth: number, aspect: number, fov: number) {
  const verticalTangent = Math.tan(fov * Math.PI / 360);
  const horizontalTangent = verticalTangent * Math.max(aspect, 0.1);
  return Math.max(halfWidth / horizontalTangent, halfHeight / verticalTangent) * 1.12 + halfDepth + 0.15;
}
