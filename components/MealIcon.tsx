import Image from "next/image";

export default function MealIcon({ meal, compact = false }: {
  meal: "breakfast" | "lunch" | "dinner";
  compact?: boolean;
}) {
  const size = compact ? 28 : 32;
  const imageWidth = compact ? 34 : 40;
  return <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: size, height: size, fontSize: compact ? 20 : 24, lineHeight: 1 }}>
    {meal === "breakfast" ? <Image
      src="/meal-icons/breakfast-sunrise.png"
      alt=""
      width={48}
      height={32}
      sizes={`${imageWidth}px`}
      draggable={false}
      style={{ display: "block", width: imageWidth, height: "auto", maxWidth: "none" }}
    /> : meal === "lunch" ? "☀️" : "🌙"}
  </span>;
}
