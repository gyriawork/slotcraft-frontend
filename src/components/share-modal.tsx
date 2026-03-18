"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ShareLink {
  id: string;
  token: string;
  permission: string;
  created_at: string;
  expires_at: string | null;
}

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

export function ShareModal({ projectId, onClose }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [permission, setPermission] = useState<"view" | "comment">("view");
  const [expiryDays, setExpiryDays] = useState<number | undefined>(7);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await api.share.list(projectId);
      setLinks(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.share.create(projectId, {
        permission,
        expires_in_days: expiryDays,
      });
      fetchLinks();
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    try {
      await api.share.revoke(projectId, token);
      setLinks((prev) => prev.filter((l) => l.token !== token));
    } catch {
      /* ignore */
    }
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Share Project</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Create new link */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Create Share Link</h4>
            <div className="flex flex-wrap gap-3">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "view" | "comment")}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="view">View only</option>
                <option value="comment">View + Comment</option>
              </select>
              <select
                value={expiryDays ?? "none"}
                onChange={(e) => setExpiryDays(e.target.value === "none" ? undefined : Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="7">Expires in 7 days</option>
                <option value="30">Expires in 30 days</option>
                <option value="none">No expiry</option>
              </select>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Link"}
              </button>
            </div>
          </div>

          {/* Existing links */}
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Links</h4>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : links.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No share links yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        link.permission === "comment"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {link.permission}
                      </span>
                      <span className="text-xs text-gray-400">
                        {link.expires_at
                          ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
                          : "No expiry"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500 font-mono">
                      {window.location.origin}/shared/{link.token}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => handleCopy(link.token)}
                      className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {copied === link.token ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => handleRevoke(link.token)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
