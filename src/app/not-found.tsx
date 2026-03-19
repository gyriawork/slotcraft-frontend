import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#0f0f12", color: "#e4e4e7" }}
    >
      <p className="text-6xl font-bold" style={{ color: "#7c6bf5" }}>
        404
      </p>
      <p className="mt-3 text-lg" style={{ color: "#a1a1aa" }}>
        This page could not be found.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: "#7c6bf5" }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
