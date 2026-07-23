interface StatTileProps {
  label: string;
  value: string;
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
