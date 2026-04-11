---
title: "Infinite Looping Scroll with Scroll-Position Teleportation on Feed Grid"
date: 2026-04-10
category: ui-bugs
tags: [scroll, animation, teleportation, infinite-scroll, motion, layout, z-index, scrollbar]
component: feed
severity: medium
symptoms:
  - Fixed scroll container rendered at z-30 over the header spacer, breaking the headline collapse animation
  - Visible bounce on loop activation caused by top buffer insertion shifting content (Motion LayoutGroup detected position change)
  - Scrollbar thumb visibly jumping during teleportation, revealing the illusion
  - Loop not activating because minimum post threshold was set too high (12 instead of 3)
root_cause: "Initial implementation used a position:fixed inner scroll container to isolate the loop from the header. This conflicted with the scroll-driven headline collapse animation, introduced z-index stacking issues, and caused layout shifts when buffer zones were inserted."
resolution: "Document-level scroll teleportation with window.scrollTo, bottom-only buffer zone, scrollbar hidden via CSS class toggle, RAF-gated teleportation."
---

# Infinite Looping Scroll with Scroll-Position Teleportation

## Problem Statement

The feed grid needed infinite looping scroll behavior: after the user scrolls past the last post, the feed seamlessly wraps back to the first post. The initial approach used a `position: fixed` inner scroll container with body scroll lock and bidirectional buffer zones, but this broke the existing scroll-driven headline collapse animation (which relies on `window.scrollY`), caused a visible content bounce when the top buffer was inserted (detected by Motion's LayoutGroup), and exposed scrollbar thumb jumps during teleportation. The final working solution switched to document-level scroll teleportation with a single bottom buffer zone, eliminated the top buffer to avoid insertion-triggered layout shifts, and hid the scrollbar via CSS.

## Investigation Steps

### Approach A: Fixed Inner Scroll Container (failed)

Used a `position: fixed` container (`inset-0 z-30`) with `overflow-y: auto` that captured scrolling after the headline collapsed. Had both top and bottom buffer zones, body scroll lock, and bidirectional teleportation.

**Why it failed:** The fixed container rendered over the spacer area, breaking the `ShrinkingHeader` which uses `useScroll({ target: headerRef })` to track a 40svh spacer. The z-30 stacking covered the spacer, and locking `document.body.style.overflow = "hidden"` prevented the header's scroll tracking from updating.

### Approach B: Document-Level Teleportation with Top + Bottom Buffers (failed)

Replaced the fixed container with `window.scrollTo` teleportation. Both top and bottom buffer grids rendered as normal flow siblings. A `useLayoutEffect` compensated scroll position when the top buffer appeared.

**Why it failed:** Inserting the top buffer above the main content pushed every card down. Motion's `LayoutGroup` detected the position change on every `layoutId` element and triggered layout animations, producing a visible bounce.

### Approach C: Bottom Buffer Only (working solution)

Removed the top buffer entirely. Only a bottom buffer renders (appended after the grid). Scrolling down loops seamlessly; scrolling up naturally returns to the header.

## Root Cause Analysis

| Issue | Root Cause |
|-------|-----------|
| Fixed container broke header | `position: fixed; inset: 0` created a separate scroll context, preventing `useScroll` from tracking the spacer's viewport intersection. Z-30 stacking visually covered the spacer area. |
| Top buffer caused bounce | DOM insertion above `layoutId` elements triggers Motion `LayoutGroup` to animate all detected position changes, even when scroll is compensated via `useLayoutEffect`. |
| Scrollbar thumb jumping | `window.scrollTo` instantly changes scrollY, which the browser reflects in the scrollbar thumb position. The viewport content is seamless but the scrollbar reveals the teleportation. |

## Working Solution

### Architecture

- **`LoopScrollContainer`** wraps `FeedGrid` children in a `<div ref={mainContentRef}>` and appends a `BufferGrid` (bottom only) when `enabled` is true.
- **`FeedClient`** detects header collapse via `window.scrollY >= window.innerHeight * 0.4` and sets `loopEnabled = headerCollapsed && posts.length >= 3`.
- **`InertCard`** is a pure visual clone — no Motion, no `layoutId`, no click handlers, `aria-hidden="true"`.

### Teleportation Logic

```typescript
const handleScroll = useCallback(() => {
  if (isTeleportingRef.current) return;

  const mainContent = mainContentRef.current;
  const bottomBuffer = bottomBufferRef.current;
  if (!mainContent || !bottomBuffer) return;

  const scrollY = window.scrollY;
  const mainTop = mainContent.getBoundingClientRect().top + scrollY;
  const bottomBufferTop = bottomBuffer.getBoundingClientRect().top + scrollY;
  const cycleLength = bottomBufferTop - mainTop;

  if (scrollY >= bottomBufferTop) {
    isTeleportingRef.current = true;
    window.scrollTo(0, scrollY - cycleLength);
    requestAnimationFrame(() => {
      isTeleportingRef.current = false;
    });
  }
}, []);
```

Key details:
- **`cycleLength = bottomBufferTop - mainTop`** automatically accounts for any gaps (the `mt-6` seam spacing).
- **`isTeleportingRef`** prevents re-entrant teleportation. Cleared on the next `requestAnimationFrame`.
- **RAF-gated scroll handler** prevents multiple teleportations per frame.

### Scrollbar Hiding

Toggled via class on `<html>`:

```css
html.loop-active {
  scrollbar-width: none;          /* Firefox */
}
html.loop-active::-webkit-scrollbar {
  display: none;                  /* Chrome / Safari / Edge */
}
```

```typescript
useEffect(() => {
  if (!enabled) return;
  document.documentElement.classList.add("loop-active");
  return () => document.documentElement.classList.remove("loop-active");
}, [enabled]);
```

### Seam Gap

Bottom buffer has `mt-6` (24px) matching the grid's internal `gap-6`:

```tsx
<BufferGrid className="mt-6" posts={bottomBufferPosts} keyPrefix="bottom" />
```

## Prevention Strategies

### Never overlay fixed containers on scroll-tracked layouts

Motion's `useScroll({ target })` relies on the target element's bounding rect during native document scroll. Any `position: fixed` or `overflow: hidden` layer between the target and the scroll container will break tracking.

**Warning signs:** Scroll-driven animations that freeze, stutter, or snap to 0/1 after a structural change.

### Never insert content above Motion LayoutGroup elements

Any DOM mutation inside a `LayoutGroup` that changes the measured position of a `layoutId` element will trigger an animation. This includes inserting siblings above, changing padding/margin on parents, and conditional rendering of earlier elements.

**Warning signs:** Cards visibly sliding/bouncing after a data fetch or buffer update.

### Always hide the scrollbar when using scroll teleportation

Gate teleports with a ref flag and RAF to prevent re-entrant scroll events. Compute teleport distance from live `getBoundingClientRect()` measurements, not cached values.

## Quick Reference Checklist

- [ ] Have I mapped all `useScroll` targets and their scroll containers?
- [ ] Does my change insert DOM nodes above any `layoutId` elements?
- [ ] Does my change introduce `position: fixed/absolute` or `overflow: hidden/auto` between a scroll target and its container?
- [ ] Do any cloned/buffer elements carry `layoutId`, `layout`, or Motion wrappers?
- [ ] If I teleport scroll position, is the scrollbar hidden and the teleport RAF-gated?
- [ ] Is the teleport distance computed at teleport time from live measurements?
- [ ] Do all global side effects (`classList`, event listeners) have cleanup in `useEffect`?

## References

- **Brainstorm:** [docs/brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md](../../brainstorms/2026-04-10-infinite-loop-scroll-brainstorm.md)
- **Plan:** [docs/plans/2026-04-10-feat-infinite-loop-scroll-plan.md](../../plans/2026-04-10-feat-infinite-loop-scroll-plan.md)
- **Card Animations Spec:** [docs/superpowers/specs/2026-04-08-card-entrance-animations-design.md](../../superpowers/specs/2026-04-08-card-entrance-animations-design.md)
- **Key deviation from plan:** Document-level scroll teleportation was used instead of the inner fixed container approach proposed in the plan (commit `bffec91`)

### Git Commits

- `2a6dd75` feat: infinite looping scroll on feed grid
- `a5b9c99` fix: lower loop threshold to 3 posts and use offsetTop for accurate positioning
- `bffec91` fix: use document-level scroll teleportation instead of fixed container
- `b7080d9` fix: eliminate bounce, hide scrollbar, add gap at loop seam
