import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './features/auth/AuthLayout';
import LoginForm from './features/auth/LoginForm';
import RegisterForm from './features/auth/RegisterForm';
import ProtectedRoute from './features/auth/ProtectedRoute';
import WordsPage from './pages/WordsPage';
import Toaster from './components/Toaster';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <p className="text-error text-lg font-semibold mb-2">Щось пішло не так.</p>
            <p className="text-base-content/60 text-sm">Оновіть сторінку, щоб продовжити.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <ErrorBoundary>
        <Routes>
          <Route
            path="/login"
            element={<AuthLayout><LoginForm /></AuthLayout>}
          />
          <Route
            path="/register"
            element={<AuthLayout><RegisterForm /></AuthLayout>}
          />
          <Route
            path="/words"
            element={<ProtectedRoute><WordsPage /></ProtectedRoute>}
          />
          <Route path="/" element={<Navigate to="/words" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
