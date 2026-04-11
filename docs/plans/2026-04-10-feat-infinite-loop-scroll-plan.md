---
title: "feat: Infinite Looping Scroll on Feed Grid"
type: feat
date: 2026-04-10
brainstorm: docs/brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md
---

# feat: Infinite Looping Scroll on Feed Grid

## Overview

After the "WORKS IN PROGRESS" headline finishes its shrink animation, the feed becomes a seamless, bidirectional infinite loop. Scrolling down past the last post wraps to the first; scrolling up past the first wraps to the last. No visual seam. Content is progressive — the loop starts with loaded posts and expands as more pages are fetched.

## Problem Statement

The feed currently has a definite end. Once the user scrolls past the last loaded post, they either hit a loading spinner (if more pages exist) or empty space. This breaks the immersive, gallery-like experience. An infinite loop turns the feed into a living, explorable surface where content is always visible.

## Proposed Solution

**Scroll-position teleportation within an inner scroll container**, a refinement of the brainstorm's approach that solves the header interaction problem identified during spec analysis.

### Why an inner scroll container?

The `ShrinkingHeader` uses `useScroll({ target: spacerRef })` to track the 40svh spacer. If teleportation operated on `document.body`, every `scrollTo` call could cause the header to flash between collapsed/expanded states — violating the "completely seamless" requirement. An inner scroll container isolates the loop from the header entirely:

1. User scrolls the document normally through the 40svh spacer (header shrinks)
2. Once the spacer is fully scrolled past (`scrollYProgress >= 1`), the inner container activates
3. Document scroll is locked; the inner container now owns scrolling
4. The header stays permanently collapsed at 24px pinned to `top-4`
5. Teleportation operates only within the inner container — the header never reacts

### Alternatives Considered

See [brainstorm](../brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md) for full comparison. Summary:

| Approach | Verdict |
|----------|---------|
| GSAP vertical loop | Rejected — incompatible with CSS Grid dense auto-flow |
| Triple-buffer translate | Rejected — 3x memory, hard to integrate progressive loading |
| Document-level teleportation | Refined — header interaction makes this fragile |
| **Inner container + teleportation** | **Chosen** — isolates loop from header cleanly |

## Technical Approach

### Architecture

```
DOM structure after loop activation:

<body style="overflow: hidden">                    ← document scroll locked
  <div class="min-h-screen">
    <ShrinkingHeader />                            ← fixed, stays collapsed
    <LoopScrollContainer                           ← NEW: fixed, fills viewport below header
      style="position: fixed; top: 40px; inset-inline: 0; bottom: 0; overflow-y: auto"
    >
      <div class="buffer buffer-top">              ← clones of LAST N posts
        <InertCard /> <InertCard /> ...
      </div>
      <div class="main-content" ref={mainRef}>     ← the real posts
        <FeedGrid posts={posts} />
        <div ref={sentinelRef} />                  ← pagination sentinel
      </div>
      <div class="buffer buffer-bottom">           ← clones of FIRST N posts
        <InertCard /> <InertCard /> ...
      </div>
    </LoopScrollContainer>
    <main class="px-6 pb-...">                     ← hidden once loop is active
      {children}
    </main>
    <SendItButton />
    <OverlayPortal />
    <UploadModalPortal />
  </div>
</body>
```

### Key Concepts

**Buffer zones**: Clones of posts rendered at each end of the scrollable area. The top buffer contains clones of the last ~1.5 viewport heights of posts. The bottom buffer contains clones of the first ~1.5 viewport heights of posts. These provide visual continuity at the seam.

**Teleportation**: When `scrollTop` enters a buffer zone past a threshold, `container.scrollTo({ top: newPosition, behavior: 'instant' })` jumps to the equivalent position in the main content, creating the illusion of infinite scroll.

**Inert cards**: Buffer zone cards are rendered as plain styled divs (no `motion.div`, no `layoutId`, no `whileInView`, no click handlers). They match the visual appearance of real cards but are non-interactive. This solves the `layoutId` duplication problem.

**Activation**: The loop activates when `scrollYProgress >= 1` on the header spacer. Below a minimum post threshold (content height < 2x viewport height), the loop is disabled and normal finite scroll is used.

### Implementation Phases

#### Phase 1: LoopScrollContainer shell

Create the container component and the activation mechanism.

**New file:** `src/components/feed/loop-scroll-container.tsx`

- Accepts `children`, `isActive` prop
- When inactive: renders nothing (children render in normal document flow via `<main>`)
- When active: renders a `position: fixed` container below the header, with `overflow-y: auto`
- Manages its own `scrollTop` state

**Modify:** `src/components/feed/shrinking-header.tsx`

- Export a callback or context value when `scrollYProgress >= 1`
- Could use a shared atom, context, or callback prop

**Modify:** `src/app/(app)/layout.tsx`

- Wire the activation state between `ShrinkingHeader` and `LoopScrollContainer`
- When active: hide the `<main>` (it's now rendered inside the container), set `body.overflow = 'hidden'`

**Acceptance:**
- Scrolling past the spacer transitions to inner container seamlessly
- Content appears in the same position before and after transition
- Header stays collapsed permanently once activated

#### Phase 2: Buffer zone rendering

Create the inert card component and buffer sizing logic.

**New file:** `src/components/feed/inert-card.tsx`

- Renders the same visual output as `ExperimentCard` but as a plain `<div>` (no Motion, no click handlers)
- Receives the same `FeedPost` data
- Uses identical CSS classes, `next/image`, aspect ratios
- No `layoutId`, no `whileInView`, no `onClick`

**Modify:** `src/components/feed/loop-scroll-container.tsx`

- Compute buffer size: count posts from the end/start of the array until their rendered height exceeds `1.5 * containerHeight`
- Render top buffer (last N posts as `InertCard`) before main content
- Render bottom buffer (first N posts as `InertCard`) after main content
- Use `ResizeObserver` on the main content section to track `mainContentHeight`
- Recalculate buffer sizes on resize and pagination

**Acceptance:**
- Buffer zones render correctly above and below main content
- Inert cards are visually identical to real cards
- Buffer size adapts to viewport height

#### Phase 3: Scroll teleportation logic

Implement the core loop mechanism.

**Modify:** `src/components/feed/loop-scroll-container.tsx`

- `scroll` event listener (RAF-gated to fire at most once per frame)
- Teleportation logic:
  ```
  mainTop = topBuffer.offsetHeight
  mainBottom = mainTop + mainContent.offsetHeight
  
  if scrollTop >= mainBottom:
    container.scrollTo({ top: scrollTop - mainContent.offsetHeight, behavior: 'instant' })
  
  if scrollTop <= topBuffer.offsetHeight - viewportHeight:
    container.scrollTo({ top: scrollTop + mainContent.offsetHeight, behavior: 'instant' })
  ```
- Teleportation guard: set a `isTeleporting` flag, skip the next scroll event to prevent double-fire
- On initial activation: set `scrollTop = topBuffer.offsetHeight` (start at top of main content)

**Acceptance:**
- Scrolling past the last post seamlessly wraps to the first
- Scrolling up past the first post seamlessly wraps to the last
- No visible jump, flicker, or content gap at the seam
- Rapid scroll direction changes don't cause oscillation

#### Phase 4: Integration with existing systems

Wire the loop into pagination, expansion, and upload flows.

**Modify:** `src/components/feed/feed-grid.tsx`

- Move sentinel inside the main content section (before the bottom buffer)
- Sentinel still triggers `onLoadMore` via IntersectionObserver
- When new pages load, the main content height changes — the container recalculates buffers and teleportation offset

**Modify:** `src/components/feed/experiment-card.tsx` (or `feed-client.tsx`)

- No changes needed for real cards — they keep their `layoutId` and click handlers
- Expansion still works: the expanded overlay covers the fixed container
- On expand: the inner container's scroll is paused (container gets `overflow: hidden`)
- On collapse: restore container scroll

**Modify:** `src/components/feed/feed-client.tsx`

- Pass the flattened `posts` array to both `FeedGrid` (main content) and buffer zone renderers
- When `posts` array changes (new page fetched):
  1. Measure current scroll position relative to main content top
  2. Re-render with new posts + updated buffers
  3. Restore scroll position relative to new main content top

**Handle edge case — card expansion on inert clone:**
- Inert cards have no click handlers, so users cannot expand them
- This is acceptable: the clone zone is only ~1.5 viewports tall, so the user will always be teleported back to real cards quickly

#### Phase 5: Mobile, accessibility, and edge cases

**Mobile scroll inertia:**
- Apply `overscroll-behavior: contain` on the inner scroll container (not body) to suppress iOS rubber-band at container edges
- Teleportation via `container.scrollTo({ behavior: 'instant' })` on an inner div (not document) is more reliable than on `window` — iOS compositor handles inner container scrolls differently from document scrolls
- Test empirically on iOS Safari — if inertia fights teleportation, add a brief `pointer-events: none` window during teleport to let momentum settle

**Minimum content threshold:**
- If `mainContentHeight < 2 * containerHeight`, disable loop (not enough content to mask the seam)
- Fall back to normal finite scroll with the existing pagination behavior
- Re-check threshold when new pages load — loop may activate after enough content accumulates

**Window resize / orientation change:**
- `ResizeObserver` on the inner container and main content section
- Recalculate buffer sizes and teleportation offsets
- If container height changes while user is in a buffer zone, teleport to equivalent main content position

**Accessibility:**
- Add `role="feed"` and `aria-label="Project feed"` on the main content section
- Add `aria-busy="true"` during pagination fetches
- Cards in buffer zones get `aria-hidden="true"` (they're duplicates)
- `prefers-reduced-motion`: still enable the loop (teleportation is instant, not animated) but disable card entrance animations (already handled by existing Motion config)

**New post added (upload or real-time):**
- On query cache invalidation, the `posts` array changes
- Same mechanism as Phase 4 pagination handling: save relative scroll position, re-render, restore

## Acceptance Criteria

### Functional Requirements

- [ ] Scrolling down past the last post seamlessly wraps to the first post
- [ ] Scrolling up past the first post seamlessly wraps to the last post
- [ ] The loop is completely seamless — no divider, flash, or content gap at the seam
- [ ] New pages are fetched as the user scrolls (progressive loading)
- [ ] New pages are incorporated into the loop seamlessly
- [ ] Card expansion works correctly from any scroll position
- [ ] The upload modal works correctly while the loop is active
- [ ] The headline stays collapsed once the loop activates
- [ ] Clicking the "WORKS IN PROGRESS" link navigates back to the top / resets the view

### Non-Functional Requirements

- [ ] Teleportation completes within a single animation frame (no visible jump)
- [ ] Scroll event handling is RAF-gated (no layout thrashing)
- [ ] Buffer zones use inert cards (no Motion overhead, no extra IntersectionObservers)
- [ ] Works on Chrome, Safari, Firefox (desktop and mobile)
- [ ] No scroll jank on iOS Safari with momentum scrolling
- [ ] `prefers-reduced-motion` is respected for card animations (loop itself stays active)

### Quality Gates

- [ ] Manual testing on iOS Safari (physical device)
- [ ] Manual testing with 1, 5, 20, 60+ posts to verify threshold behavior
- [ ] Verify `layoutId` expansion works correctly near seam boundaries
- [ ] Verify pagination sentinel fires correctly (no duplicate fetches)
- [ ] Verify no memory leak from ResizeObserver or scroll listeners on unmount

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| iOS momentum scroll fights teleportation | High | Inner scroll container (not document) is better behaved; test on device early; fallback: `overscroll-behavior: contain` |
| Inert cards drift from real card styling | Medium | Extract shared card CSS into a common class or shared component base |
| Content height measurement is wrong with dense grid | Medium | Use `getBoundingClientRect()` on the main content wrapper, not calculation |
| Users get disoriented by infinite loop | Low | The headline link provides an escape hatch; loop only activates with enough content |
| Performance with 60+ real cards + 20 inert buffer cards | Low | Inert cards are plain divs (no Motion overhead); `next/image` lazy loading handles images |

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/feed/loop-scroll-container.tsx` | **Create** | Inner scroll container with teleportation logic |
| `src/components/feed/inert-card.tsx` | **Create** | Non-interactive visual clone of ExperimentCard |
| `src/components/feed/shrinking-header.tsx` | Modify | Export collapse-complete signal |
| `src/app/(app)/layout.tsx` | Modify | Wire activation, lock document scroll |
| `src/components/feed/feed-grid.tsx` | Modify | Move sentinel placement |
| `src/components/feed/feed-client.tsx` | Modify | Pass posts to buffer renderers |
| `src/components/feed/experiment-card.tsx` | Minor | No changes expected (inert card handles cloning separately) |

## References

### Internal

- Brainstorm: `docs/brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md`
- Shrinking header: `src/components/feed/shrinking-header.tsx` — `useScroll` with offset `["start start", "end start"]`
- Feed grid: `src/components/feed/feed-grid.tsx` — CSS Grid with `dense` auto-flow, IntersectionObserver sentinel
- Card component: `src/components/feed/experiment-card.tsx` — `layoutId={`card-${post.id}`}`, `whileInView` with `once: true`
- Expansion context: `src/contexts/expansion-context.tsx` — `window.history.pushState` on expand
- GSAP horizontal loop: `src/lib/gsap-horizontal-loop.ts` — reference pattern for seamless looping
- Infinite query hook: `src/hooks/use-feed-posts.ts` — cursor-based pagination
- Layout: `src/app/(app)/layout.tsx` — provider nesting, scroll lock patterns

### Patterns in Codebase

- Scroll lock: `document.body.style.overflow = "hidden"` pattern used in `expanded-post-overlay.tsx:57` and `upload-modal-portal.tsx:14`
- ResizeObserver: not currently used in codebase (new pattern)
- RAF gating: not currently used (new pattern, but standard practice)
