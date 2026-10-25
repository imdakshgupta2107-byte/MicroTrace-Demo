/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "demo" | "live";
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STAFF_PIN?: string;
  readonly VITE_TEACHER_PIN?: string;
  readonly VITE_PRINCIPAL_PIN?: string;
  readonly VITE_PUBCHEM_ENABLED?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
