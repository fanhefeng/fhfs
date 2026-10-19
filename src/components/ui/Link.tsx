import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, Ref } from "react";

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  ref?: Ref<HTMLAnchorElement>;
};

export default function Link({ href, prefetch, children, ...props }: LinkProps) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/admin") ||
    /\.(xml|json)(?:$|\?)/.test(href)
  ) {
    return (
      <a {...props} href={href}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink {...props} to={href} preload={prefetch === false ? false : "intent"}>
      {children}
    </RouterLink>
  );
}
