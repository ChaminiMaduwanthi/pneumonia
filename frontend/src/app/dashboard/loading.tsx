export default function DashboardLoading() {
  return (
    <div className="container-wrap py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
