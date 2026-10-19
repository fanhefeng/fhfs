import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

// The registration point for what the shell itself needs — import gsap from
// here in every fx component. Only the plugins that are on every page get
// registered here: the Header's Flip, Reveal's ScrollTrigger, the headline
// SplitText, and CustomEase because the others build on it. Draggable,
// InertiaPlugin, ScrambleTextPlugin and CustomWiggle are
// each used by one or two leaf components and live in `./gsap-extras`, so
// the pages that never drag, scramble or wiggle do not ship them.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase, Flip);

// Site-wide spring language: critically damped by default (no overshoot).
// Components only override deliberately, via the EASE table below.
gsap.defaults({ duration: 0.35, ease: "power3.out" });

/**
 * Motion tokens — the only sanctioned eases. No ease strings in components:
 * `conventions.test.ts` fails on an `ease: "…"` anywhere else in `src/`.
 * Named for what they are used for, not for the curve; a new curve gets a
 * token here, with the place it serves, before it gets a call site.
 */
export { EASE } from "../ease";

/**
 * The one motion signal the site still branches on, and a deliberately narrow
 * one: everybody gets the full-motion version (DESIGN.md §1.5). What this gates
 * is motion with no stop button otherwise:
 *
 * - endless loops: three in CSS (`.aurora-blob`, `.grain-layer`,
 *   `.pulse-stepped`, one media block in globals.css), the dot-matrix canvas
 *   (DotDoodle), the 404's particle line (ParticleLine holds still);
 * - scrolling the reader did not do: the inertial scroll (SmoothScroll), and
 *   the smooth jumps the site makes for them (RadialFab's back to top,
 *   LensSliderDemo's jump to a slide) — instant instead;
 * - the opening blackout (OvertureLight).
 *
 * Entrances, reveals, curtains and hover effects are not on it. Three lab
 * studies branch as well, because showing the reduced version is part of the
 * study (OvertureDemo, ScrollVideoDemo, MeltingText).
 *
 * The grove is the same exception under the same test — the moss is an endless
 * full-screen loop — and holds the MediaQueryList itself (`GroveScene`, the
 * liquid-metal pipeline), because it reads it every frame (the clock stands
 * still while it matches) and a setting changed mid-visit has to land without
 * a remount. Its cards (GroveApproach) and its camera stop following the
 * pointer together.
 *
 * Reads the live browser, so it belongs in an effect, never in a render path
 * that also runs on the server.
 */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Mouse-class pointer — the gate on every hover-driven effect. */
export const isFinePointer = (): boolean =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// CustomEase is not re-exported: registration alone makes its string form
// parseable, and no component imports the class.
export { gsap, useGSAP, ScrollTrigger, SplitText, Flip };
