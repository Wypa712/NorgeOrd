const GENDER_LABELS: Record<string, string> = {
  masculine: 'ч',
  feminine: 'ж',
  neuter: 'с',
};

export function GenderBadge({ gender }: { gender: string }) {
  return (
    <span className="badge badge-ghost badge-sm">
      {GENDER_LABELS[gender] ?? gender}
    </span>
  );
}
