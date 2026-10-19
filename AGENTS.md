# fhfs

TanStack Start, React 19, Vite+, and Void. Read the installed documentation in
`node_modules/void/docs/integrations/frameworks/tanstack-start.md` before
changing deployment configuration. Routes live in `src/routes`; page views and
their server loaders live together under `src/app`.

Use `pnpm check`, `pnpm build`, and the public browser smoke check before shipping.
Vite+ owns dev/build, lint, formatting, and Vitest. Do not reintroduce Next.js.
Server functions must dynamically import server modules inside their handlers.
Keep credentials and the database driver out of client bundles.

The Neon database and media Worker are shared with fhfs-site. Keep the existing
schema and upload lease protocol compatible. Never run migrations, seed scripts,
or write tests against production. Test writes require an explicitly isolated
test database. Public content caches expire within 30 seconds so edits made by
either deployment become visible to the other. Admin reads and previews bypass
public caches. Every admin mutation checks its session before reading form data.

Preserve the original design, zh/en translations and fallbacks, animation ease
tokens, reduced-motion and WebGL guards, lazy 3D chunks, theme/music/scroll-lock
contracts, and unsaved editor state. Images, fonts, models, and recordings keep
their original licenses (LICENSE and docs/CREDITS.md).
