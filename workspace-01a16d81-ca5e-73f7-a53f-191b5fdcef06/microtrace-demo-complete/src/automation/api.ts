import { supabase } from '@/lib/supabase';
export type { ReportContent,Signal,StockRow } from '../../supabase/functions/_shared/core';
export interface AutomationSettings { delivery_enabled:boolean;weekly_enabled:boolean;low_stock_enabled:boolean;expiry_enabled:boolean;timezone:string;principal_recipient_ids?:string[];staff_recipient_ids?:string[];web_app_url?:string;updated_at?:string }
export interface DirectoryMember {id:string;name:string;role:'staff'|'principal';email:string;verified:boolean}
export interface Delivery {id:string;kind:string;status:string;recipient_email:string;created_at:string;sent_at:string|null;error_code:string|null}
export interface AutomationStatus {role:'staff'|'principal';settings:AutomationSettings;sender_configured:boolean;sender:string|null;recent_test_passed:boolean;my_email:string|null;my_email_verified:boolean;directory:DirectoryMember[];deliveries:Delivery[];events:{action:string;created_at:string}[];cron_last_seen:string|null}
const MESSAGES:Record<string,string>={GMAIL_NOT_CONFIGURED:'Gmail OAuth is not configured on the server yet.',HTTPS_APP_ROOT_REQUIRED:'Enter the root URL of your hosted HTTPS app (no path or query).',RECIPIENTS_OR_SETTINGS_INVALID:'Settings were not saved. Select verified accounts and reload the latest settings if another principal changed them.',ACTIVATION_REQUIRES_VERIFIED_RECIPIENTS_RECENT_TEST_AND_SCHEDULER:'Activation requires verified recipients, a successful test in the last 24 hours, an HTTPS app URL and a scheduler heartbeat in the last 5 minutes.',REVIEW_UNCERTAIN_TEST_IN_GMAIL_SENT_FIRST:'A prior test has an uncertain outcome. Ask the administrator to check Gmail Sent before another test.',GMAIL_AUTH_FAILED:'Gmail authorization failed. The administrator must review the server-side OAuth setup.'};
export async function automationCall<T>(body:Record<string,unknown>):Promise<T>{
 if(!supabase)throw new Error('The live backend is not connected.');
 const {data,error}=await supabase.functions.invoke('automation-admin',{body});
 if(error){let code='';try{code=String((await (error.context as Response).clone().json()).error??'');}catch{/* network/CORS failures have no JSON response */}throw new Error(MESSAGES[code]??(code?code.replace(/_/g,' ').toLowerCase():'Unable to reach the automation service. Check deployment, your session and allowed web origins.'));}
 return data as T;
}
