/**
 * Карточка со статистикой
 */

interface StatCardProps {
  label: string;
  value: string | null;
  className?: string;
}

export function StatCard({ label, value, className = "" }: StatCardProps) {
  return (
    <div className={className}>
      <div className="text-gray-600 text-sm">{label}</div>
      <div className="font-mono text-lg mt-1">{value || "N/A"}</div>
    </div>
  );
}
