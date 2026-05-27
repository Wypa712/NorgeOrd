import { useToastStore } from '../lib/toastStore';

const alertClass = {
  error: 'alert-error',
  success: 'alert-success',
  info: 'alert-info',
};

export default function Toaster() {
  const { toasts, removeToast, hideToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-top toast-end z-50 gap-2 p-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`alert ${alertClass[t.type]} shadow-lg rounded-xl max-w-xs transition-all duration-500 ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
          role="alert"
        >
          <span className="text-sm">{t.message}</span>
          <button
            className="btn btn-ghost btn-xs ml-auto"
            onClick={() => {
              hideToast(t.id);
              setTimeout(() => removeToast(t.id), 500);
            }}
            aria-label="Закрити"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
