"use client";

import { Component, useState, type ReactNode } from "react";
import SensoryObject from "@/components/SensoryObject";
import type { CustomFoodDraft } from "./model";

class PreviewBoundary extends Component<{ children: ReactNode; color: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="ac-preview-fallback"><span style={{ background: this.props.color }} /><p>이 환경에서는 3D 미리보기를 표시할 수 없어요.<br />설정과 저장은 사용할 수 있어요.</p></div> : this.props.children; }
}
export default function FoodPreview({ draft }: { draft: CustomFoodDraft }) {
  const [damage, setDamage] = useState(0);
  return <PreviewBoundary color={draft.physics.baseColor}><SensoryObject food={{ id: "custom-food-preview", name: draft.name || "나만의 음식", tags: draft.tags }} customConfig={draft.physics} value={damage} onChange={setDamage} /></PreviewBoundary>;
}
