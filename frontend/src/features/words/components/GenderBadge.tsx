const GENDER_LABELS: Record<string, string> = {
  masculine: 'hankjønn',
  feminine: 'hokjønn',
  neuter: 'inkjekjønn',
};

export function GenderBadge({ gender }: { gender: string }) {
  return (
    <span className="badge badge-outline badge-sm">
      {GENDER_LABELS[gender] ?? gender}
    </span>
  );
}
