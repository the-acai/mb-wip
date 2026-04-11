---
date: 2026-04-10
topic: infinite-loop-scroll
---

# Infinite Looping Scroll

## What We're Building

Once the headline ("WORKS IN PROGRESS") finishes its shrink animation, the feed content becomes an infinite loop. Scrolling down past the last post seamlessly wraps to the first post; scrolling up past the first post wraps to the last. The loop is completely seamless — no dividers, no visual indication of the seam.

Content loading is progressive: the loop starts with whatever posts are loaded, and as new pages are fetched (via the existing `useInfiniteQuery` + IntersectionObserver pattern), they're appended into the loop.

## Why This Approach

Three approaches were considered:

1. **Scroll-position teleportation (chosen)** — Keep the existing CSS grid layout. Repeat enough content in the DOM to fill the viewport at the seam boundaries. When scroll position crosses a threshold, silently reset `scrollTop` to the equivalent position in the repeated section. This preserves the current grid, Motion animations (`whileInView`, `layoutId`), and progressive loading with minimal architectural changes.

2. **GSAP vertical loop** — Adapt the existing `gsap-horizontal-loop.ts` for vertical scrolling. Rejected because the multi-column grid with `dense` auto-flow and variable row spans is fundamentally incompatible with GSAP's inline-item repositioning model. Would require flattening the grid and fighting Motion's animation system.

3. **Triple-buffer translate** — Render 3 copies of content with CSS transform repositioning. Rejected due to 3x memory overhead (especially images), difficulty integrating progressive loading, and potential grid rendering inconsistencies between copies.

## Key Decisions

- **Bidirectional loop**: Scrolling wraps in both directions (down wraps to top, up wraps to bottom)
- **Completely seamless**: No visual indicators at the loop seam
- **Progressive content**: Loop expands as more pages are fetched — not limited to a fixed set
- **Scroll teleportation**: Silently reset `scrollTop` at boundary thresholds with repeated DOM content to mask the jump
- **Preserve existing architecture**: Keep the CSS grid, Motion animations, and `useInfiniteQuery` pagination intact
- **Activation trigger**: Loop behavior activates only after the headline has fully collapsed (scroll past the 40svh spacer)

## Open Questions

- How much content needs to be repeated at the seam to fully mask the teleportation? (Likely 1-2 viewport heights)
- Should the `whileInView` entrance animations replay each time a post loops back into view, or only fire once?
- How does this interact with the expanded post overlay (`ExpansionContext`) — if a user clicks a card near the seam, does the `layoutId` transition still work correctly with duplicated DOM nodes?
- Performance: with repeated DOM nodes for the seam buffer, what's the impact on paint/layout with 60+ cards visible?

## Next Steps

-> `/workflows:plan` for implementation details
