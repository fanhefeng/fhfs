export const EASE = {
  /** Critically damped arrive; entrances, hovers, the nav's settle. */
  default: "power3.out",
  /** A gentler arrive: the scroll reveal, pointer-follow, small fades in. */
  soft: "power2.out",
  /** Slight overshoot; ONLY for gestures that carry velocity (flicks, thrown
   *  cards) and the few entrances that land on one — a menu fading in never
   *  bounces. */
  momentum: "back.out(1.2)",
  /** Reversed feel for departures; pair with timeScale(2–2.5) so exits stay
   *  crisp. */
  exit: "power2.in",
  /** A departure that lingers a beat and then snaps clear: the route veil,
   *  the fan folding its elastic arrival back up. */
  depart: "power3.in",
  /** At rest at both ends — a thing moving from one place to another: Flip
   *  reflows, the grid's height, the island's width, the lens's slide, the
   *  splash's iris. */
  travel: "power2.inOut",
  /** Light opacity changes: a bulb, a wordmark, a caption. */
  fadeIn: "power1.out",
  fadeOut: "power1.in",
  crossfade: "power1.inOut",
  /** Constant rate. Anything scrubbed by scroll must be linear, or a pixel of
   *  scroll stops being a pixel of travel; also a spill of light that should
   *  not accelerate. */
  linear: "none",
  /** A line rising out of its mask, fast then long: the masthead. */
  unveil: "expo.out",
  /** Springs into place: the radial fan, a sticker landing. */
  spring: "elastic.out(1, 0.5)",
  /** The magnet letting go — a slightly looser spring than `spring`. */
  release: "elastic.out(1, 0.4)",
  /** The fan's "+" snapping round into a "×". */
  pop: "back.out(1.7)",
  /** The island's tray stretching open under a click. */
  stretch: "back.out(2)",
  /** A changelog year bubble swelling as the rail reaches it. */
  bubble: "back.out(2.4)",
  /** An idle rise and fall at rest at both ends: the chibi breathing, its
   *  tuft swaying, its dizzy head rolling. */
  breathe: "sine.inOut",
  /** A sticker's shiver on hover — needs CustomWiggle from `./gsap-extras`. */
  shiver: "wiggle({ wiggles: 7, type: easeOut })",
} as const;
