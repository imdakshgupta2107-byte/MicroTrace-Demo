import type { Session } from '@supabase/supabase-js';
import type { Role } from '@/lib/types';
import type { StudentProfile } from '@/lib/student';
import { supabase,LIVE_SESSION_STORAGE_KEY } from '@/lib/supabase';
export interface LiveSession { status:'loading'|'signed_out'|'ready'|'denied'|'error';userId:string|null;email:string|null;role:Role|null;error:string|null;recovery:boolean }
const EMPTY=Object.freeze({status:'signed_out',userId:null,email:null,role:null,error:null,recovery:false} as LiveSession);
const LOCKED=Object.freeze({role:null,unlockedAt:null});
let snapshot:LiveSession=EMPTY;
let authSnapshot:{readonly role:Role|null;readonly unlockedAt:string|null}=LOCKED;
let profile:StudentProfile|null=null;
const listeners=new Set<()=>void>();let initialized=false;let generation=0;let explicitlySignedOut=false;
export const readLiveSession=()=>snapshot;
export const serverLiveSession=()=>EMPTY;
export const readLiveAuth=()=>authSnapshot;
export const readLiveProfile=()=>profile;
export function subscribeLive(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function publish(next:LiveSession,nextProfile:StudentProfile|null=null,stamp:string|null=null) {
  if(JSON.stringify(snapshot)===JSON.stringify(next)&&JSON.stringify(profile)===JSON.stringify(nextProfile))return;
  snapshot=Object.freeze(next);profile=nextProfile?Object.freeze(nextProfile):null;
  authSnapshot=next.role?Object.freeze({role:next.role,unlockedAt:stamp}):LOCKED;
  for(const listener of listeners) listener();
}
async function accept(session:Session|null,recovery=false) {
  const version=++generation;
  if(!session){publish(EMPTY);return;}
  if(snapshot.userId!==session.user.id||snapshot.status!=='ready') publish({status:'loading',userId:session.user.id,email:session.user.email??null,role:null,error:null,recovery});
  try {
    const result=await supabase!.from('lab_members').select('role,full_name,class_name,active').eq('id',session.user.id).abortSignal(AbortSignal.timeout(20_000)).maybeSingle();
    if(version!==generation)return;
    if(result.error)throw new Error('Unable to verify your lab membership. Check your connection and database setup.');
    const member=result.data;
    if(!member?.active||!['student','teacher','staff','principal'].includes(member.role)) {publish({status:'denied',userId:session.user.id,email:session.user.email??null,role:null,error:'Your account is not an active lab member. Ask the principal to grant access.',recovery});return;}
    publish({status:'ready',userId:session.user.id,email:session.user.email??null,role:member.role,error:null,recovery},
      {name:member.full_name,roll:'',className:member.class_name??'',setupDone:true},session.user.last_sign_in_at??session.user.created_at);
  }catch(error){if(version===generation)publish({status:'error',userId:session.user.id,email:session.user.email??null,role:null,error:error instanceof Error?error.message:'Unable to verify membership.',recovery});}
}
export function initializeLiveSession(){
  if(initialized||!supabase)return;initialized=true;
  publish({...EMPTY,status:'loading'});
  supabase.auth.onAuthStateChange((event,session)=>{
    // Never await another Supabase call inside its auth callback's internal lock.
    if(explicitlySignedOut&&session)return;
    const ticket=++generation;
    setTimeout(()=>{if(ticket===generation)void accept(session,event==='PASSWORD_RECOVERY');},0);
  });
  const startupVersion=generation;
  void supabase.auth.getSession().then(({data,error})=>{if(startupVersion!==generation)return;if(error)publish({...EMPTY,status:'error',error:'Unable to restore your session. Please sign in again.'});else void accept(data.session);});
}
export async function signInLive(email:string,password:string){
  if(!supabase)throw new Error('Connect a Supabase project first.');
  explicitlySignedOut=false;
  const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(error)throw new Error('Sign-in failed. Check your account details, email verification and connection.');
}
export function signOutLive():void {
 explicitlySignedOut=true;++generation;publish(EMPTY);
 try{for(const key of [LIVE_SESSION_STORAGE_KEY,LIVE_SESSION_STORAGE_KEY+'-user',LIVE_SESSION_STORAGE_KEY+'-code-verifier'])localStorage.removeItem(key);}catch{/* in-memory state is already locked */}
 void supabase?.auth.signOut({scope:'local'}).catch(()=>undefined);
}
export async function finishPasswordRecovery(password:string):Promise<void>{
  if(!supabase||password.length<12)throw new Error('Use a password with at least 12 characters.');
  const result=await supabase.auth.updateUser({password});if(result.error)throw new Error('Unable to update your password. Request a new recovery link.');
  publish({...snapshot,recovery:false},profile,authSnapshot.unlockedAt);
}
