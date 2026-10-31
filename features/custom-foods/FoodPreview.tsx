"use client";

import { Component, memo, useMemo, useState, type ReactNode } from "react";
import SensoryObject from "@/components/SensoryObject";
import type { CustomFoodDraft } from "./model";

class PreviewBoundary extends Component<{ children: ReactNode; color: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="ac-preview-fallback"><span style={{ background: this.props.color }} /><p>이 환경에서는 3D 미리보기를 표시할 수 없어요.<br />설정과 저장은 사용할 수 있어요.</p></div> : this.props.children; }
}
function FoodPreview({ draft }: { draft: CustomFoodDraft }) {
  const [damage, setDamage] = useState(0);
  // Touch damage and editor button state must not rebuild the random surface
  // textures. Only a changed name or taste profile creates a new food object.
  const food = useMemo(() => ({
    id: "custom-food-preview", name: draft.name || "나만의 음식", tags: draft.tags,
  }), [draft.name, draft.tags]);
  return <PreviewBoundary color={draft.physics.baseColor}><SensoryObject food={food} customConfig={draft.physics} value={damage} onChange={setDamage} /></PreviewBoundary>;
}

export default memo(FoodPreview);
