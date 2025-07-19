// Type declarations for global objects used in tests

interface GramFrameAPI {
  addStateListener: (callback: (state: any) => void) => (state: any) => void
  removeStateListener: (callback: (state: any) => void) => boolean
  forceUpdate: () => void
  toggleCanvasBoundsOverlay: () => void
  setDebugGrid: (enabled: boolean) => void
  stateListenerCount?: number
}

interface Window {
  GramFrame: GramFrameAPI
  stateUpdates: any[]
}
