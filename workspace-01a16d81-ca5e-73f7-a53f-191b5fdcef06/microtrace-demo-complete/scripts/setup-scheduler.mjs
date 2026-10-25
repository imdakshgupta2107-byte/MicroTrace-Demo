#!/usr/bin/env node
/** Generates private setup files; does not deploy, execute SQL or send mail. */
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const quote=value=>`'${String(value).replace(/'/g,"''")}'`;
export function schedulerSql(projectUrl,publicKey,secret){
 const rows=[['microtrace_project_url',projectUrl],['microtrace_public_key',publicKey],['microtrace_cron_secret',secret]];
 return `-- PRIVATE: contains the cron credential. Run only in your OWN Supabase SQL editor.\n-- This installs the heartbeat job; delivery remains disabled until app approval.\nbegin;\ncreate extension if not exists pg_cron;\ncreate extension if not exists pg_net with schema extensions;\ncreate extension if not exists supabase_vault with schema vault;\nrevoke all on schema vault,cron,net from public,anon,authenticated;\nrevoke all on vault.secrets,vault.decrypted_secrets from public,anon,authenticated;\ndo $setup$\ndeclare secret_id uuid;\nbegin\n${rows.map(([name,value])=>` select id into secret_id from vault.secrets where name=${quote(name)};\n if secret_id is null then perform vault.create_secret(${quote(value)},${quote(name)},'MicroTrace automation');\n else perform vault.update_secret(secret_id,${quote(value)},${quote(name)},'MicroTrace automation');end if;`).join('\n')}\nend $setup$;\nselect cron.unschedule(jobid) from cron.job where jobname='microtrace-automation-minute';\nselect cron.schedule('microtrace-automation-minute','* * * * *',$job$\n select net.http_post(\n  url:=(select decrypted_secret from vault.decrypted_secrets where name='microtrace_project_url')||'/functions/v1/automation-run',\n  headers:=jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='microtrace_public_key'),'x-microtrace-cron',(select decrypted_secret from vault.decrypted_secrets where name='microtrace_cron_secret')),\n  body:='{}'::jsonb,timeout_milliseconds:=120000\n );\n$job$);\ncommit;\n-- Wait one minute; in the app, verify the scheduler heartbeat before activation.\n`;
}
export function main(args=process.argv.slice(2)){
 if(args.includes('--help')){console.log('Usage: npm run setup:scheduler -- --project-url https://REF.supabase.co --app-url https://your-host.example --public-key YOUR_PUBLISHABLE_OR_ANON_KEY\nOnly generates private .secrets files. Does not deploy or enable email.');return;}
 const option=name=>{const index=args.indexOf(name);return index>=0?args[index+1]:undefined;};
 const raw=option('--project-url'),app=option('--app-url'),publicKey=option('--public-key');
 if(!raw||!app||!publicKey)throw new Error('Missing project URL, hosted app URL or public key. Use --help.');
 const project=new URL(raw),web=new URL(app);
 if(project.protocol!=='https:'||!/^([a-z0-9-]{6,64})\.supabase\.co$/.test(project.hostname)||project.pathname!=='/'||project.search||project.hash||project.username||project.password)throw new Error('Use a valid hosted Supabase root URL.');
 if(web.protocol!=='https:'||web.pathname!=='/'||web.search||web.hash||web.username||web.password)throw new Error('Use your hosted HTTPS app root URL without paths/query/credentials.');
 let isPublic=publicKey.startsWith('sb_publishable_')&&publicKey.length>=30;
 try{isPublic ||= JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url').toString()).role==='anon';}catch{}
 if(!isPublic)throw new Error('Only a publishable/legacy anon key is accepted. Never supply service-role or secret keys.');
 const dir=path.resolve('.secrets');fs.mkdirSync(dir,{recursive:true,mode:0o700});const envFile=path.join(dir,'scheduler.env');
 if(fs.existsSync(envFile)&&!args.includes('--rotate'))throw new Error('Scheduler credentials already exist. Back up securely and use --rotate only for intentional rotation.');
 const secret=randomBytes(32).toString('base64url');
 fs.writeFileSync(envFile,`MICROTRACE_CRON_SECRET=${JSON.stringify(secret)}\nALLOWED_WEB_ORIGINS=${JSON.stringify(web.origin)}\n`,{mode:0o600});fs.chmodSync(envFile,0o600);
 const sqlFile=path.join(dir,'install-scheduler.sql');fs.writeFileSync(sqlFile,schedulerSql(project.origin,publicKey,secret),{mode:0o600});fs.chmodSync(sqlFile,0o600);
 console.log('Generated private .secrets/scheduler.env and .secrets/install-scheduler.sql.\n1. Upload: npx supabase secrets set --env-file .secrets/scheduler.env\n2. Run the private SQL in your project SQL editor after deploying functions.\n3. Wait for the heartbeat. Delivery is STILL DISABLED until the approved test and activation.\nDo not share either private file.');
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)try{main();}catch(error){console.error(error.message);process.exitCode=1;}
