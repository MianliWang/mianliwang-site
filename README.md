# mianliwang-site
Personal website + toolbox built with Next.js (EN/ZH).

## Setup
```bash
pnpm install
pnpm dev
```

## Core checks
```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Motion system
The motion runtime is productized with a shared provider:
- `components/motion/MotionProvider.tsx`: centralized motion state, quality control, auto degrade/upgrade logic, and feature switches.
- `components/motion/Cursor.tsx` + `components/motion/Spotlight.tsx`: share one pointer `requestAnimationFrame` loop via `lib/motion/pointer-runtime.ts`.
- `components/motion/ReadingGuide.tsx`: consumes provider state so the guide is disabled when motion system is forced off.

### Quality modes
Supported modes: `Auto`, `High`, `Medium`, `Low`, `Off`.

- `Auto`: starts high, degrades step-by-step when average frame time stays high, upgrades slowly after sustained recovery.
- `High/Medium/Low/Off`: manual override.
- Pointer-based effects are forced off when:
  - `prefers-reduced-motion: reduce`
  - coarse/touch pointer (no `pointer:fine` + `hover:hover`)

### Dev panel
In development mode, a motion panel appears at bottom-right:
- Live FPS and average frame ms
- Current mode + effective quality
- Degrade reason / disable reason
- Toggles for Cursor / Spotlight / Reading Guide
- Manual quality override buttons

### How to test auto degrade
1. Run `pnpm dev` and open any page with pointer effects on desktop.
2. Keep mode on `AUTO` in the dev panel.
3. Create CPU load (for example, open many tabs/processes) and move cursor continuously.
4. Watch quality drop from `HIGH -> MEDIUM -> LOW` with reason updates.
5. Remove load and keep interacting; quality should recover slowly.

### How to test manual override
1. Open dev panel.
2. Click one of `AUTO/HIGH/MEDIUM/LOW/OFF`.
3. Verify:
   - `OFF`: Cursor/Spotlight/ReadingGuide become inactive.
   - `LOW`: Spotlight is disabled first; cursor remains lightweight.
   - `HIGH`: full motion resumes (subject to reduced-motion and pointer capability).
