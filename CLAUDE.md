@AGENTS.md

## Development

- Vercel is the effective dev server. Test changes against the Vercel preview/production deployment, not localhost.
- Push to main after each task is complete so changes can be verified on Vercel.

---

## Site overview — "Works in Progress" (Matchbox Studio)

An internal feed of creative experiments. Users post titled cards with body copy, image/video assets, and tags; others comment, react, and get notifications. The feed has a bespoke animated presentation layer (shrinking header, infinite-loop scroll, FLIP card expansion, spring-driven interactions).

### Stack

- **Next.js 16** (App Router, React 19). Note: `AGENTS.md` warns this Next is breaking-changed from training data — **always read `node_modules/next/dist/docs/` before writing Next APIs**.
- **Supabase** for auth, Postgres, Realtime, Storage. SSR client at `src/lib/supabase/server.ts`, browser client at `src/lib/supabase/client.ts`, middleware session refresh at `src/lib/supabase/middleware.ts` (wired via `src/middleware.ts`).
- **TanStack Query v5** — client-side cache & infinite queries. Server prefetches via `HydrationBoundary`.
- **Motion** (formerly framer-motion, `motion/react`) — all animations. `layoutId` FLIPs, `useScroll`/`useTransform` for scroll-linked motion, springs everywhere.
- **Tailwind v4** + **shadcn/ui** (components in `src/components/ui/`). Custom tokens in `src/app/globals.css` (`--page-bg`, `--text-dark`, `--text-caption`). Heading font = `parabolica` (loaded via Typekit in root layout); body = Geist.
- **Tiptap** (comment editor with mentions), **react-markdown** (post body), **GSAP** (horizontal loop utility), **cmdk**, **base-ui**.
- **Sentry** (`@sentry/nextjs`) for error tracking. Configs at repo root (`sentry.{server,edge}.config.ts`) + `src/instrumentation{,-client}.ts`. Client events tunnel through `/monitoring` to bypass ad blockers. DSN in `NEXT_PUBLIC_SENTRY_DSN`; build-time source-map uploads use `SENTRY_AUTH_TOKEN`. All provisioned by the Vercel Marketplace integration. The Sentry MCP server is registered in `.mcp.json` — coding agents can query issues directly.

### Routing

Two route groups under `src/app/`:

- `(auth)/` — public. `login/page.tsx`, `auth/callback/route.ts` for OAuth/magic-link return.
- `(app)/` — authenticated shell. `layout.tsx` is an **async server component** that fetches the user's profile (for onboarding detection) and post count. Provider stack: `Providers` (TanStack) → `ExpansionProvider` → `UploadModalProvider` → `LayoutGroupWrapper` (Motion) → `TooltipProvider`. Renders `<ShrinkingHeader/>`, `<main/>`, `<BottomActionGroup/>`, `{modal}` slot, `<OverlayPortal/>`, `<UploadModalPortal/>`. Conditionally renders `<OnboardingOverlay/>` (z-[60]) for users with `onboarding_complete = false`.
- Parallel `@modal` slot + intercepting route `(.)post/[id]` gives card → overlay transitions with shareable URLs. The intercepted page is a no-op (`return null`) — the actual overlay is rendered by `OverlayPortal` reading from `ExpansionContext`, so the card hide and overlay appear are truly zero-gap within the same React tree.
- `/` redirects to `/feed`. The route `post/[id]/page.tsx` exists only for OG metadata (`generateMetadata`) — its page body client-redirects to `/feed`. There is no full-page post view; all post viewing happens through the expanded card overlay.
- Public OG image route at `src/app/api/og/[id]/route.tsx` returns a 1200×630 `ImageResponse` for unfurls. It falls back to generic branding when RLS denies (no service role yet).
- Middleware (`src/middleware.ts`) runs Supabase session refresh on every non-static request and redirects unauthed users to `/login`. **Exempted paths:** `/login`, `/auth`, `/api/og/*` (so OG crawlers can fetch the unfurl image without a session), and `/monitoring` (Sentry's browser-event tunnel — auth middleware would reject unauthed client errors).

### The feed (the visually complex part)

`src/app/(app)/feed/page.tsx`:
1. Server prefetches the newest page via `getFeedPosts` RPC (`get_feed_posts` Postgres function — handles tag filter + keyset pagination by `created_at`). As of migration `00016`, the RPC returns `setof posts`, so the client can chain `.select()` for joined data (author, assets, post_tags, counts) in a single round-trip without a follow-up `.in()` query or manual reorder.
2. Batch-fetches signed storage URLs via `getSignedUrls`, stitches onto first image asset per post.
3. Dehydrates the `QueryClient` and hands off to `<FeedClient/>`.

`FeedClient` (`src/components/feed/feed-client.tsx`):
- Uses `useFeedPosts` infinite query.
- Listens for `window.scrollY >= 0.4 * innerHeight` (the shrinking-header spacer height) and latches `headerCollapsed = true`. Once collapsed + ≥3 posts, enables `LoopScrollContainer`.

`ShrinkingHeader` (`src/components/feed/shrinking-header.tsx`):
- Uses a 40svh spacer as the scroll target. `useScroll` + `useTransform` drive `fontSize` 64→24, vertical position from centered-in-spacer to `top-4`, and `mixBlendMode` flipping to `"difference"` past 50% progress. All motion values — no re-renders.

`LoopScrollContainer` (`src/components/feed/loop-scroll-container.tsx`):
- When enabled, renders a BufferGrid (first N posts, up to 20) after the main grid. On window scroll, if `scrollY >= bottomBufferTop`, teleports by `(bottomBufferTop - mainTop)` so bottom-buffer content lands in the visually identical position at the top of main content. RAF-gated via `isTeleportingRef`. Adds `loop-active` class to `<html>` to hide scrollbars (CSS in `globals.css`).
- See `docs/solutions/ui-bugs/` and `docs/brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md` for prior work on this.

`FeedGrid`:
- 3-column dense grid, `perspective: 1000px`. Portrait posts (`height > width`) span 2 rows.
- Stagger delays computed by `computeStaggerDelays` (80ms within row, 60ms extra between rows).
- IntersectionObserver sentinel (`rootMargin: 400px`) drives infinite-scroll fetch.

`ExperimentCard`:
- `motion.div` with `layoutId={`card-${post.id}`}` — this is the FLIP source. Entrance animates `y/z/scale/opacity/blur` springs (tunable via `CardSpringConfig`).
- **Image loading:** Three-layer progressive reveal — dominant color bg (instant) → ThumbHash blurry preview (decoded from `thumb_hash` via `thumbHashToPlaceholderURL`) → full image crossfade (500ms `onLoad` transition). Both the card and expanded overlay share this pattern. Assets without `thumb_hash` fall back to white bg + fade-in.
- **Video in feed cards:** Videos autoplay muted and looping via `FeedVideo` (`src/components/feed/feed-video.tsx`), which uses IntersectionObserver (50% threshold) to play/pause based on visibility and releases the buffer on unmount. No player controls are shown. Poster frames (extracted at upload time by `src/lib/video-thumbnail.ts`) serve as the `poster` attribute for instant visual before playback starts. The poster WebP is stored in `assets.poster_path`. `LazyVideo` (`src/components/post/lazy-video.tsx`) is a separate component for the `MediaGallery` detail panel (IO-based lazy mount with native controls).
- On hover, preloads the image + prefetches comments (`prefetchComments(post.id)`).
- On click, calls `expand(data)` from `ExpansionContext`, which `setPostData(...)` + `window.history.pushState` to `/post/{id}` (URL changes without re-render).
- When this card is the lifted one, sets `opacity: 0` but keeps grid space (so the overlay's `layoutId` flies from this position).

`ExpansionContext` (`src/components/expanded/expansion-context.tsx`):
- Holds current expanded post data + a comment cache (`Map<postId, CommentData[]>`).
- `expand`: set state + `history.pushState(/post/:id)`.
- `collapse`: if `historyAlreadyBack` flag isn't set, calls `history.back()` to pop the pushed entry. The `OverlayPortal`'s `popstate` listener calls `collapse(true)` so forward/back buttons work correctly.
- `prefetchComments`: single-flight via `fetchingRef: Set<string>`.

### Onboarding overlay

`OnboardingOverlay` (`src/components/onboarding/onboarding-overlay.tsx`):
- Fullscreen `z-[60]` overlay for first-time users (`profiles.onboarding_complete = false`).
- 6-phase state machine: `circle-entrance` → `color-picker` → `confirm-visible` → `morphing` → `greeting` → `fade-out`.
- `ColorPicker` (`color-picker.tsx`): draggable 48px circle; position maps to WCAG AA-safe HSL color via `positionToColor()` from `src/lib/color-utils.ts` (angle → hue, distance → lightness, clamped to 4.5:1 contrast against `#F7F8F8`).
- On Enter, the circle FLIP-morphs into a tag pill (`layoutId="onboarding-badge"` shared between circle and pill within `<LayoutGroup id="onboarding">`). The chosen color is saved to `profiles.color`.
- Greeting text ("Howdy," + "There are N works in progress.") uses `easeOutExpo` with staggered delays.
- On fade-out complete, sets `onboarding_complete = true` and unmounts.
- All animations gate on `useReducedMotion()`.

### Posts, comments, reactions, notifications

- Queries live in `src/lib/queries/` (`posts.ts`, `comments.ts`, `reactions.ts`, `notifications.ts`, `storage.ts`, `tags.ts`).
- `createPost` calls the `create_post_with_relations` RPC (migration `00014`) so post + tag upserts + asset inserts run in a single transaction. **Don't reintroduce the sequential-insert pattern** — failures used to leave orphan posts.
- `createComment` validates the `mentions[]` array against real `profiles.id` rows before insert, then writes through the `mentions` table whose RLS only allows the comment author to write/delete (also from `00014`).
- Realtime: `use-realtime-comments.ts`, `use-realtime-notifications.ts` subscribe to Supabase Realtime channels.
- Comment editor uses Tiptap + a mention plugin backed by `/api/mentions/search/route.ts`.
- Storage: Supabase storage with RLS; `signed-url-cache.ts` caches signed URLs client-side; server batch-fetches with `getSignedUrls`.

### Data model (supabase/migrations/)

`profiles` (+ `color text`, `onboarding_complete boolean` from `00020`), `posts`, `assets` (post media + width/height + display_order + thumb_hash + dominant_color for placeholders + poster_path for video poster frames), `tags` + `post_tags`, `comments` (threaded), `reactions`, `mentions`, `notifications`, DB triggers (`00009_create_triggers.sql`), storage bucket config (`00010` + `00013`), `get_feed_posts` RPC + reverse index on `post_tags(tag_id)` (`00011` — note the file name "create_post_stats" is misleading; there is no `post_stats` table), `create_post_with_relations` RPC + tightened mentions RLS (`00014`), ThumbHash placeholder columns on assets (`00019`), onboarding fields on profiles (`00020`), video poster_path on assets (`00021`). RLS on every table — policies key off `auth.uid()`.

### Conventions

- `"use client"` only where needed; server components fetch via `createClient()` from `@/lib/supabase/server`.
- Path alias `@/*` → `src/*`.
- shadcn registry configured in `components.json`.
- Author badge colors: `getAuthorColor(name, profileColor?)` in `src/lib/utils.ts` checks the user's stored `profiles.color` first, falls back to the hash-based palette. All badge call sites pass `author.color` from the joined profile data.
- **Profile color for focus rings:** `ProfileColorInjector` (rendered in app layout) sets `--ring` and `--profile-color` CSS custom properties on `<html>` to the current user's chosen color. All shadcn `focus-visible:ring-ring/50` classes automatically use this. The server layout passes the color as `serverColor` to prevent flash. Use `useProfileColor()` hook (TanStack Query-cached) instead of fetching `profiles.color` directly — it shares one fetch across all consumers with server-prefilled initial data.
- Spring configs tend to be co-located or tunable live via `<SpringTuner/>` — check `src/components/feed/spring-tuner.tsx` before guessing spring values.

### Gotchas

- **Don't trust training-data Next/React APIs.** Read `node_modules/next/dist/docs/` for anything nontrivial (per `AGENTS.md`).
- **Don't break the loop scroll.** The teleport math depends on `BufferGrid` being layout-identical to `FeedGrid` and living in the same containing block. If you change grid CSS, change both.
- **FLIP depends on `layoutId` stability + shared `LayoutGroupWrapper`.** If card expand feels wrong, check the card's `opacity: 0` while lifted, the overlay's matching `layoutId`, and that the overlay renders inside `LayoutGroupWrapper`.
- **URL and expanded state are split.** `expand()` manages history imperatively; the intercepting route exists only to make `/post/:id` a real URL. Don't try to make the intercepting route render the overlay — it was deliberately made a no-op.
- **`.in()` doesn't preserve order.** Any time we fetch by a list of IDs, re-sort client-side (see `getFeedPosts`).
- **Overlay animations must respect `useReducedMotion()`.** `ExpandedPostOverlay` already gates its springs; if you add new Motion components inside the overlay, do the same. The container is a `role="dialog"` with focus trap + restore — don't break the trap by rendering focusable elements outside `containerRef`.
- **Posts must be created via the RPC, not direct inserts.** Atomicity matters; `createPost` is the only call site, keep it the only one.
- **Video autoplay is visibility-gated.** `FeedVideo` pauses videos when <50% visible and releases buffers on unmount. If you add more video elements, use `FeedVideo` (feed/overlay, no controls) or `LazyVideo` (detail panel, native controls) — never bare `<video>` tags. The expanded overlay also autoplays video via `FeedVideo`.
- **Test on Vercel, not localhost** (per `feedback_test_on_vercel.md` memory).
- **Sentry configs have `sendDefaultPii: false` for a reason.** Supabase auth cookies carry session tokens. Never flip that flag to `true` — it would ship session tokens to a third party. Same for adding `Sentry.setUser({...})` with raw emails; use `profiles.id` only.

---

## Maintenance

**Update this file when major structural changes land** — new route groups, new top-level contexts/providers, swapped libraries, significant animation-system rewrites, data-model changes that ripple into components, or anything that would make this overview misleading. A `PreToolUse` hook on `git commit` prints a reminder (`.claude/settings.json`).
