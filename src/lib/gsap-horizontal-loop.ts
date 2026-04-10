import gsap from "gsap";

/**
 * GSAP seamless horizontal loop helper.
 * Source: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop/
 */
export function horizontalLoop(
  items: Element[] | NodeListOf<Element> | string,
  config?: {
    speed?: number;
    paused?: boolean;
    repeat?: number;
    reversed?: boolean;
    paddingRight?: number | string;
    snap?: number | false;
  }
) {
  const elements = gsap.utils.toArray<HTMLElement>(items);
  const cfg = config || {};
  const tl = gsap.timeline({
    repeat: cfg.repeat,
    paused: cfg.paused,
    defaults: { ease: "none" },
    onReverseComplete: () => { tl.totalTime(tl.rawTime() + tl.duration() * 100); },
  });
  const length = elements.length;
  const startX = elements[0].offsetLeft;
  const times: number[] = [];
  const widths: number[] = [];
  const xPercents: number[] = [];
  let curIndex = 0;
  const pixelsPerSecond = (cfg.speed || 1) * 100;
  const snap =
    cfg.snap === false
      ? (v: number) => v
      : gsap.utils.snap(cfg.snap || 1);

  gsap.set(elements, {
    xPercent: (i: number, el: HTMLElement) => {
      const w = (widths[i] = parseFloat(
        gsap.getProperty(el, "width", "px") as string
      ));
      xPercents[i] = snap(
        (parseFloat(gsap.getProperty(el, "x", "px") as string) / w) * 100 +
          (gsap.getProperty(el, "xPercent") as number)
      );
      return xPercents[i];
    },
  });

  gsap.set(elements, { x: 0 });

  const totalWidth =
    elements[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    elements[length - 1].offsetWidth *
      (gsap.getProperty(elements[length - 1], "scaleX") as number) +
    (parseFloat(String(cfg.paddingRight)) || 0);

  for (let i = 0; i < length; i++) {
    const item = elements[i];
    const curX = (xPercents[i] / 100) * widths[i];
    const distanceToStart = item.offsetLeft + curX - startX;
    const distanceToLoop =
      distanceToStart +
      widths[i] * (gsap.getProperty(item, "scaleX") as number);
    tl.to(
      item,
      {
        xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0
    )
      .fromTo(
        item,
        {
          xPercent: snap(
            ((curX - distanceToLoop + totalWidth) / widths[i]) * 100
          ),
        },
        {
          xPercent: xPercents[i],
          duration:
            (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
          immediateRender: false,
        },
        distanceToLoop / pixelsPerSecond
      )
      .add("label" + i, distanceToStart / pixelsPerSecond);
    times[i] = distanceToStart / pixelsPerSecond;
  }

  function toIndex(
    index: number,
    vars?: gsap.TweenVars
  ) {
    vars = vars || {};
    if (Math.abs(index - curIndex) > length / 2) {
      index += index > curIndex ? -length : length;
    }
    const newIndex = gsap.utils.wrap(0, length, index);
    const time = times[newIndex];
    let tweenTime = time;
    if (time > tl.time() !== index > curIndex) {
      vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
      tweenTime += tl.duration() * (index > curIndex ? 1 : -1);
    }
    curIndex = newIndex;
    vars.overwrite = true;
    return tl.tweenTo(tweenTime, vars);
  }

  // Extend timeline with navigation methods
  const loop = tl as gsap.core.Timeline & {
    next: (vars?: gsap.TweenVars) => gsap.core.Tween;
    previous: (vars?: gsap.TweenVars) => gsap.core.Tween;
    current: () => number;
    toIndex: (index: number, vars?: gsap.TweenVars) => gsap.core.Tween;
    times: number[];
  };

  loop.next = (vars) => toIndex(curIndex + 1, vars);
  loop.previous = (vars) => toIndex(curIndex - 1, vars);
  loop.current = () => curIndex;
  loop.toIndex = (index, vars) => toIndex(index, vars);
  loop.times = times;
  tl.progress(1, true).progress(0, true);

  if (cfg.reversed) {
    tl.vars.onReverseComplete?.();
    tl.reverse();
  }

  return loop;
}
