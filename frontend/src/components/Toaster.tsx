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
    <div className="toast toast-top toast-end z-50 gap-2 p-3 sm:p-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`alert ${alertClass[t.type]} flex w-[calc(100vw-1.5rem)] max-w-sm flex-nowrap items-center gap-3 rounded-xl px-4 py-3 shadow-lg transition-all duration-500 sm:w-fit ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
          role="alert"
        >
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm leading-5">
            {t.message}
          </span>
          <button
            className="btn btn-ghost btn-xs btn-circle shrink-0 opacity-70 transition-opacity hover:opacity-100"
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
