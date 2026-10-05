export type LaterItem = { text: string; addedAt: string }

declare module 'claude-code' {
  interface PluginState {
    'my-setup': { later: LaterItem[]; meter: string }
  }
}
