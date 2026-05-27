import { Word } from '../api/wordsApi';
import { WordClassBadge } from './WordClassBadge';
import { GenderBadge } from './GenderBadge';

interface Props {
  word: Word;
  onWordClick: (id: string) => void;
}

export function WordListRow({ word, onWordClick }: Props) {
  const handleClick = () => onWordClick(word.id);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  };

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-3 px-4 py-3 border-b border-base-300 cursor-pointer hover:bg-base-200 active:bg-base-300"
    >
      <span className="text-base font-semibold flex-1">{word.headword}</span>
      {word.translation && (
        <span className="text-sm text-base-content/70 flex-1 truncate">{word.translation}</span>
      )}
      <div className="flex gap-1 shrink-0">
        {word.gender && <GenderBadge gender={word.gender} />}
        {word.wordClass && <WordClassBadge wordClass={word.wordClass} />}
      </div>
    </li>
  );
}
