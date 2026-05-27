interface Props {
  onClick: () => void;
}

export function FAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="btn btn-primary btn-circle w-14 h-14 shadow-lg fixed bottom-6 right-6 z-50 text-2xl"
      aria-label="Додати слово"
    >
      +
    </button>
  );
}
