import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { Button } from './Button';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="bg-base-200 shadow-sm sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 navbar">
          <div className="navbar-start">
            <span className="text-primary font-semibold">Norwegian Hub</span>
          </div>
          <div className="navbar-end">
            <Button variant="ghost" className="btn-sm" onClick={handleLogout}>
              Вийти
            </Button>
          </div>
        </nav>
      </div>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
