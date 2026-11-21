export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-3">
      <div className="cc-skeleton h-24" />
      <div className="cc-skeleton h-72" />
    </div>
  );
}
