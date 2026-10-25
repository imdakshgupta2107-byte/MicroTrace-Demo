import { adminClient, type Admin } from './db.ts';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function corsHeaders(request: Request): Record<string,string> {
  const origin=request.headers.get('origin');
  const allowed=['https://localhost',...(Deno.env.get('ALLOWED_WEB_ORIGINS')??'').split(',').map(value=>value.trim()).filter(Boolean)];
  if (origin && !allowed.includes(origin)) throw new HttpError(403,'ORIGIN_NOT_ALLOWED');
  return { ...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json' };
}
export function json(value: unknown,status=200,headers: Record<string,string>={}) { return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}}); }
export async function principalOrStaff(request: Request): Promise<{db:Admin;user:{id:string;email?:string;email_confirmed_at?:string};role:string}> {
  const authorization=request.headers.get('authorization')??'';
  if (!authorization.startsWith('Bearer ')) throw new HttpError(401,'SIGN_IN_REQUIRED');
  const db=adminClient();
  // getUser verifies the supplied token with Auth. Never trust decoded client metadata/PINs.
  const {data,error}=await db.auth.getUser(authorization.slice(7));
  if (error||!data.user) throw new HttpError(401,'INVALID_SESSION');
  const member=await db.from('lab_members').select('role,active').eq('id',data.user.id).single();
  if(member.error||!member.data?.active||!['staff','principal'].includes(member.data.role)) throw new HttpError(403,'STAFF_OR_PRINCIPAL_REQUIRED');
  return {db,user:data.user,role:member.data.role};
}
export async function secretEqual(actual: string|null,expected: string|undefined): Promise<boolean> {
  if (!actual||!expected||expected.length<32) return false;
  const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [a,b]=await Promise.all([digest(actual),digest(expected)]);let different=0;
  for(let index=0;index<a.length;index++) different|=a[index]^b[index];
  return different===0;
}
