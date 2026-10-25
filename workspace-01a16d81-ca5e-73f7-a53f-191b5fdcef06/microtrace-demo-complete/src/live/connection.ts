/** Only public project connection details. Never stores server/Gmail secrets. */
export interface LiveConnection { url: string; publicKey: string }
export const CONNECTION_KEY='microtrace_6_live_connection';
export function validateConnection(value: LiveConnection): string|null {
  try {
    const url=new URL(value.url);
    if(url.protocol!=='https:'||!/^([a-z0-9-]{6,64})\.supabase\.co$/.test(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/') return 'Use your HTTPS Supabase project root URL.';
  } catch {return 'Enter a valid Supabase project URL.';}
  const key=value.publicKey;
  if(key.startsWith('sb_publishable_')&&key.length>=30&&key.length<=512) return null;
  try {
    const parts=key.split('.');if(parts.length!==3) throw new Error();
    const data=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    if(data.role==='anon') return null;
  } catch { /* never accept an unrecognized, secret or service-role key */ }
  return 'Use a publishable key or legacy anon key. Never enter a secret/service-role key.';
}
export function readConnection():LiveConnection|null {
  const env={url:(import.meta.env.VITE_SUPABASE_URL??'').trim(),publicKey:(import.meta.env.VITE_SUPABASE_ANON_KEY??'').trim()};
  if(env.url&&env.publicKey&&!validateConnection(env)) return env;
  try {const stored=JSON.parse(localStorage.getItem(CONNECTION_KEY)??'null') as LiveConnection|null;return stored&&typeof stored.url==='string'&&typeof stored.publicKey==='string'&&!validateConnection(stored)?stored:null;}catch{return null;}
}
export function saveConnection(input:LiveConnection):void {
  const value={url:input.url.trim().replace(/\/+$/,'')+'/',publicKey:input.publicKey.trim()};
  const error=validateConnection(value);if(error)throw new Error(error);
  localStorage.setItem(CONNECTION_KEY,JSON.stringify(value));
}
export function clearConnection():void {localStorage.removeItem(CONNECTION_KEY);}
