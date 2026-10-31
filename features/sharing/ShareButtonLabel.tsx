import type { ShareStatus } from "./useShareFeedbackGroup";

export default function ShareButtonLabel({ label, status }: { label: string; status: ShareStatus }) {
  const copied = "링크 복사됨", failed = "복사 실패";
  return <span className="inline-grid items-center justify-items-center whitespace-nowrap align-middle">
    {/* All labels share a grid cell, reserving the widest label in every state. */}
    {[label, copied, failed].map((text, index) =>
      <span key={index} aria-hidden="true" className="invisible col-start-1 row-start-1">{text}</span>
    )}
    <span className="col-start-1 row-start-1">{status === "copied" ? copied : status === "failed" ? failed : label}</span>
  </span>;
}
