import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_BUILD } from "./config";

export const DEMO_SHARED_REQUESTS_TABLE = "demo_shared_requests";

const enabled = DEMO_BUILD && import.meta.env.VITE_DEMO_SHARED_REQUESTS === "true";
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const publicKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/**
 * A deliberately limited anonymous transport for the temporary shared PIN demo.
 * It syncs requests only; stock and other demo records stay local to each device.
 */
export const demoSharedRequests: SupabaseClient | null = enabled && url && publicKey
  ? createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export const hasSharedDemoRequests = Boolean(demoSharedRequests);
