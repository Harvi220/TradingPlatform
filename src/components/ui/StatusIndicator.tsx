/**
 * Индикатор статуса WebSocket
 */

import { getStatusDisplay } from "@/shared/utils/status";

interface StatusIndicatorProps {
  status: string;
  label?: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const statusDisplay = getStatusDisplay(status);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${statusDisplay.color} ${
          status === "connected" ? "animate-pulse" : ""
        }`}
      />
      <span className={`text-sm font-medium ${statusDisplay.textColor}`}>
        {label || statusDisplay.text}
      </span>
    </div>
  );
}
