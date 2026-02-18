# AGENTS.md — Personal site + Toolbox (Next.js / App Router)

> Prime directive:
> 1) Understand THIS repo first (tokens, components, motion, content pipeline).
> 2) Then borrow patterns from references.
> 3) Never do blind rewrites.

---

## 0) Repo Reality (read this first)
This repo is already:
- Next.js (App Router) + React + TypeScript + Tailwind v4 + next-intl + next-themes
- Locale prefix routing: `/en`, `/zh`
- Has a motion/background system (rAF, IntersectionObserver, ambient background, starfield renderer with capability gating)
- Has a toolbox framework + several tools (Base64/Text/Translate/PDF translate proxy)
- Has server routes for AMA + Translate

Codex MUST NOT assume a fresh template. Work with what exists.

---

## 1) What success looks like (non-negotiables)
- High-craft UI details (Rauno-ish) but simplified, maintainable.
- IA / structure close to Brian Lovin: clear sections, strong hierarchy.
- Subtle “breathing” background (ambient, low contrast, never distracting).
- Slightly larger typography for readability (Jason Santa Maria vibe), CJK-friendly.
- Interaction polish like Josh Comeau: clear and consistent.
- Must include: light/dark toggle, locale switch, basic visitor interactions (AMA), Toolbox section.
- SEO is not a priority beyond correct metadata / OG basics.

---

## 2) Operating rules for Codex (workflow)
### 2.1 Always start with a Repo Understanding Report
Before any non-trivial change, produce a short report:
- Router map (pages + API routes)
- Where design tokens live + how they’re applied
- UI primitives inventory (Button/Card/Input etc.)
- Motion/background architecture + feature flags + reduced-motion handling
- Content pipeline (writing/projects data source + i18n)
- Env vars used + production risks
Then propose a small PR plan.

### 2.2 Constraints
- No framework swaps unless explicitly requested.
- No “big-bang refactor”. Prefer small PRs.
- Keep existing conventions (naming, file structure, tokens).
- Every PR must pass:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`

---

## 3) Tech stack (current phase)
- Next.js (App Router) + React + TypeScript
- Styling: Tailwind v4 + CSS variables tokens
- i18n: next-intl (locale prefix)
- Theme: next-themes (system + toggle)
- Motion:
  - Prefer CSS (transform/opacity/filter) + rAF only when needed
  - Framer Motion allowed only for choreographed transitions that are hard in CSS
- No WebGPU/WebGL requirements in phase 1 (but keep capability gates for optional background renderer)

---

## 4) Commands (Codex must use these)
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Start: `pnpm start`

Definition of Done for any PR-sized change:
- lint/typecheck/build all pass
- no obvious scroll/pointer jank
- reduced-motion remains usable
- EN/ZH + light/dark all look coherent

---

## 5) Design tokens + typography system
### 5.1 Token source of truth
- Tokens live in `app/globals.css` (CSS variables + Tailwind v4 `@theme inline`)
- Do NOT introduce a separate token system.

### 5.2 Type system (CJK-friendly)
- Define a clear hierarchy:
  - Display / H1 / H2 / H3
  - Body / Small / Caption
- Line-height must be comfortable for both EN and ZH (avoid cramped CJK).
- Use `font-feature-settings` / `text-rendering` carefully; avoid “over-smoothing”.

### 5.3 Layout rhythm
- Use a content max width token (e.g., `--content-max`) and consistent section spacing.
- Establish “surface levels”:
  - background
  - surface-1 (cards)
  - surface-2 (hovered/raised)
  - overlay (menus/tooltips)
- Use ONE global accent color for:
  - primary buttons
  - active nav
  - focus ring
No rainbow UI.

### 5.4 Component consistency
Nav / Buttons / Toggles / Inputs must share:
- hover
- active
- focus-visible
- disabled
- pressed/selected (for toggles)

---

## 6) Background system (must feel alive, but subtle)
Goal: breathing ambient background with low distraction and low banding.

### 6.1 Layered background (home + global)
Use 3 layers:
1) Base gradient (stable)
2) 2–3 huge radial blobs drifting VERY slowly (40–90s)
   - tiny position shift, tiny hue shift
   - no flashing
3) Grain/noise overlay (very low opacity) to reduce banding

Reduced motion:
- `prefers-reduced-motion: reduce` => stop drifting; keep base + grain only.

### 6.2 Performance
- Blob animation must be transform-only.
- Grain should be a static image or CSS noise pattern (low opacity).
- Keep paints cheap; avoid animating large box-shadows.

---

## 7) Interaction / motion policy (phase gating)
### Phase A: “craft baseline”
- Make hover/active/focus consistent everywhere.
- Make theme + locale switching feel smooth (not abrupt).
- No custom cursor/spotlight in Phase A (unless explicitly enabled later).

### Phase B: “Rauno-ish choreography”
- Add spatial transitions (menus/tooltips, toggles, HUD)
- Add scroll-linked reading HUD refinements (no overlap)
- Still respect reduced-motion as a first-class contract

### Theme/Locale transitions
- Switching theme/locale should NOT “hard jump”.
- Use:
  - short crossfade on background layer
  - subtle content fade/translate (small distance)
  - preserve layout stability (no reflow flashes)

---

## 8) Content system / blog pipeline (bilingual)
### 8.1 Current state (do not break)
- Writing content is stored in `messages/en.json` and `messages/zh.json`.
- Pages read those dictionaries.

### 8.2 How the user adds content TODAY (must keep simple)
#### Add a blog post (current pipeline)
1) Add an article entry to `messages/en.json` under `Writing.articles`
2) Add the same `slug` entry to `messages/zh.json`
3) Ensure slug unique, sections non-empty
4) Verify `pnpm build`

#### Add / edit projects
- Projects should follow the same model as Writing:
  - keep a data list in `messages/*.json` (Phase A),
  - and render cards from that list.

### 8.3 Future content pipeline upgrade (optional, later)
If/when migrating to MDX, propose a minimal bilingual structure:
- `content/writing/<slug>.en.mdx`
- `content/writing/<slug>.zh.mdx`
- typed frontmatter (title/date/tags/summary)
- build-time index generation
Candidates:
- Contentlayer or a lightweight MDX loader
- remark/rehype plugins for headings, code blocks, math, etc.

Do NOT implement migration unless explicitly requested. Provide a plan first.

---

## 9) Toolbox scope
### Phase A
- Base64 encode/decode
- Text utilities (format/clean)
- Text translate UI (server API)
- PDF translate UI (proxy to FastAPI service)

### Later (do NOT implement now)
- P2P transfer (wormhole-like)
- Personal video calling
- mzML viewer (separate project)

Toolbox rule:
- Users do NOT write arbitrary code.
- All tools must be “product UI” with guardrails.

---

## 10) Backend strategy (sane defaults)
- Phase A: Next.js Route Handlers for lightweight features
- Use Upstash for production-safe persistence + rate limiting
- Never rely on file writes in serverless production
- Phase B/C: separate FastAPI for heavy processing (PDF translate/BabelDOC pipeline)

---

## 11) Performance rules (hard constraints)
- Use rAF + CSS variables for pointer/scroll effects
- Animate only `transform` / `opacity` / `filter`
- Use IntersectionObserver (avoid scroll listeners when possible)
- Respect `prefers-reduced-motion`
- Avoid gradient banding (grain overlay + gentle contrast)
- Avoid heavy effects on large surfaces

Optional “quality scaling” (nice-to-have):
- Detect low FPS / low cores / save-data => reduce blob count, stop extra effects

---

## 12) Accessibility (non-negotiable)
- Keyboard navigation first-class
- `:focus-visible` must be clear and consistent
- No motion-only affordances
- Reduced-motion is a separate design contract, not a broken version

---

## 13) Reference repos / sources (high signal)
> Codex should copy PATTERNS, not wholesale aesthetics.

### 13.1 Bento layout / card interaction / templates
- https://github.com/magicuidesign/magicui (motion-ready UI blocks; bento grid patterns)
- https://github.com/shadcn-ui/ui (primitives, composable UI patterns)
- https://github.com/braydoncoyer/braydoncoyer.dev (Next.js portfolio patterns)
- https://github.com/brianlovin/briOS (information architecture / sections)
- https://github.com/ArjunAranetaCodes/Next-JS-Portfolio-Bento-Template (bento portfolio starter)
- https://github.com/mkhoirulwafa18/bentofolio (bento portfolio variant)

### 13.2 Content system / blog pipeline (MDX / plugins)
- https://github.com/timlrx/tailwind-nextjs-starter-blog (battle-tested blog pipeline)
- https://github.com/mdx-js/mdx (MDX core)
- https://github.com/remarkjs/remark (remark ecosystem)
- https://github.com/rehypejs/rehype (rehype ecosystem)
- https://github.com/contentlayerdev/contentlayer (typed content pipeline option)
Suggested plugin set (choose minimally):
- remark-gfm, remark-breaks
- rehype-slug, rehype-autolink-headings
- shiki/rehype-pretty-code (for code highlighting)

### 13.3 Motion / choreography / spatial transitions
- Rauno interfaces guidelines: https://github.com/raunofreiberg/interfaces
- Floating UI (tooltips/menus positioning & interactions): https://github.com/floating-ui/floating-ui
- react-spring (springs): https://github.com/pmndrs/react-spring
- use-gesture (pointer/drag gestures): https://github.com/pmndrs/use-gesture
- Radix primitives (accessible overlays): https://github.com/radix-ui/primitives
Optional (only if needed):
- Framer Motion: https://github.com/framer/motion

### 13.4 Inspiration targets (do not clone blindly)
- Rauno craft demos (micro interactions + spatial tooltips)
- Devouring Details (reading guidance + progress affordances)
- antfu.me (ambient background)
- Josh Comeau (interaction polish)
- Brittany Chiang (spotlight concept — later phase)
- Jason Santa Maria (readability + typographic confidence)

---

## 14) Versioning policy (dependencies)
- Prefer stable, recent minor versions.
- Keep majors pinned; avoid uncontrolled major bumps.
- Use pnpm lockfile as the source of truth.
- Add `engines` / `.nvmrc` once Node baseline is decided (prevent drift).

---

## 15) PR acceptance checklist
- lint/typecheck/build pass
- EN/ZH and light/dark verified
- reduced-motion verified
- hover/active/focus consistent
- no “mystery dots” / debug markers in production UI
