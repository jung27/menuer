export default function MealIcon({ meal, compact = false }: {
  meal: "breakfast" | "lunch" | "dinner";
  compact?: boolean;
}) {
  const size = compact ? 28 : 32;
  return <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: size, height: size, fontSize: compact ? 20 : 24, lineHeight: 1 }}>
    <svg width={compact ? 22 : 25} height={compact ? 22 : 25} viewBox="0 0 24 24" fill="none" stroke="#e6a12c" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {meal === "breakfast" ? <>
        <path d="M6 16a6 6 0 0 1 12 0M2 16h20M2 20h20" />
        <path d="M12 3v2M4.9 6.9l1.4 1.4M17.7 8.3l1.4-1.4M2 12h2M20 12h2" />
      </> : meal === "lunch" ? <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </> : <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
    </svg>
  </span>;
}
