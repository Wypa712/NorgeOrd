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
          className={`alert ${alertClass[t.type]} w-fit max-w-sm items-start gap-3 rounded-xl shadow-lg transition-all duration-500 ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
          role="alert"
        >
          <span className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-5">
            {t.message}
          </span>
          <button
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity leading-none"
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
