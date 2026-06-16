// Minimal global toast: dispatch an event from anywhere, rendered by <Toaster />.
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('wm-toast', { detail: message }))
}
