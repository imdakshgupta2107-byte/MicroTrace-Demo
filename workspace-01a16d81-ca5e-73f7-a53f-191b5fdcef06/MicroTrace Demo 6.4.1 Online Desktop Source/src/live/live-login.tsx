import { useEffect,useState,type FormEvent } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';
import { Wifi,ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readConnection,saveConnection } from './connection';
import { useLiveSession } from './use-live-session';
import { signInLive,signOutLive,finishPasswordRecovery } from './session';
export default function LiveLogin(){
 const session=useLiveSession();const navigate=useNavigate();const location=useLocation();
 const requested=new URLSearchParams(location.search).get("next");
 const destination=requested&&requested.startsWith("/")&&!requested.startsWith("//")&&!/[\\\r\n]/.test(requested)&&!requested.startsWith("/onboarding")?requested:"/dashboard";const connected=Boolean(readConnection());
 const [url,setUrl]=useState(''),[publicKey,setKey]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(session.status==='ready'&&!session.recovery)navigate(destination,{replace:true});},[session.status,session.recovery,navigate,destination]);
 const submit=async(event:FormEvent)=>{event.preventDefault();if(busy)return;setError('');setBusy(true);
  try{if(!connected){saveConnection({url,publicKey});window.location.reload();}else if(session.recovery){await finishPasswordRecovery(password);}else{await signInLive(email,password);}}
  catch(reason){setError(reason instanceof Error?reason.message:'Unable to continue.');}finally{setBusy(false);}};
 return <main className="min-h-screen safe-area-header bg-navy-50 p-3 sm:p-8 grid place-items-center">
  <div className="w-full max-w-5xl grid md:grid-cols-[1fr_1.05fr] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
   <section className="bg-navy p-6 sm:p-9 text-white flex flex-col justify-between gap-8">
    <div><div className="bg-white p-3 rounded-2xl max-w-[255px]"><BrandLogo variant="lockup" className="h-12 w-full"/></div><h1 className="font-extrabold text-3xl sm:text-4xl leading-tight mt-7">Laboratory<br/>inventory workspace.</h1><p className="mt-4 text-sm text-slate-300 leading-relaxed">Manage stock, requests and lab records in one place.</p></div>
    <p className="text-[11px] text-slate-400">Authorized laboratory access</p>
   </section>
   <section className="p-6 sm:p-9 min-w-0 flex flex-col justify-center">
    <span className="inline-flex self-start items-center gap-1.5 rounded-full bg-gold-100 text-navy px-3 py-1 text-[11px] font-bold"><Wifi size={13}/> {connected?'Shared workspace':'Connection required'}</span>
    <h2 className="text-2xl font-extrabold text-navy mt-4">{!connected?'Connect workspace':session.recovery?'Set a new password':'Sign in to MicroTrace'}</h2>
    <p className="text-sm text-slate-500 leading-relaxed mt-2 mb-6">{!connected?'Enter the workspace connection details.':session.recovery?'Choose a new account password before continuing.':'Enter your MicroTrace account details.'}</p>
    {session.status==='loading'&&<p role="status" className="text-sm mb-4 text-slate-500">Verifying your session and lab access…</p>}
    {(error||session.error)&&<div role="alert" className="rounded-xl bg-red-50 text-red-800 p-3 mb-4 text-sm break-words">{error||session.error}</div>}
    <form onSubmit={submit} className="space-y-4">
     {!connected?<><label className="block text-sm font-semibold text-navy">Supabase project URL<Input className="mt-1" type="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://your-project.supabase.co" required autoComplete="off"/></label><label className="block text-sm font-semibold text-navy">Public publishable / anon key<Input className="mt-1" value={publicKey} onChange={event=>setKey(event.target.value)} placeholder="sb_publishable_…" required autoComplete="off"/></label></>:<>{!session.recovery&&<label className="block text-sm font-semibold text-navy">Account email<Input className="mt-1" type="email" value={email} onChange={event=>setEmail(event.target.value)} required autoComplete="username"/></label>}<label className="block text-sm font-semibold text-navy">{session.recovery?'New password':'Account password'}<Input className="mt-1" type="password" value={password} onChange={event=>setPassword(event.target.value)} minLength={session.recovery?12:undefined} required autoComplete={session.recovery?'new-password':'current-password'}/></label></>}
     <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy||session.status==='loading'}>{busy?'Please wait…':!connected?'Save public connection':session.recovery?'Update password':'Sign in'}<ArrowRight size={16}/></Button>
    </form>
    {session.userId&&!session.recovery&&<Button className="mt-3" onClick={signOutLive}>Sign out of this account</Button>}
   </section>
  </div>
 </main>;
}
