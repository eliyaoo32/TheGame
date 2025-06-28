'use client';

import { Logo } from '@/components/icons';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
            <Logo className="h-12 w-12 text-primary" />
        </div>
        {children}
      </div>
    </div>
  );
}
