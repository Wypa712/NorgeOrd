const WORD_CLASS_LABELS: Record<string, string> = {
  noun: 'іменник',
  verb: 'дієслово',
  adjective: 'прикметник',
  adverb: 'прислівник',
  other: 'інше',
};

export function WordClassBadge({ wordClass }: { wordClass: string }) {
  return (
    <span className="badge badge-neutral badge-sm">
      {WORD_CLASS_LABELS[wordClass] ?? wordClass}
    </span>
  );
}
