"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Comment {
  id: string;
  step: number | null;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

interface CommentPanelProps {
  projectId: string;
  currentStep: number;
  open: boolean;
  onClose: () => void;
}

const STEP_LABELS: Record<number, string> = {
  1: "Game Setup",
  2: "Volatility",
  3: "Features",
  4: "Concept",
  5: "Math Model",
  6: "Simulation",
  7: "Prototype",
  8: "Export",
};

export function CommentPanel({ projectId, currentStep, open, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStep, setFilterStep] = useState<number | "all">("all");
  const [showResolved, setShowResolved] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("slotcraft_author_name") ?? "";
    }
    return "";
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const step = filterStep === "all" ? undefined : filterStep;
      const data = await api.comments.list(projectId, step);
      setComments(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, filterStep]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchComments();
    }
  }, [open, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !authorName.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem("slotcraft_author_name", authorName.trim());
      await api.comments.create(projectId, {
        step: filterStep === "all" ? currentStep : filterStep,
        author_name: authorName.trim(),
        body: newComment.trim(),
      });
      setNewComment("");
      fetchComments();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    try {
      await api.comments.resolve(projectId, id, resolved);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolved } : c))
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.comments.delete(projectId, id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  const filtered = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  return (
    <div className="fixed right-0 top-0 z-40 h-full w-[360px] border-l border-gray-200 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Comments</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <select
          value={filterStep}
          onChange={(e) => setFilterStep(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs"
        >
          <option value="all">All steps</option>
          {Object.entries(STEP_LABELS).map(([num, label]) => (
            <option key={num} value={num}>
              Step {num}: {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-gray-300"
          />
          Resolved
        </label>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No comments yet.</p>
        ) : (
          filtered.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg border p-3 ${
                comment.resolved
                  ? "border-gray-100 bg-gray-50 opacity-60"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    {comment.author_name[0]?.toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {comment.author_name}
                  </span>
                  {comment.step !== null && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      Step {comment.step}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{comment.body}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleResolve(comment.id, !comment.resolved)}
                  className="text-[10px] text-gray-500 hover:text-gray-700"
                >
                  {comment.resolved ? "Unresolve" : "Resolve"}
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-[10px] text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        {!authorName && (
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        )}
        <div className="flex gap-2">
          <textarea
            placeholder={`Comment on Step ${filterStep === "all" ? currentStep : filterStep}...`}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            rows={2}
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm resize-none focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim() || !authorName.trim()}
            className="self-end rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {authorName && (
          <p className="text-[10px] text-gray-400">
            Posting as <strong>{authorName}</strong> · Cmd+Enter to send
          </p>
        )}
      </div>
    </div>
  );
}
