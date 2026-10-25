import { DEMO_BUILD, DEMO_DEVICE_KEY } from '@/demo/config';
import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { readConnection } from '@/live/connection';
const connection=DEMO_BUILD?null:readConnection();
export const LIVE_SESSION_STORAGE_KEY=connection?'microtrace_6_live_session_'+new URL(connection.url).hostname.split('.')[0]:'microtrace_6_live_session_unconfigured';
export const hasCloud=!DEMO_BUILD&&Boolean(connection);
export const supabase:SupabaseClient|null=connection?createClient(connection.url,connection.publicKey,{
  auth:{persistSession:true,autoRefreshToken:true,storageKey:LIVE_SESSION_STORAGE_KEY,detectSessionInUrl:true},
  realtime:{params:{eventsPerSecond:5}},
}):null;
export function deviceTag():string {
  const key=DEMO_BUILD?DEMO_DEVICE_KEY:'microtrace_6_live_device';
  let tag=localStorage.getItem(key);if(!tag){tag=crypto.randomUUID().slice(0,8).toUpperCase();localStorage.setItem(key,tag);}return tag;
}
