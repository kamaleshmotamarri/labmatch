import { AuthControls } from '@/components/auth-controls';
import { Saved, Workspace } from '@/components/workspace';
export const metadata = {title:'Saved labs | Labmatch'};
export default function Page(){return <Workspace auth={<AuthControls />}><Saved/></Workspace>;}
