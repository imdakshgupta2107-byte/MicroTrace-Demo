import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db=new PGlite();
try{
await db.exec(`create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; grant usage on schema public,auth to anon,authenticated,service_role; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant execute on function auth.uid() to public;`);
for(const file of fs.readdirSync('supabase/migrations').sort()){
 console.log('Applying',file);await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
}
console.log('Fresh migrations parsed/executed by PostgreSQL (PGlite).');
await db.exec(`insert into auth.users values('00000000-0000-4000-8000-000000000001','principal@example.test',now());insert into public.lab_members(id,role,full_name) values('00000000-0000-4000-8000-000000000001','principal','Test principal');`);
console.log('Runner lease:',(await db.query('select public.automation_lease()')).rows);
console.log('Mail claim:',(await db.query('select * from public.automation_claim_mail()')).rows);
console.log('Directory:',(await db.query('select public.automation_directory()')).rows);
}catch(error){console.error(error.message);if(error.detail)console.error(error.detail);if(error.where)console.error(error.where);process.exitCode=1;}finally{await db.close();}
