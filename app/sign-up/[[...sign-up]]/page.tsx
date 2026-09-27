import { SignUp } from "@clerk/nextjs";
import { BrandLockup } from "@/components/brand";

export default function SignUpPage() {
  return (
    <div className="auth-screen">
      <BrandLockup />
      <p className="eyebrow">START HERE</p>
      <h1>Create your Labmatch account.</h1>
      <SignUp />
    </div>
  );
}
