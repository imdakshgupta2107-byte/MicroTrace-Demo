#!/usr/bin/env node
/** Run LOCALLY by the mailbox owner. It only obtains authorization; it never sends mail. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.send';
export function authorizationUrl(clientId,redirect,state,verifier){
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:GMAIL_SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();return url.toString();
}
export function parseDesktopCredentials(json){
 const config=json?.installed;
 if(!config?.client_id?.endsWith('.apps.googleusercontent.com')||typeof config.client_secret!=='string'||!config.client_secret)throw new Error('Use the Desktop-app OAuth client JSON downloaded from your Google Cloud project.');
 return config;
}
export async function main(args=process.argv.slice(2)){
 if(args.includes('--help')){console.log('Usage: npm run setup:gmail -- --credentials .secrets/oauth-desktop.json --sender lab@gmail.com\nRuns only on your own computer. Obtains gmail.send consent with PKCE; never sends mail.');return;}
 const option=name=>{const index=args.indexOf(name);return index>=0?args[index+1]:undefined;};
 const credentials=option('--credentials'),sender=option('--sender');
 if(!credentials||!sender||!/^\S+@\S+\.\S+$/.test(sender)||/[\r\n]/.test(sender))throw new Error('Provide --credentials FILE and --sender MAILBOX. Use --help for details.');
 const config=parseDesktopCredentials(JSON.parse(fs.readFileSync(credentials,'utf8')));
 const dir=path.resolve('.secrets'),output=path.join(dir,'gmail.env');
 if(fs.existsSync(output)&&!args.includes('--replace'))throw new Error('gmail.env already exists. Back it up securely, then use --replace only if rotating authorization.');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(64).toString('base64url');
 let finish,fail;const codePromise=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
 const server=http.createServer((request,response)=>{
  const url=new URL(request.url??'/','http://127.0.0.1');
  if(url.pathname!=='/oauth/callback'){response.writeHead(404);response.end('Not found');return;}
  const received=Buffer.from(url.searchParams.get('state')??''),expected=Buffer.from(state);
  if(received.length!==expected.length||!timingSafeEqual(received,expected)){response.writeHead(400);response.end('Invalid authorization state.');return;}
  if(url.searchParams.has('error')){response.writeHead(400);response.end('Authorization was not granted.');fail(new Error('Gmail authorization was declined.'));return;}
  const code=url.searchParams.get('code');if(!code){response.writeHead(400);response.end('Missing code');return;}
  response.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});response.end('Authorization received. Return to the local terminal. No email has been sent.');finish(code);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const redirect=`http://127.0.0.1:${server.address().port}/oauth/callback`;
 console.log('Open this Google authorization URL in your OWN computer’s browser:\n'+authorizationUrl(config.client_id,redirect,state,verifier));
 console.log('\nOnly the gmail.send scope is requested. No password or inbox-read access. Waiting up to 5 minutes…');
 const timeout=setTimeout(()=>fail(new Error('Authorization timed out. Run the helper again.')),300_000);
 try{
  const code=await codePromise;
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(20_000),body:new URLSearchParams({client_id:config.client_id,client_secret:config.client_secret,code,code_verifier:verifier,redirect_uri:redirect,grant_type:'authorization_code'})});
  if(!response.ok)throw new Error('Token exchange failed. Review the Google Cloud OAuth setup; no tokens have been printed.');
  const tokens=await response.json();
  if(typeof tokens.refresh_token!=='string'||!tokens.refresh_token)throw new Error('No refresh token returned. Revoke old app consent if necessary and authorize offline access again.');
  if(tokens.scope&&!tokens.scope.split(' ').includes(GMAIL_SCOPE))throw new Error('gmail.send permission was not granted.');
  const values={GMAIL_CLIENT_ID:config.client_id,GMAIL_CLIENT_SECRET:config.client_secret,GMAIL_REFRESH_TOKEN:tokens.refresh_token,GMAIL_SENDER:sender};
  fs.writeFileSync(output,Object.entries(values).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n',{mode:0o600});fs.chmodSync(output,0o600);
  console.log('Saved private .secrets/gmail.env. Do NOT paste it in chat, commit, email or package it.\nUpload locally with: npx supabase secrets set --env-file .secrets/gmail.env\nNo test or scheduled email was sent.');
 }finally{clearTimeout(timeout);server.closeAllConnections();server.close();}
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
