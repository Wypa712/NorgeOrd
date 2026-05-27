import { Word } from '../api/wordsApi';
import { WordListRow } from './WordListRow';

interface Props {
  words: Word[];
  isPending: boolean;
  isError: boolean;
  onWordClick: (id: string) => void;
}

export function WordList({ words, isPending, isError, onWordClick }: Props) {
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">Словник порожній</h2>
        <p className="text-base-content/50">Натисніть + щоб додати перше слово.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-base-300">
      {words.map(w => (
        <WordListRow key={w.id} word={w} onWordClick={onWordClick} />
      ))}
    </ul>
  );
}
