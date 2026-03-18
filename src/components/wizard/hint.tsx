/** Contextual hint component — 4 levels per PRD */

type HintLevel = "good" | "neutral" | "warn" | "danger";

const levelStyles: Record<HintLevel, string> = {
  good: "bg-green-50 text-green-800 border-green-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
};

interface HintProps {
  level: HintLevel;
  children: React.ReactNode;
}

export function Hint({ level, children }: HintProps) {
  return (
    <p
      className={`mt-1.5 rounded-md border px-2.5 py-1.5 text-xs ${levelStyles[level]}`}
    >
      {children}
    </p>
  );
}
