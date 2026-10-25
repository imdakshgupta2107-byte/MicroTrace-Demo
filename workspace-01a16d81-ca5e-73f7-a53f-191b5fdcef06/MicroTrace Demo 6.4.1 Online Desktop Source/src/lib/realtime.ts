// One ref-counted cloud channel for all useLabData consumers. Supabase reuses a
// named channel; adding callbacks after its first subscribe() is not allowed.
import { supabase, hasCloud } from './supabase';
import { TABLES } from './db';
import { DEMO_STORE_KEY, DEMO_DATA_EVENT } from '@/demo/config';
import { demoSharedRequests, DEMO_SHARED_REQUESTS_TABLE } from '@/demo/shared-requests';
import type { RealtimeChannel } from '@supabase/supabase-js';
type Listener=(table:string)=>void;
type SharedChannel={channel:RealtimeChannel;listeners:Set<Listener>;generation:number};
let shared:SharedChannel|null=null;
let demoShared:SharedChannel|null=null;
let sequence=0;
export function subscribeAll(listener:Listener):()=>void {
 if(!hasCloud||!supabase){
  if(demoSharedRequests){
   const client=demoSharedRequests;
   if(!demoShared){
    const generation=++sequence;
    const entry:SharedChannel={channel:client.channel(`microtrace-demo-requests-${generation}`),listeners:new Set<Listener>(),generation};
    demoShared=entry;
    entry.channel.on('postgres_changes',{event:'*',schema:'public',table:DEMO_SHARED_REQUESTS_TABLE},()=>{
     if(demoShared!==entry)return;for(const notify of entry.listeners)notify('requests');
    });
    entry.channel.subscribe();
   }
   const entry=demoShared;entry.listeners.add(listener);let cleaned=false;
   return()=>{if(cleaned)return;cleaned=true;entry.listeners.delete(listener);
    if(entry.listeners.size===0&&demoShared===entry){demoShared=null;void client.removeChannel(entry.channel);}
   };
  }
  const storage=(event:StorageEvent)=>{if(event.key===DEMO_STORE_KEY||event.key===null)listener('local');};
  const reset=()=>listener('local');window.addEventListener('storage',storage);window.addEventListener(DEMO_DATA_EVENT,reset);
  return()=>{window.removeEventListener('storage',storage);window.removeEventListener(DEMO_DATA_EVENT,reset);};
 }
 const client=supabase;
 if(!shared){
  const generation=++sequence;
  const entry={channel:client.channel(`microtrace-all-${generation}`),listeners:new Set<Listener>(),generation};
  shared=entry;
  // Configure ALL callbacks before subscribing, exactly once for this channel.
  for(const table of TABLES)entry.channel.on('postgres_changes',{event:'*',schema:'public',table},()=>{
   if(shared!==entry)return;for(const notify of entry.listeners)notify(table);
  });
  entry.channel.subscribe();
 }
 const entry=shared;entry.listeners.add(listener);let cleaned=false;
 return()=>{if(cleaned)return;cleaned=true;entry.listeners.delete(listener);
  if(entry.listeners.size===0&&shared===entry){shared=null;void client.removeChannel(entry.channel);}
 };
}
