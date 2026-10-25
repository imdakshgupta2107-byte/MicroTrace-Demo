import { type Admin, assertDb, event } from './db.ts';
import { oauthToken,sendGmail,type GmailConfig } from './gmail.ts';
import { renderReport,reportLink,validEmail,type ReportContent } from './core.ts';
export function gmailConfig(): GmailConfig|null {
  const clientId=Deno.env.get('GMAIL_CLIENT_ID')??'', clientSecret=Deno.env.get('GMAIL_CLIENT_SECRET')??'',refreshToken=Deno.env.get('GMAIL_REFRESH_TOKEN')??'',sender=Deno.env.get('GMAIL_SENDER')??'';
  return clientId&&clientSecret&&refreshToken&&validEmail(sender)?{clientId,clientSecret,refreshToken,sender}:null;
}
export async function fingerprint(config: GmailConfig): Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(config)));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function stillAllowed(db:Admin,mail:Record<string,unknown>) {
  const [member,user,settings]=await Promise.all([db.from('lab_members').select('active,role').eq('id',mail.recipient_id).single(),db.auth.admin.getUserById(String(mail.recipient_id)),db.from('automation_settings').select('*').eq('id',true).single()]);
  if(member.error||user.error||settings.error) throw new Error('RECIPIENT_VERIFICATION_FAILED');
  if(!member.data.active||!user.data.user.email_confirmed_at||user.data.user.email!==mail.recipient_email) return false;
  if(mail.kind==='test') return member.data.role==='principal'&&Date.parse(String(mail.created_at))>Date.now()-300_000;
  if(!settings.data.delivery_enabled) return false;
  return mail.kind==='weekly' ? member.data.role==='principal'&&settings.data.principal_recipient_ids.includes(mail.recipient_id) : ['staff','principal'].includes(member.data.role)&&settings.data.staff_recipient_ids.includes(mail.recipient_id);
}
export async function processMail(db:Admin,onlyId?:string) {
  const config=gmailConfig(); if(!config) throw new Error('GMAIL_NOT_CONFIGURED');
  const senderFingerprint=await fingerprint(config);
  const due=await db.from('email_outbox').select('id').eq('status','pending').lte('next_attempt_at',new Date().toISOString()).limit(1);
  assertDb(due.error);if(!due.data?.length&&!onlyId) return {processed:0};
  let token:string;
  try {token=await oauthToken(config);} catch {
    // No send POST has happened; delay a token refresh attempt, rather than duplicating mail.
    await db.from('email_outbox').update({next_attempt_at:new Date(Date.now()+900_000).toISOString(),error_code:'GMAIL_AUTH_FAILED'}).eq('status','pending');
    await event(db,null,'GMAIL_AUTH_FAILED');throw new Error('GMAIL_AUTH_FAILED');
  }
  const claimed=await db.rpc('automation_claim_mail',{p_id:onlyId??null});assertDb(claimed.error);
  let processed=0;
  for(const mail of claimed.data??[]) {
    try {
      if(!(await stillAllowed(db,mail))) {const cancel=await db.from('email_outbox').update({status:'cancelled',lease_until:null,error_code:'RECIPIENT_OR_DELIVERY_DISABLED'}).eq('id',mail.id);assertDb(cancel.error);continue;}
      let message:{subject:string;text:string;html:string};
      if(mail.kind==='test') message={subject:'MicroTrace — approved sender test',text:'This is the test email you explicitly requested in MicroTrace. Scheduled delivery remains disabled until a principal activates it. No student information is included.',html:'<h2>MicroTrace sender test</h2><p>This is your explicitly approved test email. Scheduled delivery remains disabled until activation. No student information is included.</p>'};
      else {
        const report=await db.from('automation_reports').select('content').eq('id',mail.report_id).single();assertDb(report.error);
        const settings=await db.from('automation_settings').select('web_app_url').eq('id',true).single();assertDb(settings.error);
        message=renderReport(report.data!.content as ReportContent,reportLink(settings.data!.web_app_url,mail.report_id));
      }
      const outcome=await sendGmail(config,token,{id:mail.id,to:mail.recipient_email,...message});
      const retry=outcome.status==='retry'&&mail.attempts<4;
      const update=await db.from('email_outbox').update({status:outcome.status==='retry'?(retry?'pending':'failed'):outcome.status,
        lease_until:null,sender_fingerprint:senderFingerprint,
        sent_at:outcome.status==='sent'?new Date().toISOString():null,
        provider_message_id:outcome.status==='sent'?outcome.messageId:null,
        error_code:outcome.status==='sent'?null:outcome.code,
        ...(retry?{next_attempt_at:new Date(Date.now()+Math.pow(2,mail.attempts)*60_000).toISOString()}:{})}).eq('id',mail.id).eq('status','processing');
      // If this write fails, the processing lease later becomes UNKNOWN, never auto-retried.
      assertDb(update.error,'DELIVERY_RECEIPT_WRITE_FAILED');processed++;
    } catch {
      // Conservative: an unknown error after claiming could have happened after a successful send.
      await db.from('email_outbox').update({status:'unknown',lease_until:null,error_code:'WORKER_OUTCOME_UNCERTAIN_REVIEW_SENT_FOLDER'}).eq('id',mail.id).eq('status','processing');
    }
  }
  return {processed};
}
