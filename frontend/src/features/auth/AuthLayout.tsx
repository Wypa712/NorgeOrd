import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
      <div className="card bg-base-200 shadow-sm w-full max-w-sm">
        <div className="card-body p-6 md:p-8 gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
