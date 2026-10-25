import {describe,it,expect,vi} from 'vitest';
import {oauthToken,sendGmail} from '../../supabase/functions/_shared/gmail';
const config={clientId:'client',clientSecret:'secret-test',refreshToken:'refresh-test',sender:'lab@example.test'};
const message={id:'fe292d07-dfd9-42dc-b808-a20be01db423',to:'principal@example.test',subject:'Test',text:'Test',html:'<p>Test</p>'};
describe('mocked Gmail API—no real email sent',()=>{
 it('requests a server-side refresh token exchange, not an inbox scope',async()=>{const fetcher=vi.fn(async()=>new Response(JSON.stringify({access_token:'access'}),{status:200}));expect(await oauthToken(config,fetcher as typeof fetch)).toBe('access');expect(fetcher).toHaveBeenCalledWith('https://oauth2.googleapis.com/token',expect.objectContaining({method:'POST'}));});
 it('fails before sending if token authorization fails',async()=>{const fetcher=vi.fn(async()=>new Response('{}',{status:400}));await expect(oauthToken(config,fetcher as typeof fetch)).rejects.toThrow('GMAIL_AUTH_FAILED');expect(fetcher).toHaveBeenCalledTimes(1);});
 it('records only an actual provider message ID as accepted',async()=>expect(await sendGmail(config,'access',message,vi.fn(async()=>new Response('{"id":"gmail-id"}',{status:200})) as typeof fetch)).toEqual({status:'sent',messageId:'gmail-id'}));
 it('holds a send timeout for review, never automatic retry',async()=>expect((await sendGmail(config,'access',message,vi.fn(async()=>{throw new Error('timeout');}) as typeof fetch)).status).toBe('unknown'));
 it('holds a server error for review',async()=>expect((await sendGmail(config,'access',message,vi.fn(async()=>new Response('{}',{status:503})) as typeof fetch)).status).toBe('unknown'));
 it('can retry an explicitly refused rate-limit response',async()=>expect((await sendGmail(config,'access',message,vi.fn(async()=>new Response('{}',{status:429})) as typeof fetch)).status).toBe('retry'));
 it('does not call success without a receipt',async()=>expect((await sendGmail(config,'access',message,vi.fn(async()=>new Response('{}',{status:200})) as typeof fetch)).status).toBe('unknown'));
 it('treats a permission failure as failed, not successful',async()=>expect((await sendGmail(config,'access',message,vi.fn(async()=>new Response('{}',{status:403})) as typeof fetch)).status).toBe('failed'));
});
