import type GSAP from "gsap";
import type { useGSAP as UseGSAP } from "@gsap/react";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { SplitText as SplitTextType } from "gsap/SplitText";
import type { CustomEase as CustomEaseType } from "gsap/CustomEase";
import type { Flip as FlipType } from "gsap/Flip";
export { EASE } from "../ease";
export const prefersReducedMotion = () => false;
export const isFinePointer = () => false;

// Workers forbid module-scope timers. Motion runs after hydration, so the
// SSR environment resolves the motion entry to this inert implementation.
const noop: unknown = new Proxy(
  function () {
    return noop;
  },
  { get: () => noop },
);
export const gsap = noop as typeof GSAP;
export const ScrollTrigger = noop as typeof ScrollTriggerType;
export const SplitText = noop as typeof SplitTextType;
export const CustomEase = noop as typeof CustomEaseType;
export const Flip = noop as typeof FlipType;
export const useGSAP = (() => ({
  contextSafe: <T>(callback: T) => callback,
})) as unknown as typeof UseGSAP;
