interface StatTileProps {
  label: string;
  value: string;
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}
