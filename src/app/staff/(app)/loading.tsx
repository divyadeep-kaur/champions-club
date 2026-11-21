export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid content-start gap-4">
      <div className="cc-skeleton h-10 w-56" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cc-skeleton h-24" />
        ))}
      </div>
      <div className="cc-skeleton h-72" />
    </div>
  );
}
