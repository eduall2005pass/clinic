export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 shadow-lg shadow-primary-900/30">
        <span className="relative block h-4 w-4">
          <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white" />
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white" />
        </span>
      </span>
      <span
        className={`text-lg font-extrabold tracking-tight ${
          light ? "text-white" : "text-dark-900"
        }`}
      >
        Medi<span className="text-primary-600">Spark</span>
      </span>
    </span>
  );
}