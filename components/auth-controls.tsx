import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export function AuthControls({ signedInExtra }: { signedInExtra?: ReactNode }) {
  return (
    <div className="auth-controls">
      <Show when="signed-out">
        <SignInButton>
          <button type="button" className="text-link">Sign in</button>
        </SignInButton>
        <SignUpButton>
          <button type="button" className="button small">
            Sign up <span>↗</span>
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        {signedInExtra}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'clerk-user-button',
            },
          }}
        />
      </Show>
    </div>
  );
}
