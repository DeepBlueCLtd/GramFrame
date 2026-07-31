/**
 * Build-time defines injected by Vite (see vite.config.js).
 *
 * These are not runtime globals: esbuild substitutes the literal value into the
 * source at build/dev-server time. Outside a Vite build the identifier is
 * genuinely absent, hence the `undefined` in the type and the `typeof` guards at
 * every use site.
 */
declare const __GRAMFRAME_VERSION__: string | undefined
