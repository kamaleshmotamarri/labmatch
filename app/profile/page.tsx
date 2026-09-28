import { auth } from "@clerk/nextjs/server";
import { AuthControls } from '@/components/auth-controls';
import { Profile, Workspace } from '@/components/workspace';
export const metadata = {title:'Your profile | Labmatch'};
export default async function Page(){
  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn({ returnBackUrl: "/profile" });
  return <Workspace auth={<AuthControls />}><Profile/></Workspace>;
}
