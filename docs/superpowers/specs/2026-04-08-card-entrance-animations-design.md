# Card Entrance Animations — Design Spec

## Problem

Feed cards currently appear instantly with no entrance animation. The grid layout (landscape/portrait interlocking) is structurally interesting but the experience feels flat — cards don't have presence or weight when they enter the viewport.

## Goal

Add entrance animations to feed cards that feel fluid, intentional, and rhythmic. Inspired by the playful jazz phrasing of Hiromi — organic weight with syncopated timing. Cards should feel like they're being *placed* onto the page, not fading in.

## Design Decisions

### Motion Library: Motion (formerly Framer Motion)

Single library for all current and future interactions. Chosen over CSS-only (no spring physics, poor stagger ergonomics) and Motion One (imperative, poor React orchestration). ~18kb gzipped, justified as the project's motion foundation.

### Animation: Z-Push Backward with Spring

Cards start slightly in front of the screen (closer to viewer) and settle back into the page plane. This creates a "placing onto a surface" feel.

**Start state:**
- `opacity: 0`
- `translateY: 24px` (below)
- `translateZ: 80px` (in front)
- `scale: 1.06` (slightly oversized from proximity)
- `filter: blur(3px)` (depth of field — out of focus when close)

**End state:**
- `opacity: 1`
- `translateY: 0`
- `translateZ: 0`
- `scale: 1`
- `filter: blur(0)`

**Spring config (tuned):**
- `mass: 2` — heavy, deliberate settling
- `stiffness: 100` — balanced responsiveness
- `damping: 16` — controlled overshoot
- `blur: 0` — no depth-of-field blur (clean entrance)

The spring naturally overshoots in Z and scale, then settles — giving cards physical weight.

### Stagger: Jazz Phrasing

Not metronomic. Cards group into rhythmic clusters by row.

- **Within a row:** 80ms between cards
- **Between rows:** additional 60ms "breath" pause
- Pattern: `da-da-da ... da-da-da ... da-da-da`

For a 3-column grid:
```
Card 1: 0ms    Card 2: 70ms    Card 3: 140ms
                    — 60ms breath —
Card 4: 200ms  Card 5: 270ms   Card 6: 340ms
                    — 60ms breath —
Card 7: 400ms  Card 8: 470ms   Card 9: 540ms
```

### Trigger: Scroll-Based

- Cards animate when they enter the viewport via `whileInView`
- `viewport={{ once: true, amount: 0.15 }}` — trigger at 15% visibility, animate once
- Cards visible on initial page load animate immediately with stagger
- New cards from infinite scroll get their own fresh stagger phrase (reset stagger index per batch)

### Scope

- **In scope:** Feed card entrance on initial load and infinite scroll
- **Keep as CSS:** Existing hover scale effect on card images (`transition-transform duration-300 group-hover:scale-[1.02]`), "SEND IT" button letter-bounce
- **Future (enabled by Motion foundation):** Page transitions, modal entrances, shared element transitions, drag interactions

### Performance

- `will-change: transform, opacity` on animating cards
- `filter: blur()` triggers compositing but only during the entrance (~1s), not at rest
- `perspective` on grid container for real 3D (cheaper than per-element perspective)
- `once: true` on viewport trigger — no re-animation on scroll back
- Motion's spring runs on the main thread but at 60fps for the property set we're using

## Implementation Approach

1. Install `motion` package
2. Create a `MotionCard` wrapper component using `motion.div` with the spring variants
3. Update `FeedGrid` to orchestrate stagger timing per batch
4. The grid container gets `perspective: 1000px` and `transform-style: preserve-3d` via CSS
5. Each card's stagger delay is computed based on its index within the current batch, using the jazz phrasing formula

### Key Files

| File | Change |
|------|--------|
| `package.json` | Add `motion` dependency |
| `src/components/feed/feed-grid.tsx` | Add perspective to grid, orchestrate stagger per batch |
| `src/components/feed/experiment-card.tsx` | Wrap card in `motion.div` with spring entrance variants |

### Existing code to preserve

- Hover effect in `experiment-card.tsx` stays as CSS transition (no Motion needed)
- `letter-bounce` keyframe in `globals.css` stays as-is
- IntersectionObserver for infinite scroll in `feed-grid.tsx` stays (separate from Motion's `whileInView`)

## Verification

1. Load feed page — cards should animate in with stagger and z-push-back spring
2. Scroll down — new cards entering viewport should animate independently
3. Scroll back up — already-animated cards should stay visible (no re-animation)
4. Trigger infinite scroll — new batch should get a fresh stagger phrase
5. Check performance: no jank during animation (60fps), no layout shift after settling
6. Test on mobile (1 col) and tablet (2 col) — stagger should adapt to column count
7. Verify on Vercel deployment
