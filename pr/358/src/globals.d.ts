/**
 * Build-time defines injected by Vite (see vite.config.js).
 *
 * These are not runtime globals: esbuild substitutes the literal value into the
 * source at build/dev-server time. Outside a Vite build the identifier is
 * genuinely absent, hence the `undefined` in the type and the `typeof` guards at
 * every use site.
 */
declare const __GRAMFRAME_VERSION__: string | undefined

/**
 * The component's own globals, as a host page and the test suite see them.
 *
 * Declared here rather than cast at each use site: the Playwright suite reaches
 * `window.GramFrame` in well over a hundred places, and `@ts-ignore` on every
 * one of them is how `tests/` stayed outside the type gate in the first place
 * (R9-10).
 */
interface Window {
  /**
   * The public API, registered on load by `src/main.js`.
   *
   * The `__test__*` members are optional on `GramFrameAPI` -- correctly, since
   * a published page does not get them -- but required here. Every caller of
   * them in this program is a Playwright spec, and every spec runs against a
   * page that sets `GRAMFRAME_DEBUG`. Widening the type is honest about that
   * and avoids sixty `@ts-ignore`s, which is how `tests/` came to sit outside
   * the gate at all. What actually proves the members are absent on a
   * published page is behavioural, not a type: `lifecycle-hygiene.spec.js`
   * enumerates the surface on a page without the flag, and
   * `public-api.spec.js` drives a published fixture end to end.
   */
  GramFrame: GramFrameAPI &
    Required<
      Pick<
        GramFrameAPI,
        | '__test__flushDispatches'
        | '__test__forceUpdate'
        | '__test__getInstances'
        | '__test__getInstance'
        | '__test__getGlobalStateListeners'
        | '__test__clearGlobalStateListeners'
      >
    >
  /**
   * Opt-in flag a page sets before loading the component to get the
   * `__test__*` debug surface. Absent on published training material.
   */
  GRAMFRAME_DEBUG?: boolean
  /** The audio-source registry an audio-backed page exposes (spec 168). */
  GramFrameAudio?: Record<string, unknown>
}
