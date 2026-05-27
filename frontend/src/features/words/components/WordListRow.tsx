import type { Word } from '../api/wordsApi';

interface Props {
  word: Word;
  onWordClick: (id: string) => void;
}

export function WordListRow({ word, onWordClick }: Props) {
  const handleClick = () => onWordClick(word.id);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  };
  const visibleTags = word.tags.slice(0, 2);
  const hiddenTagCount = Math.max(word.tags.length - visibleTags.length, 0);
  const hasMetadata = Boolean(word.difficulty || word.tags.length);

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-2 items-start gap-4 px-4 py-3 border-b border-base-300 cursor-pointer hover:bg-base-200 active:bg-base-300 transition-colors"
    >
      <div className="min-w-0">
        <span className="font-semibold block truncate">{word.headword}</span>
        {hasMetadata && (
          <div className="mt-1 flex flex-wrap gap-1">
            {word.difficulty && (
              <span className="badge badge-neutral badge-sm">{word.difficulty}</span>
            )}
            {visibleTags.map(({ tag }) => (
              <span key={tag.id} className="badge badge-outline badge-sm max-w-full truncate">
                {tag.name}
              </span>
            ))}
            {hiddenTagCount > 0 && (
              <span className="badge badge-ghost badge-sm">+{hiddenTagCount}</span>
            )}
          </div>
        )}
      </div>
      <span className="text-sm text-base-content/60 truncate">{word.translation ?? ''}</span>
    </li>
  );
}
