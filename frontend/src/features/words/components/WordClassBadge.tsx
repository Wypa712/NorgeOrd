const WORD_CLASS_LABELS: Record<string, string> = {
  noun: 'subst.',
  verb: 'verb',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  sentence: 'setn.',
  other: 'anna',
};

export function WordClassBadge({ wordClass }: { wordClass: string }) {
  return (
    <span className="badge badge-neutral badge-sm">
      {WORD_CLASS_LABELS[wordClass] ?? wordClass}
    </span>
  );
}
