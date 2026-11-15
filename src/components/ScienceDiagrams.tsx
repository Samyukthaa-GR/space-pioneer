import React from 'react';
import { DiagramKind } from '../game/types';

export const ScienceDiagram: React.FC<{ kind?: DiagramKind }> = ({ kind }) => {
  if (!kind) return null;

  if (kind === 'sunlight') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        <circle cx="34" cy="24" r="14" fill="#fbbf24" />
        <line x1="48" y1="26" x2="290" y2="54" stroke="#fde047" strokeWidth="2.5" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.4s" repeatCount="indefinite" />
        </line>
        <line x1="46" y1="30" x2="185" y2="75" stroke="#fde047" strokeWidth="2" strokeOpacity="0.45" />
        <path d="M 0 92 L 75 90 L 115 106 L 175 106 L 210 54 L 265 46 L 320 75 L 320 120 L 0 120 Z" fill="#475569" />
        <path d="M 105 92 L 122 106 L 168 106 L 185 88 Z" fill="#0f172a" />
        <text x="145" y="100" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="700">Cold Dark Crater</text>
        <text x="242" y="38" textAnchor="middle" fill="#fde047" fontSize="9.5" fontWeight="700">Sunlit Ridge</text>
        <text x="145" y="114" textAnchor="middle" fill="#94a3b8" fontSize="8">Frozen water clues hide here</text>
      </svg>
    );
  }

  if (kind === 'scanner' || kind === 'regolith' || kind === 'rover_path') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        <g>
          <rect x="42" y="54" width="52" height="28" rx="6" fill="#e2e8f0" />
          <rect x="52" y="60" width="32" height="12" rx="3" fill="#eab308" />
          <rect x="78" y="32" width="8" height="24" fill="#cbd5e1" />
          <rect x="72" y="24" width="22" height="14" rx="4" fill="#f8fafc" />
          <circle cx="52" cy="86" r="8" fill="#334155" />
          <circle cx="86" cy="86" r="8" fill="#334155" />
          {/* Articulated robotic scoop arm */}
          <path d="M 94 70 L 136 82 L 150 76" stroke="#94a3b8" strokeWidth="4" fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values="-6 94 70; 8 94 70; -6 94 70" dur="2.2s" repeatCount="indefinite" />
          </path>
        </g>
        <polygon points="94,31 205,62 205,94" fill="#38bdf8" fillOpacity="0.24">
          <animate attributeName="fill-opacity" values="0.14;0.34;0.14" dur="1.5s" repeatCount="indefinite" />
        </polygon>
        <line x1="94" y1="31" x2="205" y2="76" stroke="#38bdf8" strokeWidth="2" />
        <polygon points="200,88 216,60 245,62 256,88" fill="#94a3b8" />
        <text x="228" y="48" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">Scoop & Test Samples</text>
        <text x="160" y="108" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Gather Moon soil & ice clues for your lab</text>
      </svg>
    );
  }

  if (kind === 'solar') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        {/* 1. Sunlight */}
        <circle cx="30" cy="48" r="14" fill="#fbbf24" />
        <text x="30" y="79" textAnchor="middle" fill="#fde047" fontSize="8" fontWeight="700">1. Sunlight</text>

        <line x1="46" y1="48" x2="78" y2="48" stroke="#fde047" strokeWidth="2.5" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="14" to="0" dur="0.9s" repeatCount="indefinite" />
        </line>

        {/* 2. Solar Panels */}
        <g>
          <rect x="78" y="32" width="48" height="32" rx="5" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2">
            <animateTransform attributeName="transform" type="rotate" values="-4 102 48; 3 102 48; -4 102 48" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <line x1="82" y1="48" x2="122" y2="48" stroke="#93c5fd" strokeWidth="1" />
        </g>
        <text x="102" y="79" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="700">2. Panels</text>

        <line x1="128" y1="48" x2="160" y2="48" stroke="#eab308" strokeWidth="3.5" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
        </line>

        {/* 3. Power System */}
        <rect x="160" y="30" width="52" height="36" rx="6" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
        <text x="186" y="47" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="800">POWER</text>
        <text x="186" y="58" textAnchor="middle" fill="#a7f3d0" fontSize="7">Battery</text>
        <text x="186" y="79" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="700">3. Storage</text>

        <line x1="214" y1="48" x2="246" y2="48" stroke="#34d399" strokeWidth="3.5" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
        </line>

        {/* 4. Equipment */}
        <rect x="246" y="30" width="58" height="36" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <text x="275" y="47" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontWeight="700">OUTPOST</text>
        <text x="275" y="58" textAnchor="middle" fill="#7dd3fc" fontSize="7">Air · Heat</text>
        <text x="275" y="79" textAnchor="middle" fill="#7dd3fc" fontSize="8" fontWeight="700">4. Equipment</text>

        <text x="160" y="106" textAnchor="middle" fill="#94a3b8" fontSize="8">
          Sunlight → Solar Panels → Power System → Habitat & Life Support (Simulated Model)
        </text>
      </svg>
    );
  }

  if (kind === 'temperature') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        <path d="M 46 86 A 42 42 0 0 1 130 86 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <text x="88" y="76" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">HABITAT</text>
        <rect x="148" y="34" width="28" height="54" rx="14" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <rect x="157" y="46" width="10" height="32" rx="5" fill="#f97316">
          <animate attributeName="height" values="16;34;16" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y" values="62;44;62" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="198" y="40" width="90" height="44" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
        <text x="243" y="59" textAnchor="middle" fill="#fde047" fontSize="10" fontWeight="700">Close Louver</text>
        <text x="243" y="74" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">+ Boost Heaters</text>
      </svg>
    );
  }

  if (kind === 'shielding') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        <line x1="25" y1="28" x2="98" y2="50" stroke="#f97316" strokeWidth="2.5" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.1s" repeatCount="indefinite" />
        </line>
        <line x1="20" y1="54" x2="96" y2="66" stroke="#f97316" strokeWidth="2.5" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.1s" repeatCount="indefinite" />
        </line>
        <line x1="30" y1="80" x2="98" y2="82" stroke="#f97316" strokeWidth="2.5" />
        <path d="M 102 30 Q 124 24 134 94 L 100 94 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
        <path d="M 155 94 A 46 46 0 0 1 247 94 Z" fill="#e2e8f0" />
        <circle cx="201" cy="76" r="10" fill="#38bdf8" />
        <text x="117" y="108" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Regolith Wall</text>
        <text x="201" y="108" textAnchor="middle" fill="#34d399" fontSize="8.5">Safe Habitat</text>
        <text x="58" y="20" textAnchor="middle" fill="#fb923c" fontSize="8.5">Particles Blocked</text>
      </svg>
    );
  }

  if (kind === 'particles') {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
        <circle cx="38" cy="60" r="20" fill="#f97316" />
        <path d="M 65 44 L 138 38 M 65 60 L 142 60 M 65 76 L 138 82" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />
        </path>
        <rect x="150" y="34" width="140" height="52" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <text x="220" y="54" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">1. Solar Alert = Warning</text>
        <text x="220" y="72" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">2. Shelter Crew Inside</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-[#070d1a] border border-slate-700/80">
      <rect x="34" y="34" width="76" height="52" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="72" y="64" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">HABITAT</text>
      <path d="M 112 50 L 194 50" stroke="#34d399" strokeWidth="3" strokeDasharray="6 4">
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.1s" repeatCount="indefinite" />
      </path>
      <path d="M 194 72 L 112 72" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4">
        <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1.1s" repeatCount="indefinite" />
      </path>
      <rect x="196" y="34" width="92" height="52" rx="10" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
      <text x="242" y="57" textAnchor="middle" fill="#34d399" fontSize="9.5" fontWeight="700">
        {kind === 'water' ? 'WATER LOOP' : 'CO₂ SCRUBBER'}
      </text>
      <text x="242" y="73" textAnchor="middle" fill="#94a3b8" fontSize="8">
        {kind === 'water' ? 'Clean & Recycle' : 'Removes stale CO₂'}
      </text>
    </svg>
  );
};
