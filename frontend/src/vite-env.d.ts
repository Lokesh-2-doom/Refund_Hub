/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BASE_URL: string; // Make sure this matches!
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}