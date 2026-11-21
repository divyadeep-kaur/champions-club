export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-3">
      <div className="h-24 animate-pulse bg-[#ece5d6]" />
      <div className="h-72 animate-pulse bg-[#ece5d6]" />
    </div>
  );
}
