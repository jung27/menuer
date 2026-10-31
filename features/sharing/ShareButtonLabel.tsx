import type { ShareStatus } from "./useShareFeedbackGroup";

export default function ShareButtonLabel({ label, status, iconOnly = false }: { label: string; status: ShareStatus; iconOnly?: boolean }) {
  if (iconOnly) return <>
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
    <span role="status" className="sr-only">{status === "copied" ? "링크를 복사했어요." : status === "failed" ? "복사하지 못했어요. 다시 시도해주세요." : ""}</span>
  </>;
  const copied = "링크 복사됨", failed = "복사 실패";
  return <span className="inline-grid items-center justify-items-center whitespace-nowrap align-middle">
    {/* All labels share a grid cell, reserving the widest label in every state. */}
    {[label, copied, failed].map((text, index) =>
      <span key={index} aria-hidden="true" className="invisible col-start-1 row-start-1">{text}</span>
    )}
    <span className="col-start-1 row-start-1">{status === "copied" ? copied : status === "failed" ? failed : label}</span>
  </span>;
}
