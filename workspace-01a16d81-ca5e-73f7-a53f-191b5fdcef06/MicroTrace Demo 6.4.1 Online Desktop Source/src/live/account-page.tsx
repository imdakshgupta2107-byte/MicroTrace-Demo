import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/screens/_shared';
import { Button } from '@/components/ui/button';
import { useStudent } from '@/hooks/useStudent';
import { useLiveSession } from './use-live-session';
import { readConnection,clearConnection } from './connection';
import { signOutLive } from './session';
export default function LiveAccountPage(){const session=useLiveSession();const {profile}=useStudent();return <>
 <PageHeader title="Account & connection" sub="Authenticated live workspace. Demo PINs and sample-data resets are disabled."/>
 <div className="grid lg:grid-cols-2 gap-4"><Card title="Your live account"><dl className="text-sm space-y-3"><div><dt className="text-slate-500 text-xs">Name</dt><dd className="font-bold">{profile?.name}</dd></div><div><dt className="text-slate-500 text-xs">Email</dt><dd className="break-all">{session.email}</dd></div><div><dt className="text-slate-500 text-xs">Assigned role</dt><dd className="capitalize font-semibold">{session.role}</dd></div><div><dt className="text-slate-500 text-xs">Project</dt><dd className="break-all">{readConnection()?.url}</dd></div></dl><Button onClick={signOutLive}>Sign out</Button></Card>
 <Card title="Live data & automation"><p className="text-sm text-slate-500 leading-relaxed">Only active, authenticated lab members can access shared records. The principal manages membership and email recipients. No sample data is uploaded automatically and there is no silent offline data fallback.</p>{['staff','principal'].includes(session.role??'')&&<Link to="/automation" className="inline-block font-bold text-sm text-navy underline">Open automation centre →</Link>}<p className="text-xs text-slate-500">Passwords and membership changes must be managed through your administrator’s authenticated account workflow.</p></Card></div>
 </>;}
