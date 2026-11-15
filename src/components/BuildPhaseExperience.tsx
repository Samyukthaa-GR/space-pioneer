import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Hammer,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { STRUCTURES } from '../game/missionData';
import { StructureType } from '../game/types';

interface BuildTutorialSlide {
  id: string;
  badge: string;
  title: string;
  caption: string;
  astroSpeech: string;
}

const BUILD_SLIDES: BuildTutorialSlide[] = [
  {
    id: 'home',
    badge: 'STEP 1 OF 5 · LUNAR HOME',
    title: 'Why Astronauts Need a Moon Home',
    caption: 'Airtight pressurized domes keep explorers warm and safe in airless space.',
    astroSpeech:
      'Welcome to Phase Three, Commander! Before astronauts land, we must build an airtight home dome on flat ground to protect them from airless freezing space!',
  },
  {
    id: 'power',
    badge: 'STEP 2 OF 5 · SUNLIGHT TO POWER',
    title: 'Sunlight Powers Every Machine',
    caption: 'Solar Panels turn Sun beams into electricity and charge your Battery Bank.',
    astroSpeech:
      'Low South Pole Sun hits Solar Panels on bright ridges, sending electricity through power cables into our Battery Bank and Habitat!',
  },
  {
    id: 'lifeloop',
    badge: 'STEP 3 OF 5 · WATER & BREATHABLE AIR',
    title: 'Recycling Water & Scrubbing Air',
    caption: 'Water Tanks, Air Scrubbers, and Oxygen Makers loop clean air and water.',
    astroSpeech:
      'Processed Moon water hydrates our crew, while our Air Scrubber cleans stale CO2 and the Oxygen Maker pumps fresh breathable air!',
  },
  {
    id: 'location',
    badge: 'STEP 4 OF 5 · SMART PLACEMENT',
    title: 'Smart Ground Makes a Stronger Base',
    caption: 'Place Solar Panels in bright sun and habitats on flat terrain away from slopes.',
    astroSpeech:
      'Where we build changes everything! Bright flat ground boosts solar wattage, while thick regolith walls shield against space storms.',
  },
  {
    id: 'howto',
    badge: 'STEP 5 OF 5 · PLACE & CONNECT',
    title: 'Dotted Previews Make Building Easy!',
    caption: 'Modules unlock step-by-step: place them in glowing dotted spots, then link lines!',
    astroSpeech:
      'I will unlock modules one step at a time so nothing feels crowded. Tap any glowing dotted spot to build, then wire lines to Habitat!',
  },
];

/* Animated HTML5 Canvas Storyboard for Phase 3 Cinematic Intro */
const BuildStoryCanvas: React.FC<{ step: number; demoBuilt: boolean }> = ({ step, demoBuilt }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const demoFlipTimeRef = useRef<number>(0);

  useEffect(() => {
    demoFlipTimeRef.current = performance.now();
  }, [demoBuilt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();

    const drawRover = (rx: number, ry: number, t: number, dir: 1 | -1, scanBeam: boolean) => {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(dir, 1);

      // Soft dust puffs kicked up behind rear wheel
      for (let d = 0; d < 3; d++) {
        const phase = (t * 2.4 + d * 0.33) % 1;
        ctx.fillStyle = `rgba(203, 213, 225, ${(0.35 * (1 - phase)).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(-18 - phase * 18, 4 - phase * 7, 2.2 + phase * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chassis
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 10, 4);
      ctx.fill();
      ctx.stroke();

      // Gold foil thermal accent
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8, -8, 12, 6);

      // Camera mast & glowing blue optical eye
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -10);
      ctx.lineTo(10, -19);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, -23, 10, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(13, -20, 2, 0, Math.PI * 2);
      ctx.fill();

      if (scanBeam) {
        const beamGrad = ctx.createLinearGradient(14, -20, 48, 4);
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(14, -20);
        ctx.lineTo(48, -4);
        ctx.lineTo(44, 6);
        ctx.closePath();
        ctx.fill();
      }

      // Rotating wheels with tread spokes
      for (const wx of [-10, 0, 10]) {
        ctx.save();
        ctx.translate(wx, 3);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const spokeAngle = t * 6 * dir;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(spokeAngle) * -3, Math.sin(spokeAngle) * -3);
        ctx.lineTo(Math.cos(spokeAngle) * 3, Math.sin(spokeAngle) * 3);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    };

    const drawDome = (cx: number, cy: number, solid: boolean, glow: string, t: number, popScale = 1) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(popScale, popScale);
      ctx.translate(-cx, -cy);

      if (!solid) {
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -t * 24;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 42, Math.PI, 0);
        ctx.lineTo(cx + 42, cy + 14);
        ctx.lineTo(cx - 42, cy + 14);
        ctx.closePath();
        ctx.stroke();

        // Pulsing placement target ring
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(34, 211, 238, ${(0.25 + pulse * 0.45).toFixed(2)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, 48 + pulse * 5, 8 + pulse * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Exterior glow aura
        const aura = ctx.createRadialGradient(cx, cy - 8, 8, cx, cy - 8, 56);
        aura.addColorStop(0, `${glow}33`);
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 56, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 42, Math.PI, 0);
        ctx.lineTo(cx + 42, cy + 14);
        ctx.lineTo(cx - 42, cy + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dome structural ribs
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 20, 42, 0, Math.PI, 0);
        ctx.stroke();

        // Warm interior viewport glow
        ctx.fillStyle = 'rgba(251, 191, 36, 0.84)';
        ctx.beginPath();
        ctx.roundRect(cx - 17, cy - 16, 34, 14, 5);
        ctx.fill();
      }
      ctx.restore();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Deep space gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#020510');
      bg.addColorStop(0.62, '#071127');
      bg.addColorStop(1, '#121e36');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Camera gentle parallax drift
      const camX = Math.sin(t * 0.45) * 6;

      // Twinkling starfield
      for (let i = 0; i < 48; i++) {
        const sx = ((i * 97 + 19 + camX * 0.25 + w) % w);
        const sy = ((i * 53 + 11) % (h * 0.6));
        const alpha = 0.28 + 0.62 * Math.abs(Math.sin(t * 1.6 + i * 0.8));
        ctx.fillStyle = i % 7 === 0 ? `rgba(186, 230, 253, ${alpha.toFixed(2)})` : `rgba(241, 245, 249, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 4 === 0 ? 1.7 : 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing Earth rising in black sky
      ctx.save();
      const ex = w * 0.86 + camX * 0.35;
      const ey = h * 0.21;
      const halo = ctx.createRadialGradient(ex, ey, 16, ex, ey, 34);
      halo.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(ex, ey, 34, 0, Math.PI * 2);
      ctx.fill();

      const eg = ctx.createRadialGradient(ex - 7, ey - 7, 3, ex, ey, 22);
      eg.addColorStop(0, '#93c5fd');
      eg.addColorStop(0.58, '#1d4ed8');
      eg.addColorStop(1, '#091430');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // Distant lunar cratered ridge silhouettes
      const horizonY = h * 0.72;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, horizonY - 6);
      ctx.quadraticCurveTo(w * 0.18 + camX * 0.4, horizonY - 30, w * 0.38, horizonY - 8);
      ctx.quadraticCurveTo(w * 0.65 + camX * 0.4, horizonY - 26, w, horizonY - 12);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Foreground Lunar South Pole Surface
      const groundGrad = ctx.createLinearGradient(0, horizonY - 10, 0, h);
      groundGrad.addColorStop(0, '#475569');
      groundGrad.addColorStop(0.35, '#334155');
      groundGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = groundGrad;
      ctx.beginPath();
      ctx.moveTo(0, horizonY + 8);
      ctx.quadraticCurveTo(w * 0.22 + camX, horizonY - 12, w * 0.48 + camX, horizonY + 4);
      ctx.quadraticCurveTo(w * 0.75 + camX, horizonY + 12, w, horizonY - 6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.3)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Subtle foreground craters
      for (const [cxPos, rxRad] of [
        [w * 0.14 + camX, 18],
        [w * 0.85 + camX, 22],
      ]) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cxPos, horizonY + 26, rxRad, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (step === 0) {
        // 3-Stage Progressive Construction Loop: Laser Outline -> Titanium Ribs -> Glowing Dome + Waving Crew
        const cycle = (t % 5.4) / 5.4;
        const hx = w * 0.52;
        if (cycle < 0.28) {
          drawDome(hx, horizonY, false, '#22d3ee', t);
          ctx.fillStyle = '#67e8f9';
          ctx.font = 'bold 11px Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('STAGE 1: LASER SURVEY', hx, horizonY - 52);
        } else if (cycle < 0.56) {
          const rise = Math.min(1, (cycle - 0.28) / 0.22);
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(hx, horizonY, 42 * rise, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(hx, horizonY, 20 * rise, 42 * rise, 0, Math.PI, 0);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 11px Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('STAGE 2: TITANIUM SHELL RISING', hx, horizonY - 52);
        } else {
          drawDome(hx, horizonY, true, '#34d399', t);
          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 11px Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('STAGE 3: AIRTIGHT HOME ONLINE ✓', hx, horizonY - 52);

          // Waving astronauts near cozy viewport
          const wave = Math.sin(t * 7) * 4;
          for (const offset of [-12, 12]) {
            const ax = hx + offset;
            const ay = horizonY + 8;
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(ax, ay - 6, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(ax - 2.5, ay - 8, 5, 3);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(ax - 3.5, ay - 1, 7, 10);
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ax + 3, ay + 1);
            ctx.lineTo(ax + 8, ay - 4 + wave);
            ctx.stroke();
          }
        }

        // Rover scanning beside the construction pad
        const roverX = w * 0.2 + Math.sin(t * 0.7) * 26;
        drawRover(roverX, horizonY + 8, t, 1, true);
      } else if (step === 1) {
        // Unfolding Sunlit Solar Wings + Animated Power Orbs + Charging Battery Bars -> Habitat
        const sunPulse = 20 + Math.sin(t * 2.5) * 2.5;
        const sunGlow = ctx.createRadialGradient(48, 50, 6, 48, 50, 40);
        sunGlow.addColorStop(0, '#fef08a');
        sunGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.55)');
        sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(48, 50, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(48, 50, sunPulse * 0.85, 0, Math.PI * 2);
        ctx.fill();

        const px = w * 0.3;
        const py = horizonY - 4;
        // Sunlight beams
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -t * 42;
        for (const dy of [-12, 0, 12]) {
          ctx.beginPath();
          ctx.moveTo(68, 54 + dy * 0.5);
          ctx.lineTo(px - 14, py - 18 + dy);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Tilting/unfolding solar wing
        const tilt = -0.22 + Math.sin(t * 1.4) * 0.08;
        ctx.save();
        ctx.translate(px, py - 12);
        ctx.rotate(tilt);
        ctx.fillStyle = '#1d4ed8';
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.fillRect(-24, -12, 48, 22);
        ctx.strokeRect(-24, -12, 48, 22);
        ctx.strokeStyle = 'rgba(191, 219, 254, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(-8, 10);
        ctx.moveTo(8, -12);
        ctx.lineTo(8, 10);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px - 3, py - 2, 6, 12);

        // Battery Bank with animated charge bars
        const bx = w * 0.53;
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx - 18, py - 18, 36, 28, 5);
        ctx.fill();
        ctx.stroke();
        const bars = 1 + (Math.floor(t * 2.5) % 4);
        ctx.fillStyle = '#34d399';
        for (let b = 0; b < bars; b++) {
          ctx.fillRect(bx - 12, py + 3 - b * 5.5, 24, 3.8);
        }
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+45 kW', bx, py - 26);

        // Armored power cable + 3 racing energy sparks
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(px + 22, py + 4);
        ctx.lineTo(w * 0.74, py + 4);
        ctx.stroke();
        for (let s = 0; s < 3; s++) {
          const span = w * 0.74 - (px + 22);
          const orbX = px + 22 + ((t * 115 + s * (span / 3)) % span);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(orbX, py + 4, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        drawDome(w * 0.79, horizonY, true, '#fbbf24', t);
      } else if (step === 2) {
        // Simultaneous Water Pipeline + Spinning Air Scrubber & Oxygen Maker
        drawDome(w * 0.5, horizonY, true, '#38bdf8', t);

        // Left: Water Tank with rippling water level
        const wx = w * 0.2;
        ctx.fillStyle = '#082f49';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(wx - 20, horizonY - 30, 40, 38, 6);
        ctx.fill();
        ctx.stroke();
        const waterLevel = 16 + Math.sin(t * 3) * 3;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.fillRect(wx - 17, horizonY + 5 - waterLevel, 34, waterLevel);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('H₂O TANK', wx, horizonY - 36);

        // Water pipe + droplets to Habitat
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wx + 20, horizonY - 6);
        ctx.lineTo(w * 0.42, horizonY - 6);
        ctx.stroke();
        for (let d = 0; d < 2; d++) {
          const span = w * 0.42 - (wx + 20);
          const dropX = wx + 20 + ((t * 78 + d * (span / 2)) % span);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(dropX, horizonY - 6, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Right: Spinning Air Scrubber + O2 Bubbles
        const ax = w * 0.8;
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(ax - 20, horizonY - 30, 40, 38, 6);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.translate(ax, horizonY - 11);
        ctx.rotate(t * 5);
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2.5;
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -10);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('O₂ SCRUBBER', ax, horizonY - 36);

        // Fresh O2 bubbles flowing inward
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ax - 20, horizonY - 6);
        ctx.lineTo(w * 0.58, horizonY - 6);
        ctx.stroke();
        for (let b = 0; b < 2; b++) {
          const span = ax - 20 - w * 0.58;
          const o2X = ax - 20 - ((t * 78 + b * (span / 2)) % span);
          ctx.fillStyle = '#a7f3d0';
          ctx.beginPath();
          ctx.arc(o2X, horizonY - 6 + Math.sin(t * 6 + b) * 2, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (step === 3) {
        // Laser Ground Scan Comparison: Bright Flat Plateau vs Steep Boulder Crater
        const scanSweep = ((t * 80) % (w * 0.36));

        // Left: Good flat ridge
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(34, 40, w * 0.41, 96, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(70, 70, 12, 0, Math.PI * 2);
        ctx.fill();
        // Flat bright surface line + sweep beam
        ctx.fillStyle = '#475569';
        ctx.fillRect(46, 102, w * 0.36, 10);
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(48 + scanSweep, 52);
        ctx.lineTo(48 + scanSweep, 104);
        ctx.stroke();
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 11.5px Nunito, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('92% SUN · FLAT 5° ✓', 52, 127);

        // Right: Steep shadow crater
        ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
        ctx.strokeStyle = '#fb7185';
        ctx.beginPath();
        ctx.roundRect(w * 0.53, 40, w * 0.41, 96, 12);
        ctx.fill();
        ctx.stroke();
        // Jagged slope + dark shadow
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(w * 0.56, 70);
        ctx.lineTo(w * 0.68, 108);
        ctx.lineTo(w * 0.88, 110);
        ctx.lineTo(w * 0.88, 114);
        ctx.lineTo(w * 0.56, 114);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fda4af';
        ctx.fillText('28% SUN · STEEP SHADOW ✕', w * 0.56, 127);

        drawRover(w * 0.25 + Math.sin(t) * 28, horizonY + 8, t, 1, true);
      } else {
        // Step 4: Interactive dotted preview -> spring snap-in + glowing wire!
        drawDome(w * 0.36, horizonY, true, '#34d399', t);
        const sinceFlip = Math.min(1, (now - demoFlipTimeRef.current) / 380);
        const popScale = demoBuilt
          ? 1 + Math.sin(sinceFlip * Math.PI) * 0.12 * (1 - sinceFlip)
          : 1;
        drawDome(w * 0.67, horizonY, demoBuilt, demoBuilt ? '#34d399' : '#22d3ee', t, popScale);
        if (demoBuilt) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(w * 0.44, horizonY - 4);
          ctx.lineTo(w * 0.59, horizonY - 4);
          ctx.stroke();
          for (let i = 0; i < 2; i++) {
            const px = w * 0.44 + ((t * 68 + i * 38) % (w * 0.15));
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, horizonY - 4, 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        drawRover(w * 0.16, horizonY + 8, t * 0.2, 1, !demoBuilt);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [step, demoBuilt]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={216}
      className="w-full h-44 sm:h-52 rounded-2xl border border-slate-700 bg-[#030713]"
    />
  );
};

export const BuildPhaseExperience: React.FC<{
  roverName: string;
  onCompleteIntro: () => void;
}> = ({ roverName, onCompleteIntro }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [demoBuilt, setDemoBuilt] = useState(false);

  const slide = BUILD_SLIDES[stepIndex] ?? BUILD_SLIDES[0];

  useEffect(() => {
    audioEngine.speakOnce(`phase3_story_step_${stepIndex}`, slide.astroSpeech, 'warm');
  }, [stepIndex, slide.astroSpeech]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/78">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Phase 3 Construction Story & Tutorial"
        className="max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-[#071022] border-2 border-emerald-400/80 p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Hammer className="w-3.5 h-3.5" />
            {slide.badge}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => audioEngine.speak(slide.astroSpeech, 'warm')}
              className="btn-space btn-space-sm btn-space-slate gap-1.5 text-sky-200"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              Replay Voice
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.stopSpeech();
                onCompleteIntro();
              }}
              className="btn-space btn-space-sm btn-space-slate gap-1"
            >
              Skip Tutorial
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-hero text-2xl sm:text-3xl text-white leading-tight">
            {slide.title}
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">{slide.caption}</p>
        </div>

        <BuildStoryCanvas step={stepIndex} demoBuilt={demoBuilt} />

        {/* Interactive hands-on practice on Step 5 */}
        {stepIndex === 4 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-cyan-500/12 border border-cyan-400/60">
            <span className="text-xs text-cyan-100 font-semibold">
              {demoBuilt
                ? 'Awesome! Module placed & wired to Habitat!'
                : 'Try clicking the dotted blueprint preview right now:'}
            </span>
            <button
              type="button"
              onClick={() => {
                audioEngine.playBuild();
                audioEngine.playCableConnect();
                setDemoBuilt((v) => !v);
              }}
              className="btn-space btn-space-sm btn-space-cyan font-bold"
            >
              {demoBuilt ? 'Reset Preview' : 'Tap Dotted Outline ✓'}
            </button>
          </div>
        )}

        <div className="px-3.5 py-2.5 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-xs sm:text-sm text-sky-100">
          <strong className="text-amber-300 mr-1.5">{roverName}:</strong>“{slide.astroSpeech}”
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {BUILD_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Jump to step ${idx + 1}`}
                onClick={() => setStepIndex(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === stepIndex ? 'w-7 bg-emerald-400' : 'w-2.5 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="btn-space btn-space-md btn-space-slate gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {stepIndex < BUILD_SLIDES.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setStepIndex((i) => i + 1);
                }}
                className="btn-space btn-space-md btn-space-emerald gap-1.5 font-bold"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playDiscovery();
                  audioEngine.stopSpeech();
                  onCompleteIntro();
                }}
                className="btn-space btn-space-md btn-space-amber gap-1.5 font-bold"
              >
                <Play className="w-4 h-4 fill-current" />
                Open Outpost Builder!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Interactive Single-Module Explainer Modal (Replayable Anytime) */
export const ModuleExplainerModal: React.FC<{
  type: StructureType;
  roverName: string;
  onClose: () => void;
}> = ({ type, roverName, onClose }) => {
  const [pulseActive, setPulseActive] = useState(true);
  const def = STRUCTURES[type];

  useEffect(() => {
    audioEngine.speak(`${def.name}. ${def.astroIntro} ${def.connectionNote}`, 'warm');
  }, [def.name, def.astroIntro, def.connectionNote]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${def.name} Visual Guide`}
        className="max-w-lg w-full rounded-3xl bg-[#081122] border-2 border-cyan-400 p-5 sm:p-6 shadow-2xl space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Module Guide · {def.shortRole}
          </span>
          <button
            type="button"
            onClick={() => {
              audioEngine.stopSpeech();
              onClose();
            }}
            aria-label="Close module guide"
            className="btn-space btn-space-icon btn-space-slate"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-hero text-2xl sm:text-3xl text-white">{def.name}</h3>

        {/* Animated Interactive Module Blueprint + Power/Water/Air Flow */}
        <svg viewBox="0 0 420 144" className="w-full h-36 rounded-2xl bg-[#040914] border border-slate-700">
          {/* Dotted blueprint ghost on left */}
          <rect
            x="24"
            y="26"
            width="108"
            height="92"
            rx="16"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          >
            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.4s" repeatCount="indefinite" />
          </rect>
          <text x="78" y="132" textAnchor="middle" fill="#67e8f9" fontSize="9.5" fontWeight="700">
            DOTTED BLUEPRINT SPOT
          </text>

          {/* Animated arrow from blueprint -> Working Module */}
          <line x1="138" y1="72" x2="178" y2="72" stroke="#34d399" strokeWidth="3" strokeDasharray="5 4">
            {pulseActive && <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.8s" repeatCount="indefinite" />}
          </line>

          {/* Highlighted Working Module Showcase */}
          <rect x="184" y="20" width="212" height="102" rx="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

          {(type === 'solar' || type === 'battery' || type === 'cable') && (
            <>
              <circle cx="218" cy="46" r="12" fill="#fbbf24" />
              <line x1="234" y1="50" x2="278" y2="66" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 3">
                {pulseActive && <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />}
              </line>
              <rect x="276" y="48" width="42" height="36" rx="6" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="2" />
              <line x1="320" y1="68" x2="366" y2="68" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="372" cy="68" r="12" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
              <text x="290" y="106" textAnchor="middle" fill="#fde047" fontSize="10" fontWeight="700">
                {type === 'battery' ? 'STORES SOLAR ENERGY' : 'GENERATES +45 kW POWER'}
              </text>
            </>
          )}

          {(type === 'water' || type === 'food') && (
            <>
              <rect x="210" y="42" width="44" height="50" rx="8" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
              <line x1="258" y1="68" x2="322" y2="68" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4">
                {pulseActive && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />}
              </line>
              <circle cx="344" cy="68" r="18" fill="#0f766e" stroke="#5eead4" strokeWidth="2" />
              <text x="290" y="110" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="700">
                {type === 'food' ? 'RECYCLED WATER GROWS GREENS' : 'CLEAN WATER LOOP → HABITAT'}
              </text>
            </>
          )}

          {(type === 'air' || type === 'oxygen' || type === 'habitat' || type === 'shielding') && (
            <>
              <path d="M 218 82 A 34 34 0 0 1 286 82 Z" fill="#1e293b" stroke="#34d399" strokeWidth="2.2" />
              <rect x="234" y="64" width="36" height="10" rx="4" fill="#fbbf24" fillOpacity="0.8" />
              <line x1="292" y1="68" x2="352" y2="68" stroke="#34d399" strokeWidth="3" strokeDasharray="6 4">
                {pulseActive && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />}
              </line>
              <circle cx="362" cy="68" r="14" fill="#065f46" stroke="#6ee7b7" strokeWidth="2" />
              <text x="290" y="108" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="700">
                {type === 'shielding'
                  ? 'BLOCKS RADIATION PARTICLES'
                  : type === 'habitat'
                  ? 'CENTRAL HOME HUB'
                  : 'CLEAN O₂ & CO₂ AIR LOOP'}
              </text>
            </>
          )}
        </svg>

        <p className="text-xs sm:text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
          <strong className="text-amber-300 mr-1">{roverName}:</strong>“{def.astroIntro}”
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-slate-400 font-bold mb-0.5">Where It Works Best</div>
            <div className="text-slate-100">{def.whyLocationMatters}</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-slate-400 font-bold mb-0.5">Connection</div>
            <div className="text-emerald-300 font-semibold">{def.connectionNote}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setPulseActive((v) => !v);
              audioEngine.speak(`${def.name}. ${def.astroIntro} ${def.connectionNote}`, 'warm');
            }}
            className="btn-space btn-space-sm btn-space-slate gap-1.5 text-sky-200"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            Explain Again
          </button>
          <button
            type="button"
            onClick={() => {
              audioEngine.stopSpeech();
              onClose();
            }}
            className="btn-space btn-space-sm btn-space-emerald gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
