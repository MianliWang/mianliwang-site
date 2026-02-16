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

## AMA storage
AMA data storage supports two backends:
- `file` (default): writes to `data/ama-messages.json`, good for local/dev.
- `upstash`: shared Redis REST storage for multi-instance deployments.

Set via `.env`:
```bash
AMA_STORAGE_BACKEND=file
# or
AMA_STORAGE_BACKEND=upstash
AMA_RATE_LIMIT_BACKEND=memory
# or
AMA_RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
AMA_UPSTASH_KEY=ama:messages
AMA_UPSTASH_RATE_PREFIX=ama:rate
```

## Phase 2 PDF translation service (FastAPI)

An independent FastAPI service is available at `services/pdf-translate-api`:
- endpoint: `POST /translate/pdf`
- purpose: upload PDF -> BabelDOC translation -> return downloadable translated/bilingual PDF
- contract: `services/pdf-translate-api/openapi.yaml`

Run it locally with Docker Compose:
```bash
copy services\pdf-translate-api\.env.example services\pdf-translate-api\.env
docker compose -f docker-compose.translate.yml up --build
```

Service docs after startup:
- `http://localhost:8080/docs`
- `http://localhost:8080/openapi.json`

## Motion system
The motion runtime is productized with a shared provider:
- `components/motion/MotionProvider.tsx`: centralized motion state, quality control, auto degrade/upgrade logic, and feature switches.
- `components/motion/Cursor.tsx` + `components/motion/Spotlight.tsx`: share one pointer `requestAnimationFrame` loop via `lib/motion/pointer-runtime.ts`.
- `components/motion/ReadingHUD.tsx`: reading HUD with compact progress + active paragraph dot for article pages.
- `components/motion/ReadingGuide.tsx`: compatibility wrapper around `ReadingHUD` for older demo pages.

### Quality modes
Supported modes: `Auto`, `High`, `Medium`, `Low`, `Off`.

- `Auto`: starts high, degrades step-by-step when average frame time stays high, upgrades slowly after sustained recovery.
- `High/Medium/Low/Off`: manual override.
- Pointer-based effects (cursor/spotlight) are forced off when:
  - `prefers-reduced-motion: reduce`
  - coarse/touch pointer (no `pointer:fine` + `hover:hover`)
- Reading HUD remains available without pointer support and degrades to direct positioning under reduced motion.

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
