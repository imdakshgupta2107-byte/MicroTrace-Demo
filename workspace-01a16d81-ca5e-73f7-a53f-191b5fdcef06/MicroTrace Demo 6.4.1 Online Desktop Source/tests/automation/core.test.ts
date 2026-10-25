import {describe,it,expect} from 'vitest';
import {dueJobs,localDay,isoDate,expiryDate,inventoryRows,stockSignals,renderReport,mimeMessage,validWebUrl,validEmail,reportLink,type ReportContent} from '../../supabase/functions/_shared/core';
const now=new Date('2026-10-19T03:30:00Z');
const items=[{id:'a',name:'MacConkey agar',unit:'g',min_stock:100},{id:'b',name:'Ethanol',unit:'mL',min_stock:0}];
const containers=[{id:'one',chemical_id:'a',qty:80,state:'sealed',expiry:'2026-11-18',use_by:null,label:'Bottle A',location:'Cupboard 1'},{id:'old',chemical_id:'a',qty:30,state:'opened',expiry:'2026-10-18',use_by:null},{id:'disposed',chemical_id:'a',qty:1000,state:'disposed',expiry:null,use_by:null},{id:'b-one',chemical_id:'b',qty:200,state:'sealed',expiry:null,use_by:null}];
describe('selected IST schedule',()=>{
 it('uses the actual selected time zone at a UTC day boundary',()=>expect(localDay(new Date('2026-10-18T19:00Z'))).toBe('2026-10-19'));
 it('does not run before daily 08:00 IST',()=>expect(dueJobs(new Date('2026-10-19T02:29:59Z'),'2026-10-18T00:00Z').filter(job=>job.kind==='daily')).toHaveLength(0));
 it('runs daily at exactly 08:00 IST',()=>expect(dueJobs(new Date('2026-10-19T02:30Z'),'2026-10-18T00:00Z').map(job=>job.kind)).toEqual(['daily']));
 it('runs weekly at Monday 09:00 IST',()=>expect(dueJobs(now,'2026-10-18T00:00Z').map(job=>job.kind)).toEqual(['daily','weekly']));
 it('uses the previous full Monday-to-Monday week',()=>expect(dueJobs(now,'2026-10-18T00:00Z').find(job=>job.kind==='weekly')).toMatchObject({period_start:'2026-10-11T18:30:00.000Z',period_end:'2026-10-18T18:30:00.000Z'}));
 it('does not backfill runs before activation',()=>expect(dueJobs(now,'2026-10-19T03:31:00Z')).toHaveLength(0));
 it('stays disabled without activation',()=>expect(dueJobs(now,null)).toEqual([]));
 it('respects each enabled rule family',()=>expect(dueJobs(now,'2026-10-18T00:00Z',{weekly:false,daily:true}).map(job=>job.kind)).toEqual(['daily']));
 it('catches up the latest eligible missed weekly job, not every past week',()=>expect(dueJobs(new Date('2026-10-22T05:00Z'),'2026-10-01T00:00Z').filter(job=>job.kind==='weekly')).toHaveLength(1));
});
describe('stock and expiry stages',()=>{
 it('rejects impossible dates',()=>{expect(isoDate('2026-02-30')).toBeNull();expect(isoDate('not-a-date')).toBeNull();});
 it('chooses the earlier use-by date',()=>expect(expiryDate({...containers[0],use_by:'2026-10-24'})).toBe('2026-10-24'));
 it('keeps on-hand and usable stock distinct without adding unlike units',()=>expect(inventoryRows(items,containers,now)).toEqual([{id:'b',name:'Ethanol',unit:'mL',minimum:0,on_hand:200,usable:200},{id:'a',name:'MacConkey agar',unit:'g',minimum:100,on_hand:110,usable:80}]));
 it('alerts at the minimum, not just below it',()=>expect(stockSignals(items,[{...containers[0],qty:100,expiry:null}],now).filter(row=>row.kind==='low_stock')).toHaveLength(1));
 it('treats a zero minimum as not configured',()=>expect(stockSignals([items[1]],[],now)).toEqual([]));
 it('raises exactly one current expiry stage per active lot',()=>expect(stockSignals(items,containers,now).filter(row=>row.kind==='expiry').map(row=>row.stage)).toEqual(['30_days','expired']));
 it('advances to seven days without emitting a 30-day backfill',()=>expect(stockSignals(items,[{...containers[0],expiry:'2026-10-26'}],now).filter(row=>row.kind==='expiry').map(row=>row.stage)).toEqual(['7_days']));
 it('does not call an item expired until after its local expiry day',()=>expect(stockSignals(items,[{...containers[0],expiry:'2026-10-19'}],now).find(row=>row.kind==='expiry')?.stage).toBe('7_days'));
 it('has stable keys for duplicate suppression',()=>expect(stockSignals(items,containers,now).map(row=>row.signal_key)).toEqual(stockSignals(items,containers,new Date('2026-10-19T10:00Z')).map(row=>row.signal_key)));
 it('can disable expiry without disabling minimum checks',()=>expect(stockSignals(items,containers,now,{low_stock:true,expiry:false}).every(row=>row.kind==='low_stock')).toBe(true));
});
describe('privacy and safe MIME',()=>{
 const report:ReportContent={kind:'weekly',generated_at:now.toISOString(),period_start:'2026-10-11T18:30Z',period_end:'2026-10-18T18:30Z',inventory:inventoryRows(items,containers,now),signals:[],pending_requests:3,unresolved_discrepancies:1,consumption:[{id:'a',name:'Agar <unsafe>',quantity:2,unit:'g'}],write_offs:[]};
 const id='fe292d07-dfd9-42dc-b808-a20be01db423';
 it('accepts only HTTPS root app URLs without credentials or queries',()=>{expect(validWebUrl('https://lab.example/')).toBe(true);for(const url of ['http://lab.example','https://u:p@lab.example','https://lab.example/path','https://lab.example/?token=abc'])expect(validWebUrl(url)).toBe(false);});
 it('uses protected URLs without user/email tokens',()=>expect(reportLink('https://lab.example/',id)).toBe(`https://lab.example/automation/reports/${id}`));
 it('does not include requester names or personal request text',()=>{const message=renderReport({...report,...{requester:'PRIVATE STUDENT',purpose:'PRIVATE NOTES'}} as ReportContent,'https://lab.example/report');expect(message.text).not.toContain('PRIVATE');expect(message.html).not.toContain('PRIVATE');});
 it('escapes item text in email HTML',()=>expect(renderReport(report,'https://lab.example/report').html).toContain('Agar &lt;unsafe&gt;'));
 it('rejects newline header injection',()=>{expect(validEmail('staff@example.test\r\nBcc:other@evil.test')).toBe(false);expect(()=>mimeMessage({id,from:'lab@example.test',to:'staff@example.test',subject:'ok\nBcc:evil',text:'ok',html:'ok'})).toThrow();});
 it('creates base64url MIME with plain and HTML alternatives',()=>{const raw=mimeMessage({id,from:'lab@example.test',to:'principal@example.test',subject:'MicroTrace — weekly',text:'Hello',html:'<p>Hello</p>',now});expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);const decoded=Buffer.from(raw,'base64url').toString();expect(decoded).toContain('multipart/alternative');expect(decoded).toContain('text/plain');expect(decoded).toContain('text/html');expect(decoded).toContain(id+'@example.test');});
});
