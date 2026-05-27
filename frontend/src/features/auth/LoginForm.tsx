import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../lib/api';
import type { AuthResponse, ApiError } from '../../lib/types';

export default function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errorAlertRef = useRef<HTMLDivElement>(null);

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
    setServerError('');

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
        setServerError('Невірний email або пароль');
      } else {
        setServerError(message ?? 'Помилка сервера. Спробуйте ще раз.');
      }
      setPassword('');
      setTimeout(() => errorAlertRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  function handleBlur(field: 'email' | 'password') {
    if (!submitted) return;
    if (field === 'email') validate();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Форма входу" noValidate>
      <h1 className="text-2xl font-semibold">Увійти</h1>

      {serverError && (
        <div
          className="alert alert-error rounded-lg"
          role="alert"
          tabIndex={-1}
          ref={errorAlertRef}
        >
          <span>{serverError}</span>
        </div>
      )}

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
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
        onBlur={() => handleBlur('password')}
        error={passwordError}
        disabled={loading}
        autoComplete="current-password"
      />

      <Button type="submit" block loading={loading}>
        {loading ? 'Входжу…' : 'Увійти'}
      </Button>

      <p className="text-sm text-center">
        Немає акаунту?{' '}
        <Link to="/register" className="text-primary font-semibold">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
