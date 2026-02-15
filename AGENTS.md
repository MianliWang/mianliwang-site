# AGENTS.md — Personal Site + Toolbox (Next.js App Router)

Owner: Mianli Wang
Project: personal site with high-craft UI + a small toolbox of useful utilities.

---

## 0) What success looks like (non-negotiables)
- A personal site with high-craft UI details (inspired by Rauno / Devouring Details), simplified and maintainable.
- Layout / IA close to Brian Lovin’s site structure (clear sections, strong hierarchy).
- Subtle “breathing” background like antfu (ambient, low contrast, never distracting).
- Slightly larger typography for readability (Jason Santa Maria vibe).
- Smooth interactions like Josh Comeau (polish + clarity).
- Must include:
  - Light/dark mode toggle (system + manual)
  - Bilingual (ZH/EN) with language switch
  - Basic visitor interaction (AMA / message)
  - Toolbox section (Base64, text utilities, doc translate UI in phase 1)
- No SEO work beyond basic metadata/OG. No keyword chasing.

---

## 1) Tech stack (phase 1)
- Next.js (App Router) + React + TypeScript
- Styling: Tailwind CSS v4 + CSS variables for theming
- Theme: next-themes (system + toggle)
- i18n: prefer `next-intl` (App Router friendly)
- Motion:
  - Prefer CSS (transform/opacity/filter) + requestAnimationFrame for pointer-tracking
  - Framer Motion allowed ONLY when it clearly improves choreography; do not make it a hard dependency for everything
- No WebGPU/WebGL in phase 1 unless proven necessary.

---

## 2) Repository conventions
- Package manager: pnpm
- Lockfile is mandatory: commit `pnpm-lock.yaml`
- Use strict TypeScript, keep components small, avoid over-abstraction.
- Avoid heavy UI libraries that fight custom design.
- Keep all pointer/scroll effects isolated and easy to disable.

Recommended structure:
- `app/` routes + pages
- `components/` UI building blocks
- `components/motion/` pointer + scroll systems (easy to disable for reduced motion)
- `lib/` utilities (formatters, base64, translate client wrappers, etc.)
- `messages/` i18n dictionaries (`en.json`, `zh.json`)
- `public/` static assets (grain textures, etc.)

---

## 3) Commands (Codex must use these)
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck` (or `pnpm tsc -p .`)
- Build: `pnpm build`
- Start (prod): `pnpm start`

Definition of Done (for any PR-sized change):
- `pnpm lint` + `pnpm typecheck` pass
- `pnpm build` passes
- No obvious animation jank (scroll + pointer move stays smooth)
- Respects prefers-reduced-motion

---

## 4) Design references (what to borrow)
Primary:
- Rauno craft demos: micro-interactions, spatial tooltips, natural focus/keyboard navigation.
- Devouring Details: progress/scroll affordances + “high-contrast dot” paragraph guidance (BUT: no full-height line across the screen).

Secondary:
- Brian Lovin: overall architecture & sectioning.
- antfu: ambient background “breathing” (subtle).
- Jason Santa Maria: larger type scale & comfortable reading.
- Josh Comeau: interactive polish.

Links:
- Rauno craft: https://rauno.me/craft
- Rauno interfaces repo: https://github.com/raunofreiberg/interfaces
- Devouring Details: https://devouringdetails.com/
- Brian Lovin: https://brianlovin.com/
- antfu: https://antfu.me/
- Jason Santa Maria: https://jasonsantamaria.com/
- Josh Comeau: https://www.joshwcomeau.com/
- Brittany Chiang (spotlight vibe): https://brittanychiang.com/

---

## 5) Interaction specs (make it feel right)

### 5.1 Cursor system (desktop only)
- Use a circular “iPad-like” cursor.
- Cursor has 2 layers:
  1) small core dot (high contrast)
  2) larger soft halo (very subtle)
- On interactive elements (links/buttons/cards):
  - cursor smoothly morphs (scale + opacity)
  - can “snap” toward element center with spring-like easing (subtle, not gimmicky)
- On touch devices: disable custom cursor; fall back to native.

### 5.2 Spotlight / light projection (desktop)
- A soft radial spotlight follows the cursor (like Brittany Chiang).
- Must avoid visible gradient banding:
  - Do NOT rely on large CSS masks fading to near-black
  - Prefer a subtle noise/grain texture layer (e.g., a tiny tiled PNG) OR grainy gradient technique
- Spotlight intensity is low; it should never overpower content.

### 5.3 Scroll progress + paragraph guidance (Devouring Details-inspired)
- Provide a progress indicator that responds to scroll.
- When user scrolls into a section/paragraph, move a single high-contrast dot to the paragraph start.
- Do NOT draw a single long line spanning the entire viewport height.
- Keep it minimal, elegant, information-bearing.

### 5.4 Spatial tooltips + image tab focus
- Tooltips should feel “spatial” (anchored, smart offset, no jitter).
- Keyboard navigation should move focus naturally across interactive clusters.
- In image/tab UI, focus movement should feel smooth and intentional (no jumpy layout shift).

### 5.5 Accessibility & motion preferences
- Respect `prefers-reduced-motion`:
  - disable cursor morphing, heavy transitions, and rAF-driven parallax
- Ensure keyboard navigation is first-class:
  - visible focus rings
  - logical tab order
  - skip-to-content link on top
- Ensure color contrast is acceptable in both themes.

---

## 6) Bilingual (ZH/EN) requirements
- Support `zh` and `en`.
- Must provide a visible language switch.
- Preferred routing:
  - `/zh/...` and `/en/...` (locale prefix)
- Default:
  - use system language on first visit, remember user choice.
- All nav labels, headings, and key UI strings must be localized.
- Content can be partially localized in phase 1; but UI must be complete.

---

## 7) Toolbox (phase 1 scope)
- Tools are “apps” with clear UI; users do NOT write arbitrary Python code.
- Phase 1 tools:
  - Base64 encode/decode
  - Text utilities (format/clean, etc.)
  - Document translation UI (file upload → server/API → translated output)
- Later (phase 2/3; do not implement now):
  - P2P transfer (wormhole-like)
  - Personal video calling (high quality)
  - mzML viewer (separate project for now)

---

## 8) API / backend strategy
- Phase 1:
  - Keep simple visitor interactions (AMA/message) as Next.js Route Handlers in `app/api/.../route.ts`
  - Avoid heavy infra; use a simple storage strategy (to be decided when implementing)
- Phase 2:
  - Add separate FastAPI service for heavier processing (translation pipelines, data processing)
- Never introduce complex infra (TURN server, WebRTC signaling, auth) in phase 1.

---

## 9) Performance rules (hard constraints)
- Pointer-follow effects:
  - use one `requestAnimationFrame` loop + CSS variables
  - animate only `transform` / `opacity` / `filter` (avoid layout thrash)
  - avoid expensive blur/shadow animations on large surfaces
- Keep main thread light during scroll:
  - prefer IntersectionObserver for section detection
  - avoid scroll listeners that do heavy work
- Avoid gradient banding in dark UI:
  - prefer grain/noise overlay
- Use Next.js Image component for images; avoid layout shift.
- Ensure 60fps baseline; target high refresh displays by keeping paint costs low.

---

## 10) Dependency strategy (avoid conflicts, stay modern)
- Keep versions modern but stable; lock with pnpm lockfile.
- Prefer a small dependency surface.
- If adding a library:
  - justify why it’s needed
  - ensure it doesn’t fight custom design
  - ensure it doesn’t add significant runtime cost

---

## 11) Codex environment expectations
- Codex should run:
  - `pnpm install`
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- If Codex environment blocks network, enable proxy network access.
- Enable container cache to speed up repeated installs.

---

## 12) References (implementation / docs)
- OpenAI Codex: AGENTS.md guide — https://developers.openai.com/codex/guides/agents-md/
- Next.js App Router docs — https://nextjs.org/docs
- Next.js Image (App Router) — https://nextjs.org/docs/app/api-reference/components/image
- next-themes — https://github.com/pacocoursey/next-themes
- Grainy gradients idea — https://css-tricks.com/grainy-gradients/
- Vercel Web Interface Guidelines — https://vercel.com/design/guidelines
