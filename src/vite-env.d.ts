/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JOBS_API_URL?: string
  readonly VITE_JOBS_API_KEY?: string
  readonly VITE_MARKETPLACE_API_URL?: string
  readonly VITE_MARKETPLACE_API_KEY?: string
  readonly VITE_SIGNUP_API_URL?: string
  readonly VITE_SIGNUP_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
