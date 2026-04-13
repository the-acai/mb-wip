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

### Routing

Two route groups under `src/app/`:

- `(auth)/` — public. `login/page.tsx`, `auth/callback/route.ts` for OAuth/magic-link return.
- `(app)/` — authenticated shell. `layout.tsx` stacks: `Providers` (TanStack) → `ExpansionProvider` → `UploadModalProvider` → `LayoutGroupWrapper` (Motion) → `TooltipProvider`. Renders `<ShrinkingHeader/>`, `<main/>`, `<SendItButton/>`, `{modal}` slot, `<OverlayPortal/>`, `<UploadModalPortal/>`.
- Parallel `@modal` slot + intercepting route `(.)post/[id]` gives card → overlay transitions with shareable URLs. The intercepted page is a no-op (`return null`) — the actual overlay is rendered by `OverlayPortal` reading from `ExpansionContext`, so the card hide and overlay appear are truly zero-gap within the same React tree.
- `/` redirects to `/feed`. Detail route `post/[id]/page.tsx` is the full-page fallback for direct links / no-JS, and exports `generateMetadata` + uses batched `getSignedUrls` for the asset gallery.
- Public OG image route at `src/app/api/og/[id]/route.tsx` returns a 1200×630 `ImageResponse` for unfurls. It falls back to generic branding when RLS denies (no service role yet).
- Middleware (`src/middleware.ts`) runs Supabase session refresh on every non-static request and redirects unauthed users to `/login`. **Exempted paths:** `/login`, `/auth`, and `/api/og/*` (so OG crawlers can fetch the unfurl image without a session).

### The feed (the visually complex part)

`src/app/(app)/feed/page.tsx`:
1. Server prefetches the newest page via `getFeedPosts` RPC (`get_feed_posts` Postgres function — handles tag filter + keyset pagination by `created_at`).
2. Re-orders `.in()` results to match the RPC order (Supabase doesn't preserve `in()` order).
3. Batch-fetches signed storage URLs via `getSignedUrls`, stitches onto first image asset per post.
4. Dehydrates the `QueryClient` and hands off to `<FeedClient/>`.

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
- On hover, preloads the image + prefetches comments (`prefetchComments(post.id)`).
- On click, calls `expand(data)` from `ExpansionContext`, which `setPostData(...)` + `window.history.pushState` to `/post/{id}` (URL changes without re-render).
- When this card is the lifted one, sets `opacity: 0` but keeps grid space (so the overlay's `layoutId` flies from this position).

`ExpansionContext` (`src/components/expanded/expansion-context.tsx`):
- Holds current expanded post data + a comment cache (`Map<postId, CommentData[]>`).
- `expand`: set state + `history.pushState(/post/:id)`.
- `collapse`: if `historyAlreadyBack` flag isn't set, calls `history.back()` to pop the pushed entry. The `OverlayPortal`'s `popstate` listener calls `collapse(true)` so forward/back buttons work correctly.
- `prefetchComments`: single-flight via `fetchingRef: Set<string>`.

### Posts, comments, reactions, notifications

- Queries live in `src/lib/queries/` (`posts.ts`, `comments.ts`, `reactions.ts`, `notifications.ts`, `storage.ts`, `tags.ts`).
- `createPost` calls the `create_post_with_relations` RPC (migration `00014`) so post + tag upserts + asset inserts run in a single transaction. **Don't reintroduce the sequential-insert pattern** — failures used to leave orphan posts.
- `createComment` validates the `mentions[]` array against real `profiles.id` rows before insert, then writes through the `mentions` table whose RLS only allows the comment author to write/delete (also from `00014`).
- Realtime: `use-realtime-comments.ts`, `use-realtime-notifications.ts` subscribe to Supabase Realtime channels.
- Comment editor uses Tiptap + a mention plugin backed by `/api/mentions/search/route.ts`.
- Storage: Supabase storage with RLS; `signed-url-cache.ts` caches signed URLs client-side; server batch-fetches with `getSignedUrls`. Both feed and `/post/[id]` use the batch variant.

### Data model (supabase/migrations/)

`profiles`, `posts`, `assets` (post media + width/height + display_order), `tags` + `post_tags`, `comments` (threaded), `reactions`, `mentions`, `notifications`, DB triggers (`00009_create_triggers.sql`), storage bucket config (`00010` + `00013`), `get_feed_posts` RPC + reverse index on `post_tags(tag_id)` (`00011` — note the file name "create_post_stats" is misleading; there is no `post_stats` table), `create_post_with_relations` RPC + tightened mentions RLS (`00014`). RLS on every table — policies key off `auth.uid()`.

### Conventions

- `"use client"` only where needed; server components fetch via `createClient()` from `@/lib/supabase/server`.
- Path alias `@/*` → `src/*`.
- shadcn registry configured in `components.json`.
- Author badge colors derived from name hash via `getAuthorColor` in `src/lib/utils.ts`.
- Spring configs tend to be co-located or tunable live via `<SpringTuner/>` — check `src/components/feed/spring-tuner.tsx` before guessing spring values.

### Gotchas

- **Don't trust training-data Next/React APIs.** Read `node_modules/next/dist/docs/` for anything nontrivial (per `AGENTS.md`).
- **Don't break the loop scroll.** The teleport math depends on `BufferGrid` being layout-identical to `FeedGrid` and living in the same containing block. If you change grid CSS, change both.
- **FLIP depends on `layoutId` stability + shared `LayoutGroupWrapper`.** If card expand feels wrong, check the card's `opacity: 0` while lifted, the overlay's matching `layoutId`, and that the overlay renders inside `LayoutGroupWrapper`.
- **URL and expanded state are split.** `expand()` manages history imperatively; the intercepting route exists only to make `/post/:id` a real URL. Don't try to make the intercepting route render the overlay — it was deliberately made a no-op.
- **`.in()` doesn't preserve order.** Any time we fetch by a list of IDs, re-sort client-side (see `getFeedPosts`).
- **Overlay animations must respect `useReducedMotion()`.** `ExpandedPostOverlay` already gates its springs; if you add new Motion components inside the overlay, do the same. The container is a `role="dialog"` with focus trap + restore — don't break the trap by rendering focusable elements outside `containerRef`.
- **Posts must be created via the RPC, not direct inserts.** Atomicity matters; `createPost` is the only call site, keep it the only one.
- **Test on Vercel, not localhost** (per `feedback_test_on_vercel.md` memory).

---

## Maintenance

**Update this file when major structural changes land** — new route groups, new top-level contexts/providers, swapped libraries, significant animation-system rewrites, data-model changes that ripple into components, or anything that would make this overview misleading. A `PreToolUse` hook on `git commit` prints a reminder (`.claude/settings.json`).
