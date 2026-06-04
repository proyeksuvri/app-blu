# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server di localhost:3000
npm run build    # production build
npm run start    # jalankan production build
npm run lint     # ESLint (Next.js config, ESLint 9)
```

Tidak ada test runner — belum dikonfigurasi.

## Arsitektur

**Stack:** Next.js 16.2.6 · React 19 · Tailwind CSS v4 · TypeScript 5 (strict) · App Router

**Struktur App Router:**
- `app/layout.tsx` — root layout: font Geist (sans + mono via CSS vars), Tailwind `antialiased`, dark mode support
- `app/page.tsx` — halaman utama (Server Component by default)
- `app/globals.css` — global styles Tailwind

**Path alias:** `@/*` → root (contoh: `@/app/...`, `@/components/...`)

**Tailwind v4** — konfigurasi lewat `postcss.config.mjs`, bukan `tailwind.config.js`. Tidak ada file `tailwind.config` terpisah.

**Docs Next.js versi ini:** `node_modules/next/dist/docs/`

## Konvensi

- UI copy dan komentar kode dalam **Bahasa Indonesia**
- Semua komponen baru pakai TypeScript strict (sudah aktif di tsconfig)
- Server Components by default; tambahkan `"use client"` hanya bila perlu interaktivitas

## Panduan Perilaku

Bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**Guidelines berhasil jika:** diff lebih bersih, lebih sedikit rewrite karena overcomplication, pertanyaan klarifikasi datang sebelum implementasi bukan setelah kesalahan.

## gstack

Gunakan skill `/browse` dari gstack untuk semua penjelajahan web. Jangan pernah gunakan alat `mcp__claude-in-chrome__*`.

Skill yang tersedia:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

---

## 5. Shadcn Component Rule

**Selalu cek MCP shadcn sebelum implement komponen UI apapun.**

- Gunakan `mcp__shadcn__get_item_examples_from_registries` untuk kode contoh exact
- Gunakan `mcp__shadcn__view_items_in_registries` untuk struktur & props komponen
- Gunakan `mcp__shadcn__search_items_in_registries` untuk cari komponen tersedia

Jangan tebak API shadcn dari training data — selalu fetch registry live.

**Kenapa:** shadcn sering update API. Contoh breaking change yang sudah terjadi di proyek ini:
- `asChild` → `render` prop (Base UI)
- `hsl(var(--chart-N))` → `var(--chart-N)` untuk oklch color space (Tailwind v4)
- Tooltip manual recharts → `ChartTooltipContent` shadcn

**Warna CSS variables:** proyek pakai oklch (Tailwind v4). Jangan wrap dengan `hsl()`.
Gunakan: `color: "var(--chart-1)"` bukan `color: "hsl(var(--chart-1))"`.

**Semantic tokens wajib:** selalu pakai token semantik, jangan hardcode warna.
- `text-foreground` bukan `text-white` / `text-black`
- `border-border` bukan `border-white/10`
- `bg-muted` bukan `bg-zinc-800`
- `bg-primary text-primary-foreground` bukan `bg-white text-zinc-900`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
