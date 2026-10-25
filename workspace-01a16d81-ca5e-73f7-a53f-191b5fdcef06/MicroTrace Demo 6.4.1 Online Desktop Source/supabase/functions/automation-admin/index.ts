import { corsHeaders,json,HttpError,principalOrStaff } from '../_shared/http.ts';
import { assertDb,snapshot,event } from '../_shared/db.ts';
import { validWebUrl,localDay } from '../_shared/core.ts';
import { gmailConfig,fingerprint,processMail } from '../_shared/worker.ts';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async(request:Request)=>{
  let headers:Record<string,string>={};
  try {
    headers=corsHeaders(request);if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if(request.method!=='POST') throw new HttpError(405,'POST_REQUIRED');
    if(Number(request.headers.get('content-length')??0)>20_000) throw new HttpError(413,'REQUEST_TOO_LARGE');
    const {db,user,role}=await principalOrStaff(request);
    const raw=await request.text();if(raw.length>20_000) throw new HttpError(413,'REQUEST_TOO_LARGE');
    let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{throw new HttpError(400,'INVALID_JSON');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'INVALID_JSON_OBJECT');
    const action=body.action;
    const settingsResult=await db.from('automation_settings').select('*').eq('id',true).single();assertDb(settingsResult.error);const settings=settingsResult.data!;
    const config=gmailConfig();const senderFingerprint=config?await fingerprint(config):null;
    if(action==='status') {
      const [directory,deliveries,events,heartbeat]=await Promise.all([
        role==='principal'?db.rpc('automation_directory'):Promise.resolve({data:[],error:null}),
        role==='principal'?db.from('email_outbox').select('id,kind,status,recipient_email,created_at,sent_at,error_code').order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[],error:null}),
        db.from('automation_events').select('action,created_at').order('created_at',{ascending:false}).limit(8),db.rpc('automation_heartbeat'),
      ]);assertDb(directory.error);assertDb(deliveries.error);assertDb(events.error);assertDb(heartbeat.error);
      const verified=senderFingerprint?await db.rpc('automation_sender_verified',{p_fingerprint:senderFingerprint,p_recent:true}):{data:false,error:null};assertDb(verified.error);
      return json({role,settings:role==='principal'?settings:{delivery_enabled:settings.delivery_enabled,weekly_enabled:settings.weekly_enabled,low_stock_enabled:settings.low_stock_enabled,expiry_enabled:settings.expiry_enabled,timezone:settings.timezone},
        sender_configured:Boolean(config),sender:role==='principal'?config?.sender??null:null,recent_test_passed:Boolean(verified.data),my_email:role==='principal'?user.email:null,my_email_verified:Boolean(user.email_confirmed_at),directory:directory.data,deliveries:deliveries.data,events:events.data,cron_last_seen:heartbeat.data},200,headers);
    }
    if(action==='preview') {
      const now=new Date();const end=new Date(Date.parse(localDay(now)) - 330*60_000);const start=new Date(end.getTime()-7*86_400_000);
      const content=await snapshot(db,'weekly',start.toISOString(),end.toISOString(),{low_stock:true,expiry:true},now);
      if(role!=='principal') {content.consumption=[];content.write_offs=[];content.pending_requests=0;content.unresolved_discrepancies=0;content.kind='daily';}
      return json({preview:true,content},200,headers); // Never enqueues or sends mail.
    }
    if(role!=='principal') throw new HttpError(403,'PRINCIPAL_REQUIRED');
    if(action==='save_settings') {
      const input=body.settings as Record<string,unknown>|undefined;
      if(!input||typeof input.expected_updated_at!=='string'||!validWebUrl(input.web_app_url)) throw new HttpError(400,'HTTPS_APP_ROOT_REQUIRED');
      for(const key of ['weekly_enabled','low_stock_enabled','expiry_enabled']) if(typeof input[key]!=='boolean') throw new HttpError(400,'INVALID_RULE_FLAGS');
      for(const key of ['principal_recipient_ids','staff_recipient_ids']) if(!Array.isArray(input[key])||(input[key] as unknown[]).length>20||!(input[key] as unknown[]).every(id=>typeof id==='string'&&UUID.test(id))) throw new HttpError(400,'INVALID_RECIPIENTS');
      const result=await db.rpc('automation_configure',{p_actor:user.id,p_settings:input});assertDb(result.error,'RECIPIENTS_OR_SETTINGS_INVALID');
      return json({status:'saved_delivery_paused'},200,headers);
    }
    if(action==='send_test') {
      if(body.confirmation!=='SEND_TEST_TO_MY_VERIFIED_ADDRESS'||typeof body.request_id!=='string'||!UUID.test(body.request_id)) throw new HttpError(400,'EXPLICIT_TEST_CONFIRMATION_REQUIRED');
      if(!config) throw new HttpError(409,'GMAIL_NOT_CONFIGURED');
      if(!user.email||!user.email_confirmed_at) throw new HttpError(409,'VERIFY_YOUR_ACCOUNT_EMAIL_FIRST');
      const existing=await db.from('email_outbox').select('id,recipient_id,status').eq('dedupe_key',`test:${body.request_id}`).maybeSingle();assertDb(existing.error);
      if(existing.data&&existing.data.recipient_id!==user.id) throw new HttpError(403,'TEST_OWNER_MISMATCH');
      const prepared=await db.rpc('automation_prepare_test',{p_actor:user.id,p_request_id:body.request_id});assertDb(prepared.error,'REVIEW_TEST_STATE_OR_DAILY_TEST_LIMIT');
      if(!existing.data||existing.data.status==='pending') await processMail(db,String(body.request_id));
      const result=await db.from('email_outbox').select('id,status,error_code').eq('dedupe_key',`test:${body.request_id}`).single();assertDb(result.error);
      return json({delivery:result.data},200,headers);
    }
    if(action==='set_delivery') {
      if(typeof body.enabled!=='boolean') throw new HttpError(400,'INVALID_DELIVERY_FLAG');
      if(body.enabled&&body.confirmation!=='ENABLE_APPROVED_RECIPIENTS') throw new HttpError(400,'EXPLICIT_ACTIVATION_REQUIRED');
      if(body.enabled&&!config) throw new HttpError(409,'GMAIL_NOT_CONFIGURED');
      if(body.enabled&&!validWebUrl(settings.web_app_url)) throw new HttpError(409,'HTTPS_APP_ROOT_REQUIRED');
      const result=await db.rpc('automation_switch',{p_actor:user.id,p_enabled:body.enabled,p_fingerprint:senderFingerprint??''});
      assertDb(result.error,'ACTIVATION_REQUIRES_VERIFIED_RECIPIENTS_RECENT_TEST_AND_SCHEDULER');
      return json({status:body.enabled?'enabled':'paused'},200,headers);
    }
    throw new HttpError(400,'UNKNOWN_ACTION');
  } catch(error) {
    const status=error instanceof HttpError?error.status:500;
    const message=error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'AUTOMATION_ADMIN_FAILED';
    return json({error:message},status,headers);
  }
});
