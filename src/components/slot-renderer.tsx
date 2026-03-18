"use client";

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as PIXI from "pixi.js";

/* ─── Symbol visual config ────────────────────────────────────── */

const SYMBOL_COLORS: Record<string, number> = {
  wild: 0xffd700,
  scatter: 0x9333ea,
  hp1: 0x3b82f6,
  hp2: 0x10b981,
  hp3: 0xef4444,
  hp4: 0xf97316,
  lp1: 0x94a3b8,
  lp2: 0xa1a1aa,
  lp3: 0x78716c,
  lp4: 0x6b7280,
  lp5: 0x9ca3af,
  lp6: 0xd1d5db,
};

const SYMBOL_LABELS: Record<string, string> = {
  wild: "WILD",
  scatter: "SCAT",
  hp1: "HP1",
  hp2: "HP2",
  hp3: "HP3",
  hp4: "HP4",
  lp1: "A",
  lp2: "K",
  lp3: "Q",
  lp4: "J",
  lp5: "10",
  lp6: "9",
};

const SYMBOL_EMOJI: Record<string, string> = {
  wild: "\u{1F31F}",
  scatter: "\u{26A1}",
  hp1: "\u{1F48E}",
  hp2: "\u{1F451}",
  hp3: "\u{1F3FA}",
  hp4: "\u{1F5FF}",
  lp1: "A",
  lp2: "K",
  lp3: "Q",
  lp4: "J",
  lp5: "10",
  lp6: "9",
};

/* ─── Exported types ──────────────────────────────────────────── */

export type RendererSkin = "dark" | "light" | "wireframe";

export interface SlotRendererProps {
  reels: number;
  rows: number;
  skin: RendererSkin;
  /** Grid data: columns × rows of symbol IDs */
  grid: string[][] | null;
  /** Whether spin animation is active */
  spinning: boolean;
  /** Current win amount (0 = no win) */
  win: number;
  /** Whether a bonus was triggered */
  bonusTriggered: boolean;
  /** Number of cascades */
  cascadeCount: number;
  /** Whether to show win animations */
  showWinAnimations: boolean;
  /** Visual mode: determines how symbols render */
  visualMode: "emoji" | "svg" | "custom";
  /** Custom symbol names from wizard Step 4 */
  symbolNames?: Record<string, string>;
}

export interface SlotRendererHandle {
  /** Trigger the spin start animation */
  animateSpinStart: () => void;
  /** Trigger the spin stop animation (reels land per-reel with delay) */
  animateSpinStop: (grid: string[][]) => Promise<void>;
  /** Trigger win celebration animation */
  animateWin: (amount: number) => void;
  /** Trigger cascade animation */
  animateCascade: () => void;
}

/* ─── Layout constants ─────────────────────────────────────────── */

const CELL_SIZE = 80;
const CELL_GAP = 6;
const REEL_GAP = 8;
const PADDING_X = 24;
const PADDING_Y = 24;
const HEADER_H = 0;

function calcCanvasSize(reels: number, rows: number) {
  const w = PADDING_X * 2 + reels * CELL_SIZE + (reels - 1) * REEL_GAP;
  const h = PADDING_Y * 2 + HEADER_H + rows * CELL_SIZE + (rows - 1) * CELL_GAP;
  return { width: w, height: h };
}

/* ─── Skin palettes ─────────────────────────────────────────── */

const SKIN_PALETTE: Record<RendererSkin, {
  bg: number;
  reelBg: number;
  cellBg: number;
  cellBorder: number;
  textColor: number;
  winColor: number;
  reelFrame: number;
}> = {
  dark: {
    bg: 0x111827,
    reelBg: 0x1e293b,
    cellBg: 0x1f2937,
    cellBorder: 0x374151,
    textColor: 0xffffff,
    winColor: 0xfbbf24,
    reelFrame: 0x4b5563,
  },
  light: {
    bg: 0xf8fafc,
    reelBg: 0xffffff,
    cellBg: 0xffffff,
    cellBorder: 0xe5e7eb,
    textColor: 0x111827,
    winColor: 0xd97706,
    reelFrame: 0xd1d5db,
  },
  wireframe: {
    bg: 0xffffff,
    reelBg: 0xfafafa,
    cellBg: 0xffffff,
    cellBorder: 0x9ca3af,
    textColor: 0x374151,
    winColor: 0x2563eb,
    reelFrame: 0x6b7280,
  },
};

/* ─── Component ────────────────────────────────────────────── */

export const SlotRenderer = forwardRef<SlotRendererHandle, SlotRendererProps>(
  function SlotRenderer(props, ref) {
    const {
      reels,
      rows,
      skin,
      grid,
      spinning,
      win,
      bonusTriggered,
      cascadeCount,
      showWinAnimations,
      visualMode,
      symbolNames,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const cellContainersRef = useRef<PIXI.Container[][]>([]);
    const overlayRef = useRef<PIXI.Container | null>(null);
    const animFrameRef = useRef<number>(0);
    const spinBarsRef = useRef<PIXI.Graphics[]>([]);

    const palette = SKIN_PALETTE[skin];
    const { width, height } = calcCanvasSize(reels, rows);

    // Create PIXI app on mount
    useEffect(() => {
      if (!containerRef.current) return;

      const app = new PIXI.Application({
        width,
        height,
        backgroundColor: palette.bg,
        antialias: true,
        resolution: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        autoDensity: true,
      });
      containerRef.current.appendChild(app.view as unknown as Node);
      appRef.current = app;

      // Draw reel frame background
      const frame = new PIXI.Graphics();
      frame.beginFill(palette.reelBg, 0.5);
      frame.drawRoundedRect(
        PADDING_X - 8,
        PADDING_Y + HEADER_H - 8,
        reels * CELL_SIZE + (reels - 1) * REEL_GAP + 16,
        rows * CELL_SIZE + (rows - 1) * CELL_GAP + 16,
        12
      );
      frame.endFill();
      frame.lineStyle(2, palette.reelFrame, 0.6);
      frame.drawRoundedRect(
        PADDING_X - 8,
        PADDING_Y + HEADER_H - 8,
        reels * CELL_SIZE + (reels - 1) * REEL_GAP + 16,
        rows * CELL_SIZE + (rows - 1) * CELL_GAP + 16,
        12
      );
      app.stage.addChild(frame);

      // Create cell containers
      const cells: PIXI.Container[][] = [];
      for (let c = 0; c < reels; c++) {
        const col: PIXI.Container[] = [];
        for (let r = 0; r < rows; r++) {
          const container = new PIXI.Container();
          container.x = PADDING_X + c * (CELL_SIZE + REEL_GAP);
          container.y = PADDING_Y + HEADER_H + r * (CELL_SIZE + CELL_GAP);
          app.stage.addChild(container);

          // Cell background
          const cellBg = new PIXI.Graphics();
          cellBg.beginFill(palette.cellBg);
          cellBg.lineStyle(1.5, palette.cellBorder);
          cellBg.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 8);
          cellBg.endFill();
          container.addChild(cellBg);

          col.push(container);
        }
        cells.push(col);
      }
      cellContainersRef.current = cells;

      // Create spin indicator bars (per reel, show during spin)
      const bars: PIXI.Graphics[] = [];
      for (let c = 0; c < reels; c++) {
        const bar = new PIXI.Graphics();
        bar.visible = false;
        app.stage.addChild(bar);
        bars.push(bar);
      }
      spinBarsRef.current = bars;

      // Overlay for win display
      const overlay = new PIXI.Container();
      overlay.visible = false;
      app.stage.addChild(overlay);
      overlayRef.current = overlay;

      return () => {
        cancelAnimationFrame(animFrameRef.current);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
        appRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reels, rows, skin]);

    // Render grid content when grid changes
    useEffect(() => {
      if (!grid || !appRef.current) return;
      const cells = cellContainersRef.current;

      for (let c = 0; c < Math.min(grid.length, reels); c++) {
        for (let r = 0; r < Math.min(grid[c].length, rows); r++) {
          const container = cells[c]?.[r];
          if (!container) continue;

          // Remove old symbol content (keep index 0 = cellBg)
          while (container.children.length > 1) {
            container.removeChildAt(1);
          }

          const symId = grid[c][r];
          drawSymbol(container, symId, palette, visualMode, symbolNames);
        }
      }
    }, [grid, reels, rows, palette, visualMode, symbolNames]);

    // Show/hide spin blur bars
    useEffect(() => {
      spinBarsRef.current.forEach((bar, c) => {
        bar.visible = spinning;
        if (spinning) {
          bar.clear();
          const x = PADDING_X + c * (CELL_SIZE + REEL_GAP);
          const y = PADDING_Y + HEADER_H;
          const h = rows * CELL_SIZE + (rows - 1) * CELL_GAP;

          // Animated gradient bars
          for (let i = 0; i < 5; i++) {
            const alpha = 0.15 - i * 0.03;
            bar.beginFill(palette.winColor, alpha);
            bar.drawRoundedRect(x, y + i * (h / 5), CELL_SIZE, h / 5 - 2, 4);
            bar.endFill();
          }
        }
      });
    }, [spinning, rows, palette]);

    // Win overlay
    useEffect(() => {
      const overlay = overlayRef.current;
      if (!overlay || !appRef.current) return;

      overlay.removeChildren();

      if (win > 0 && showWinAnimations && !spinning) {
        overlay.visible = true;

        // Win amount text
        const winText = new PIXI.Text(`WIN ${win.toFixed(2)}`, {
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: bonusTriggered ? 28 : 22,
          fontWeight: "bold",
          fill: bonusTriggered ? 0x9333ea : palette.winColor,
          dropShadow: skin === "dark",
          dropShadowColor: 0x000000,
          dropShadowDistance: 2,
        });
        winText.anchor.set(0.5);
        winText.x = width / 2;
        winText.y = height - 14;
        overlay.addChild(winText);

        // Add glow ring around winning cells
        if (grid) {
          const glow = new PIXI.Graphics();
          glow.lineStyle(3, palette.winColor, 0.6);
          for (let c = 0; c < Math.min(grid.length, reels); c++) {
            for (let r = 0; r < Math.min(grid[c].length, rows); r++) {
              const x = PADDING_X + c * (CELL_SIZE + REEL_GAP);
              const y = PADDING_Y + HEADER_H + r * (CELL_SIZE + CELL_GAP);
              glow.drawRoundedRect(x - 2, y - 2, CELL_SIZE + 4, CELL_SIZE + 4, 10);
            }
          }
          overlay.addChild(glow);
        }

        // Bonus text
        if (bonusTriggered) {
          const bonusText = new PIXI.Text("BONUS!", {
            fontFamily: "system-ui, sans-serif",
            fontSize: 16,
            fontWeight: "bold",
            fill: 0x9333ea,
          });
          bonusText.anchor.set(0.5);
          bonusText.x = width / 2;
          bonusText.y = height - 36;
          overlay.addChild(bonusText);
        }

        // Cascade count
        if (cascadeCount > 0) {
          const cascText = new PIXI.Text(
            `${cascadeCount} cascade${cascadeCount > 1 ? "s" : ""}`,
            {
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              fill: palette.textColor,
              fontWeight: "500",
            }
          );
          cascText.anchor.set(0.5);
          cascText.x = width / 2;
          cascText.y = height - 36 + (bonusTriggered ? -18 : 0);
          overlay.addChild(cascText);
        }

        // Auto-hide after 2s
        const timer = setTimeout(() => {
          if (overlay) overlay.visible = false;
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        overlay.visible = false;
      }
    }, [win, bonusTriggered, cascadeCount, spinning, showWinAnimations, grid, reels, rows, width, height, palette, skin]);

    // Imperative API for parent component
    const animateSpinStart = useCallback(() => {
      // Blur/fade existing symbols
      const cells = cellContainersRef.current;
      for (const col of cells) {
        for (const cell of col) {
          cell.alpha = 0.3;
        }
      }
    }, []);

    const animateSpinStop = useCallback(
      (newGrid: string[][]) => {
        return new Promise<void>((resolve) => {
          const cells = cellContainersRef.current;
          let completed = 0;
          const totalReels = Math.min(newGrid.length, reels);

          for (let c = 0; c < totalReels; c++) {
            // Stagger reel landing: each reel lands 120ms after the previous
            setTimeout(() => {
              for (let r = 0; r < Math.min(newGrid[c].length, rows); r++) {
                const container = cells[c]?.[r];
                if (!container) continue;

                // Landing bounce animation
                container.alpha = 1;
                const origY = container.y;
                container.y = origY - 10;

                // Simple bounce back
                const bounce = () => {
                  container.y += 2;
                  if (container.y >= origY) {
                    container.y = origY;
                  } else {
                    requestAnimationFrame(bounce);
                  }
                };
                requestAnimationFrame(bounce);
              }

              completed++;
              if (completed === totalReels) {
                resolve();
              }
            }, c * 120);
          }
        });
      },
      [reels, rows]
    );

    const animateWin = useCallback((_amount: number) => {
      // Win pulse on cells
      const cells = cellContainersRef.current;
      let frame = 0;
      const pulse = () => {
        frame++;
        const scale = 1 + Math.sin(frame * 0.15) * 0.03;
        for (const col of cells) {
          for (const cell of col) {
            cell.scale.set(scale);
          }
        }
        if (frame < 40) {
          animFrameRef.current = requestAnimationFrame(pulse);
        } else {
          for (const col of cells) {
            for (const cell of col) {
              cell.scale.set(1);
            }
          }
        }
      };
      pulse();
    }, []);

    const animateCascade = useCallback(() => {
      // Quick flash effect
      const cells = cellContainersRef.current;
      for (const col of cells) {
        for (const cell of col) {
          cell.alpha = 0.5;
        }
      }
      setTimeout(() => {
        for (const col of cells) {
          for (const cell of col) {
            cell.alpha = 1;
          }
        }
      }, 150);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        animateSpinStart,
        animateSpinStop,
        animateWin,
        animateCascade,
      }),
      [animateSpinStart, animateSpinStop, animateWin, animateCascade]
    );

    return (
      <div
        ref={containerRef}
        className="flex justify-center"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          margin: "0 auto",
        }}
      />
    );
  }
);

/* ─── Helper: draw a symbol into a cell container ───────────── */

function drawSymbol(
  container: PIXI.Container,
  symId: string,
  palette: (typeof SKIN_PALETTE)[RendererSkin],
  visualMode: "emoji" | "svg" | "custom",
  symbolNames?: Record<string, string>
) {
  const color = SYMBOL_COLORS[symId] ?? 0x6b7280;

  if (visualMode === "emoji") {
    // Emoji text centered in cell
    const text = new PIXI.Text(SYMBOL_EMOJI[symId] ?? "?", {
      fontSize: 36,
      fontFamily: "Apple Color Emoji, Segoe UI Emoji, sans-serif",
    });
    text.anchor.set(0.5);
    text.x = CELL_SIZE / 2;
    text.y = CELL_SIZE / 2;
    container.addChild(text);
  } else {
    // SVG/Custom mode: colored shape + label
    const shape = new PIXI.Graphics();

    if (symId === "wild") {
      // Star shape for wild
      shape.beginFill(color, 0.25);
      shape.lineStyle(2, color, 0.8);
      const cx = CELL_SIZE / 2;
      const cy = CELL_SIZE / 2;
      const r1 = 28;
      const r2 = 14;
      const points: number[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? r1 : r2;
        points.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      shape.drawPolygon(points);
      shape.endFill();
    } else if (symId === "scatter") {
      // Diamond shape for scatter
      shape.beginFill(color, 0.3);
      shape.lineStyle(2, color, 0.8);
      const cx = CELL_SIZE / 2;
      const cy = CELL_SIZE / 2;
      shape.drawPolygon([cx, cy - 26, cx + 22, cy, cx, cy + 26, cx - 22, cy]);
      shape.endFill();
    } else if (symId.startsWith("hp")) {
      // Rounded rect for high-pay
      shape.beginFill(color, 0.2);
      shape.lineStyle(2, color, 0.7);
      shape.drawRoundedRect(12, 12, CELL_SIZE - 24, CELL_SIZE - 24, 10);
      shape.endFill();
    } else {
      // Circle for low-pay
      shape.beginFill(color, 0.15);
      shape.lineStyle(2, color, 0.5);
      shape.drawCircle(CELL_SIZE / 2, CELL_SIZE / 2, 22);
      shape.endFill();
    }
    container.addChild(shape);

    // Label text
    const displayLabel = symbolNames?.[symId] ?? SYMBOL_LABELS[symId] ?? symId.toUpperCase();
    const label = new PIXI.Text(displayLabel, {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: symId === "wild" || symId === "scatter" ? 14 : 18,
      fontWeight: "bold",
      fill: color,
    });
    label.anchor.set(0.5);
    label.x = CELL_SIZE / 2;
    label.y = CELL_SIZE / 2;
    container.addChild(label);
  }
}
