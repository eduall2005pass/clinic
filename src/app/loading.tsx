export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-sky-600" />
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    </div>
  );
}
