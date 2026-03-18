"use client";

import { useMemo } from "react";

interface Props {
  rtp: number; // e.g. 96.0
  hitFrequency: number; // e.g. 25 (%)
  volatilitySd: number; // standard deviation
  maxWin: number; // e.g. 5000x
  pathCount?: number;
  spinsPerPath?: number;
  startBalance?: number;
  betSize?: number;
}

/** Simple seeded PRNG (mulberry32) for reproducible paths */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a single bankroll path */
function generatePath(
  rng: () => number,
  spins: number,
  startBalance: number,
  betSize: number,
  hitFreq: number,
  avgWinPerHit: number,
  volatilitySd: number,
  maxWinCap: number
): number[] {
  const path = [startBalance];
  let balance = startBalance;

  for (let i = 0; i < spins; i++) {
    balance -= betSize;
    const roll = rng();

    if (roll < hitFreq / 100) {
      // Win: use log-normal distribution for realistic win amounts
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
      const logMean = Math.log(avgWinPerHit * betSize);
      const logSd = Math.log(1 + volatilitySd / 100);
      let win = Math.exp(logMean + logSd * z);
      win = Math.min(win, maxWinCap * betSize);
      win = Math.max(win, 0.01);
      balance += win;
    }

    path.push(Math.max(balance, 0));
    if (balance <= 0) {
      // Fill remaining with 0
      while (path.length <= spins) path.push(0);
      break;
    }
  }

  return path;
}

const PATH_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function BankrollPaths({
  rtp,
  hitFrequency,
  volatilitySd,
  maxWin,
  pathCount = 5,
  spinsPerPath = 200,
  startBalance = 100,
  betSize = 1,
}: Props) {
  const paths = useMemo(() => {
    const avgWinPerHit = hitFrequency > 0 ? (rtp / 100) / (hitFrequency / 100) : 1;

    return Array.from({ length: pathCount }, (_, i) => {
      const rng = mulberry32(42 + i * 1337);
      return generatePath(rng, spinsPerPath, startBalance, betSize, hitFrequency, avgWinPerHit, volatilitySd, maxWin);
    });
  }, [rtp, hitFrequency, volatilitySd, maxWin, pathCount, spinsPerPath, startBalance, betSize]);

  const W = 600;
  const H = 180;
  const PAD = { top: 15, right: 40, bottom: 25, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allValues = paths.flat();
  const minVal = 0;
  const maxVal = Math.max(...allValues, startBalance * 1.5);
  const valRange = maxVal - minVal || 1;

  const x = (spin: number) => PAD.left + (spin / spinsPerPath) * chartW;
  const y = (val: number) => PAD.top + (1 - (val - minVal) / valRange) * chartH;

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (valRange * i) / 4);

  // Summary stats
  const finalBalances = paths.map((p) => p[p.length - 1]);
  const winners = finalBalances.filter((b) => b > startBalance).length;
  const busts = finalBalances.filter((b) => b <= 0).length;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">Bankroll Paths</h4>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{pathCount} sessions</span>
          <span>{spinsPerPath} spins each</span>
          <span className="text-green-600 font-medium">{winners} profitable</span>
          {busts > 0 && <span className="text-red-600 font-medium">{busts} busted</span>}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={y(tick)} x2={W - PAD.right} y2={y(tick)}
              stroke="var(--border)" strokeWidth={0.5}
            />
            <text x={PAD.left - 5} y={y(tick) + 3} textAnchor="end" fontSize={9} fill="var(--text3)">
              {tick.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Start balance line */}
        <line
          x1={PAD.left} y1={y(startBalance)} x2={W - PAD.right} y2={y(startBalance)}
          stroke="var(--text3)" strokeWidth={0.5} strokeDasharray="3 2"
        />

        {/* Bankroll paths */}
        {paths.map((path, pathIdx) => {
          const d = path
            .map((val, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(val).toFixed(1)}`)
            .join(" ");
          return (
            <path
              key={pathIdx}
              d={d}
              fill="none"
              stroke={PATH_COLORS[pathIdx % PATH_COLORS.length]}
              strokeWidth={1.2}
              opacity={0.7}
            />
          );
        })}

        {/* Final balance dots */}
        {paths.map((path, pathIdx) => (
          <circle
            key={pathIdx}
            cx={x(path.length - 1)}
            cy={y(path[path.length - 1])}
            r={2.5}
            fill={PATH_COLORS[pathIdx % PATH_COLORS.length]}
          />
        ))}

        {/* X-axis */}
        <text x={PAD.left} y={H - 5} fontSize={9} fill="var(--text3)">0</text>
        <text x={W - PAD.right} y={H - 5} fontSize={9} fill="var(--text3)" textAnchor="end">{spinsPerPath}</text>
        <text x={PAD.left + chartW / 2} y={H - 5} fontSize={9} fill="var(--text3)" textAnchor="middle">Spins</text>
      </svg>
    </section>
  );
}
