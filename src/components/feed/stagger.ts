/**
 * Compute per-card stagger delays for a 3-column dense grid.
 *
 * Cards within the same row enter `withinRowMs` apart; an extra `rowBreathMs`
 * is added at the end of each full row of 3. Returned delays are in seconds
 * (Motion's preferred unit).
 */
export function computeStaggerDelays(
  count: number,
  withinRowMs: number,
  rowBreathMs: number
): number[] {
  const COLS = 3;
  const delays: number[] = [];
  let time = 0;
  let colInRow = 0;

  for (let i = 0; i < count; i++) {
    delays.push(time / 1000);
    colInRow++;
    if (colInRow >= COLS) {
      colInRow = 0;
      time += withinRowMs + rowBreathMs;
    } else {
      time += withinRowMs;
    }
  }
  return delays;
}
