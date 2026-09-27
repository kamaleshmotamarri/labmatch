import { AuthControls } from '@/components/auth-controls';
import { Profile, Workspace } from '@/components/workspace';
export const metadata = {title:'Your profile | Labmatch'};
export default function Page(){return <Workspace auth={<AuthControls />}><Profile/></Workspace>;}
