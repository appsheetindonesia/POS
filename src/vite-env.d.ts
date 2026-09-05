/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL server API sinkronisasi, mis. "http://192.168.1.5:3002" */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}