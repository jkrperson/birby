"use client";

import { useEffect, useRef } from "react";
import type { Stage } from "@birby/core";
import { SPRITES, drawGrid, type Anim } from "@birby/sprites";

interface Props {
  stage: Stage;
  /** Pixel scale of the sprite (16px grid × scale). */
  scale?: number;
  height?: number;
  /** When true the pet mostly sleeps in place (sleepy mood). */
  drowsy?: boolean;
}

interface PetSim {
  x: number;
  dir: 1 | -1;
  anim: Anim;
  animUntil: number;
  target: number;
}

/**
 * A wandering pixel pet: walks to random targets, idles, pecks at the ground.
 * Eggs and drowsy pets stay put and wobble/blink.
 */
export default function PetCanvas({ stage, scale = 6, height = 200, drowsy = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spriteSize = 16 * scale;
    const mobile = stage !== "egg" && !drowsy;
    let raf = 0;
    let width = 0;

    const sim: PetSim = {
      x: 0,
      dir: 1,
      anim: "idle",
      animUntil: 0,
      target: 0,
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      sim.x = Math.min(sim.x, Math.max(0, width - spriteSize));
    };
    resize();
    sim.x = Math.max(0, (width - spriteSize) / 2);
    sim.target = sim.x;
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pickNext = (now: number) => {
      if (!mobile) {
        sim.anim = "idle";
        sim.animUntil = now + 1500 + Math.random() * 2500;
        return;
      }
      const roll = Math.random();
      if (roll < 0.45) {
        sim.anim = "idle";
        sim.animUntil = now + 1200 + Math.random() * 2600;
      } else if (roll < 0.65) {
        sim.anim = "eat";
        sim.animUntil = now + 900 + Math.random() * 900;
      } else {
        sim.anim = "walk";
        sim.target = Math.random() * Math.max(1, width - spriteSize);
        sim.dir = sim.target > sim.x ? 1 : -1;
        sim.animUntil = now + 8000;
      }
    };

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      if (now >= sim.animUntil) pickNext(now);

      if (sim.anim === "walk") {
        const speed = 0.04 * scale;
        sim.x += sim.dir * speed * dt;
        if ((sim.dir === 1 && sim.x >= sim.target) || (sim.dir === -1 && sim.x <= sim.target)) {
          sim.x = sim.target;
          sim.animUntil = now;
        }
      }

      const frames = SPRITES[stage][sim.anim];
      const frameMs = sim.anim === "walk" ? 180 : sim.anim === "eat" ? 250 : 900;
      const frame = frames[Math.floor(now / frameMs) % frames.length];
      const bob = sim.anim === "walk" && Math.floor(now / frameMs) % 2 === 1 ? -scale : 0;

      ctx.clearRect(0, 0, width, height);
      const groundY = height - 14;
      ctx.strokeStyle = "rgba(59,45,31,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 6);
      ctx.lineTo(width, groundY + 6);
      ctx.stroke();

      drawGrid(ctx, frame, Math.round(sim.x), groundY - spriteSize + bob, scale, sim.dir === -1);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stage, scale, height, drowsy]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height, display: "block" }}
      aria-label="your pet wandering around"
    />
  );
}
