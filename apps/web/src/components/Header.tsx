'use client';

import { OrganizationSwitcher, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-800 pt-4 pb-4">
      <div className="text-xl font-bold">AI Support</div>
      <div className="flex items-center gap-4">
        <Show when="signed-out">
          <SignInButton>
            <button className="text-sm font-medium hover:text-neutral-300">Log In</button>
          </SignInButton>
          <SignUpButton>
            <button className="rounded bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200">
              Sign Up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <OrganizationSwitcher hidePersonal appearance={{ elements: { rootBox: 'text-neutral-100' } }} />
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
