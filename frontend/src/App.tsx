import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './features/auth/AuthLayout';
import LoginForm from './features/auth/LoginForm';
import RegisterForm from './features/auth/RegisterForm';
import ProtectedRoute from './features/auth/ProtectedRoute';
import WordsPage from './pages/WordsPage';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
