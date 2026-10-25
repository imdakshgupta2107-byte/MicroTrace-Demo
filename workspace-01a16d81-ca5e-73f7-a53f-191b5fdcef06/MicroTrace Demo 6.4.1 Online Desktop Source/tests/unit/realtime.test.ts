import {beforeEach,describe,it,expect,vi}from'vitest';
const mock=vi.hoisted(()=>({channels:[] as any[],removed:[] as any[]}));
vi.mock('../../src/lib/supabase',()=>({hasCloud:true,supabase:{channel:(name:string)=>{const channel={name,started:false,handlers:[] as (()=>void)[],on(_event:string,_filter:unknown,fn:()=>void){if(this.started)throw new Error('callbacks after subscribe');this.handlers.push(fn);return this;},subscribe(){this.started=true;return this;}};mock.channels.push(channel);return channel;},removeChannel:(channel:unknown)=>{mock.removed.push(channel);return Promise.resolve();}}}));
beforeEach(()=>{mock.channels.length=0;mock.removed.length=0;});
describe('shared live subscription regression',()=>{
 it('allows many hooks without adding callbacks to an already subscribed channel',async()=>{const {subscribeAll}=await import('../../src/lib/realtime');const one=vi.fn(),two=vi.fn();const off1=subscribeAll(one),off2=subscribeAll(two);expect(mock.channels).toHaveLength(1);mock.channels[0].handlers[0]();expect(one).toHaveBeenCalledOnce();expect(two).toHaveBeenCalledOnce();off1();mock.channels[0].handlers[0]();expect(one).toHaveBeenCalledOnce();expect(two).toHaveBeenCalledTimes(2);off2();expect(mock.removed).toHaveLength(1);});
 it('gives remounted/StrictMode channels a fresh identity while old cleanup settles',async()=>{const {subscribeAll}=await import('../../src/lib/realtime');const off1=subscribeAll(vi.fn());const first=mock.channels[0].name;off1();const off2=subscribeAll(vi.fn());expect(mock.channels[1].name).not.toBe(first);off2();});
 it('cleans a subscription only once',async()=>{const {subscribeAll}=await import('../../src/lib/realtime');const off=subscribeAll(vi.fn());off();off();expect(mock.removed).toHaveLength(1);});
});
