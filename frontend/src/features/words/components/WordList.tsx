import type { Word } from '../api/wordsApi';
import { WordListRow } from './WordListRow';

interface Props {
  words: Word[];
  isPending: boolean;
  isError: boolean;
  onWordClick: (id: string) => void;
  searchQuery?: string;
}

export function WordList({ words, isPending, isError, onWordClick, searchQuery }: Props) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-1 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-base-300 rounded h-12 mx-4 my-1" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-error text-center py-8">
        Не вдалося завантажити слова. Оновіть сторінку.
      </p>
    );
  }

  if (words.length === 0) {
    if (searchQuery?.trim()) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-base-content/50">
            Нічого не знайшлося для «{searchQuery}»
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">Словник порожній</h2>
        <p className="text-base-content/50">Перейдіть в AI пошук, щоб додати перше слово.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 px-4 py-2 border-b-2 border-base-300 text-xs font-semibold text-base-content/50 uppercase tracking-wide">
        <span>Слово</span>
        <span>Переклад</span>
      </div>
      <ul>
        {words.map(w => (
          <WordListRow key={w.id} word={w} onWordClick={onWordClick} />
        ))}
      </ul>
    </div>
  );
}
