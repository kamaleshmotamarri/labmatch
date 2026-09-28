import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { AuthControls } from '@/components/auth-controls';
import { Assistant } from '@/components/assistant';
import { Workspace } from '@/components/workspace';
export const metadata = {title:'Research companion | Labmatch'};
export default async function Page(){
  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn({ returnBackUrl: "/assistant" });
  return <Suspense fallback={<p className="loading">Getting ready…</p>}><Workspace auth={<AuthControls />}><Assistant/></Workspace></Suspense>;
}
