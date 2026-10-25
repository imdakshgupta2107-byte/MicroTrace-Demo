import { adminClient,assertDb,event,snapshot } from '../_shared/db.ts';
import { dueJobs } from '../_shared/core.ts';
import { json,secretEqual } from '../_shared/http.ts';
import { processMail,gmailConfig,fingerprint } from '../_shared/worker.ts';
Deno.serve(async(request:Request)=>{
  if(request.method!=='POST') return json({error:'POST_REQUIRED'},405);
  if(!(await secretEqual(request.headers.get('x-microtrace-cron'),Deno.env.get('MICROTRACE_CRON_SECRET')))) return json({error:'UNAUTHORIZED'},401);
  const db=adminClient();let lease:string|null=null;
  try {
    const lock=await db.rpc('automation_lease');assertDb(lock.error);lease=lock.data;
    if(!lease) return json({status:'busy'});
    const settings=await db.from('automation_settings').select('*').eq('id',true).single();assertDb(settings.error);
    if(!settings.data.delivery_enabled) return json({status:'disabled'});
    const config=gmailConfig();if(!config) throw new Error('GMAIL_NOT_CONFIGURED');
    const senderFingerprint=await fingerprint(config);
    const test=await db.rpc('automation_sender_verified',{p_fingerprint:senderFingerprint,p_recent:false});assertDb(test.error);
    if(!test.data) {
      await db.from('automation_settings').update({delivery_enabled:false,activated_at:null}).eq('id',true);
      await event(db,null,'SENDER_CHANGED_RETEST_REQUIRED');return json({status:'paused_retest_required'});
    }
    const now=new Date();const jobs=dueJobs(now,settings.data.activated_at,{weekly:settings.data.weekly_enabled,daily:settings.data.low_stock_enabled||settings.data.expiry_enabled});
    const outcomes=[];
    for(const job of jobs) {
      const existing=await db.from('automation_jobs').select('job_key').eq('job_key',job.key).maybeSingle();assertDb(existing.error);if(existing.data) continue;
      const content=await snapshot(db,job.kind,job.period_start,job.period_end,{low_stock:settings.data.low_stock_enabled,expiry:settings.data.expiry_enabled},now);
      const recorded=await db.rpc('automation_record_job',{p_job_key:job.key,p_kind:job.kind,p_start:job.period_start,p_end:job.period_end,p_content:content,p_signals:content.signals});assertDb(recorded.error);outcomes.push(recorded.data);
    }
    const deliveries=await processMail(db);const retention=await db.rpc('automation_retention');assertDb(retention.error);
    return json({status:'completed',jobs:outcomes,...deliveries});
  } catch(error) {
    const known=error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'AUTOMATION_RUN_FAILED';
    await event(db,null,known).catch(()=>undefined);return json({error:known},500);
  } finally {if(lease) await db.rpc('automation_release',{p_token:lease});}
});
