import { GlobalError } from "@/components/layout/GlobalError";
import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from "@tanstack/react-router";
import { ThemeInitScript } from "@/app/ThemeInitScript";
import { htmlLang } from "@/i18n/routing";
import "@/app/globals.css";
import "@/app/font-faces.css";
import icon from "@/app/icon.svg?url";
export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: "icon", type: "image/svg+xml", href: icon }],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
  component: Document,
  errorComponent: GlobalError,
});
function Document() {
  const path = useLocation({ select: (location) => location.pathname });
  return (
    <html
      lang={htmlLang(path.startsWith("/en") ? "en" : "zh")}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh flex flex-col bg-bg text-fg">
        <ThemeInitScript />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
