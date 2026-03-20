"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Project } from "@/lib/api";

interface SharedData {
  permission: string;
  project: Project;
}

const STEP_LABELS: Record<number, string> = {
  1: "Game Setup",
  2: "Volatility & Metrics",
  3: "Features",
  4: "Concept",
  5: "Math Model",
  6: "Simulation",
  7: "Prototype",
  8: "GDD Export",
};

export default function SharedProjectPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reelspec_author_name") ?? "";
    }
    return "";
  });
  const [comments, setComments] = useState<Array<{ id: string; step: number | null; author_name: string; body: string; resolved: boolean; created_at: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.share.resolve(params.token);
        setData(result);
        // Load comments if comment permission
        if (result.permission === "comment") {
          const cmts = await api.comments.list(result.project.id);
          setComments(cmts);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid or expired share link");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token]);

  const handleComment = useCallback(async () => {
    if (!data || !commentBody.trim() || !authorName.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem("reelspec_author_name", authorName.trim());
      const comment = await api.comments.create(data.project.id, {
        step: activeStep,
        author_name: authorName.trim(),
        body: commentBody.trim(),
      });
      setComments((prev) => [comment, ...prev]);
      setCommentBody("");
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }, [data, commentBody, authorName, activeStep]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Link unavailable</h2>
          <p className="mt-2 text-sm text-gray-500">{error || "This share link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  const { project, permission } = data;
  const stepData = project.step_data ?? {};

  const stepContent = (stepData as Record<string, unknown>)[`step${activeStep}`] as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium text-blue-600">ReelSpec — Shared Project</p>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {project.game_type} &middot; {project.status} &middot; {permission === "comment" ? "View + Comment" : "View only"}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            permission === "comment" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}>
            {permission}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Step nav */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(STEP_LABELS).map(([num, label]) => {
            const n = Number(num);
            const hasData = !!((stepData as Record<string, unknown>)[`step${n}`]);
            return (
              <button
                key={num}
                onClick={() => setActiveStep(n)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeStep === n
                    ? "bg-blue-600 text-white"
                    : hasData
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {num}. {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Step content */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-base font-semibold text-gray-900">
                Step {activeStep}: {STEP_LABELS[activeStep]}
              </h2>
              {stepContent ? (
                <div className="mt-4 space-y-3">
                  {Object.entries(stepContent).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-gray-50 px-4 py-3">
                      <p className="text-xs font-medium text-gray-500">{key.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">No data for this step yet.</p>
              )}
            </div>
          </div>

          {/* Comments sidebar */}
          {permission === "comment" && (
            <div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Comments</h3>

                {/* New comment */}
                <div className="mb-4 space-y-2">
                  {!authorName && (
                    <input
                      type="text"
                      placeholder="Your name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  )}
                  <textarea
                    placeholder={`Comment on Step ${activeStep}...`}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm resize-none focus:border-blue-400 focus:outline-none"
                  />
                  <button
                    onClick={handleComment}
                    disabled={submitting || !commentBody.trim() || !authorName.trim()}
                    className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Posting..." : "Post Comment"}
                  </button>
                </div>

                {/* Comment list */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {comments.filter((c) => c.step === activeStep || c.step === null).length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">No comments on this step.</p>
                  ) : (
                    comments
                      .filter((c) => c.step === activeStep || c.step === null)
                      .map((comment) => (
                        <div key={comment.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                                {comment.author_name[0]?.toUpperCase()}
                              </span>
                              <span className="text-xs font-medium text-gray-700">{comment.author_name}</span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{comment.body}</p>
                          {comment.resolved && (
                            <span className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">Resolved</span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
