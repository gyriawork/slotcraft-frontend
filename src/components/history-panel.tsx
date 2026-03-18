"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const ACTION_ICONS: Record<string, string> = {
  created: "+",
  step_updated: "~",
  renamed: "R",
  status_changed: "S",
  archived: "X",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  step_updated: "bg-blue-100 text-blue-700",
  renamed: "bg-purple-100 text-purple-700",
  status_changed: "bg-yellow-100 text-yellow-700",
  archived: "bg-red-100 text-red-700",
};

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function HistoryPanel({ projectId, open, onClose }: Props) {
  const [history, setHistory] = useState<Array<{ id: string; action: string; changes: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.projects.history(projectId);
      setHistory(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 border-l border-gray-200 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!loading && history.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No history yet</p>
        )}

        {!loading && history.length > 0 && (
          <div className="space-y-3">
            {history.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${ACTION_COLORS[event.action] ?? "bg-gray-100 text-gray-600"}`}>
                  {ACTION_ICONS[event.action] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 capitalize">{event.action.replace("_", " ")}</p>
                  <p className="text-xs text-gray-500 truncate">{event.changes}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
