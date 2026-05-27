import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../lib/api';
import { toast } from '../../lib/toastStore';
import type { AuthResponse, ApiError } from '../../lib/types';

export default function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (token) navigate('/words', { replace: true });
  }, [token, navigate]);

  function validate(): boolean {
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email обов'язковий");
      valid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Невірний формат email');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError("Пароль обов'язковий");
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      login(data.token, data.userId);
      navigate('/words', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const message = ((err as { response?: { data?: ApiError } })?.response?.data as ApiError)?.error;

      if (status === 401) {
        toast.error('Невірний email або пароль');
      } else {
        toast.error(message ?? 'Помилка сервера. Спробуйте ще раз.');
      }
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  function handleBlur() {
    if (!submitted) return;
    validate();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Форма входу" noValidate>
      <h1 className="text-2xl font-semibold mb-4">Увійти</h1>

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleBlur}
        error={emailError}
        autoFocus
        disabled={loading}
        autoComplete="email"
      />

      <Input
        id="password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={handleBlur}
        error={passwordError}
        disabled={loading}
        autoComplete="current-password"
      />

      <div className="mt-4">
        <Button type="submit" block loading={loading}>
          {loading ? 'Входжу…' : 'Увійти'}
        </Button>
      </div>

      <p className="text-sm text-center mt-4">
        Немає акаунту?{' '}
        <Link to="/register" className="text-primary font-semibold">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
