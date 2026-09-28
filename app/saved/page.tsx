import { auth } from "@clerk/nextjs/server";
import { AuthControls } from '@/components/auth-controls';
import { Saved, Workspace } from '@/components/workspace';
export const metadata = {title:'Saved labs | Labmatch'};
export default async function Page(){
  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn({ returnBackUrl: "/saved" });
  return <Workspace auth={<AuthControls />}><Saved/></Workspace>;
}
