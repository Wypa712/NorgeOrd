import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../lib/api';
import type { AuthResponse, ApiError } from '../../lib/types';

export default function RegisterForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [serverError, setServerError] = useState('');
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
    } else if (password.length < 8) {
      setPasswordError('Мінімум 8 символів');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (confirm !== password) {
      setConfirmError('Паролі не збігаються');
      valid = false;
    } else {
      setConfirmError('');
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
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
      });
      login(data.token, data.userId);
      navigate('/words', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const message = ((err as { response?: { data?: ApiError } })?.response?.data as ApiError)?.error;

      if (status === 409) {
        setServerError('Цей email вже зареєстрований');
        (document.getElementById('reg-email') as HTMLInputElement)?.focus();
      } else {
        setServerError(message ?? 'Помилка сервера. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBlur() {
    if (!submitted) return;
    validate();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Форма реєстрації" noValidate>
      <h1 className="text-2xl font-semibold">Зареєструватися</h1>

      {serverError && (
        <div className="alert alert-error rounded-lg" role="alert">
          <span>{serverError}</span>
        </div>
      )}

      <Input
        id="reg-email"
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
        id="reg-password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={handleBlur}
        error={passwordError}
        disabled={loading}
        autoComplete="new-password"
      />

      <Input
        id="reg-confirm"
        label="Підтвердіть пароль"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onBlur={handleBlur}
        error={confirmError}
        disabled={loading}
        autoComplete="new-password"
      />

      <Button type="submit" block loading={loading}>
        {loading ? 'Реєструю…' : 'Зареєструватися'}
      </Button>

      <p className="text-sm text-center">
        Вже маєте акаунт?{' '}
        <Link to="/login" className="text-primary font-semibold">
          Увійти
        </Link>
      </p>
    </form>
  );
}
