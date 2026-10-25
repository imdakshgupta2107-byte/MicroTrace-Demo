import { Link,useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { RouteRedirect } from '@/components/auth/route-redirect';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ReportPanel } from './report-panel';
import type { ReportContent } from './api';
export default function AutomationReportPage(){
 const {role}=useAuth();const {id}=useParams();const allowed=role==='principal'||role==='staff';
 const query=useQuery({queryKey:['automation-report',id,role],enabled:allowed&&Boolean(id&&supabase),queryFn:async()=>{const result=await supabase!.from('automation_reports').select('kind,content,period_start,period_end').eq('id',id!).maybeSingle();if(result.error||!result.data)throw new Error('Report not found or your account is not authorized to view it.');return result.data;}});
 if(!allowed)return <RouteRedirect to="/dashboard" replace/>;
 return <><PageHeader title="Protected automation report" sub="Authentication and database access rules protect this record."/><Link to="/automation" className="inline-block text-sm underline text-navy font-bold mb-5">← Automation centre</Link>{query.isPending&&<p role="status">Loading report…</p>}{query.isError&&<div role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl">{query.error.message}</div>}{query.data&&<ReportPanel content={query.data.content as ReportContent}/>}</>;
}
