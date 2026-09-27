import { SignIn } from "@clerk/nextjs";
import { BrandLockup } from "@/components/brand";

export default function SignInPage() {
  return (
    <div className="auth-screen">
      <BrandLockup />
      <p className="eyebrow">WELCOME BACK</p>
      <h1>Sign in to Labmatch.</h1>
      <SignIn />
    </div>
  );
}
