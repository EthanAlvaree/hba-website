// Shared Window.turnstile global declaration so multiple components can
// reference the Cloudflare Turnstile API without colliding redeclarations.

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "flexible"
          callback?: (token: string) => void
        }
      ) => string | undefined
      remove: (widgetId: string) => void
      reset: (widgetId?: string) => void
      getResponse: (widgetId?: string) => string | undefined
    }
  }
}

export {}
