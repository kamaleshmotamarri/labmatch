import { Suspense } from "react";
import { AuthControls } from '@/components/auth-controls';
import { Discover, Workspace } from '@/components/workspace';
export const metadata = {title:'Discover | Labmatch'};
export default function Page(){return <Suspense fallback={<p className="loading">Getting ready…</p>}><Workspace auth={<AuthControls />}><Discover/></Workspace></Suspense>;}
