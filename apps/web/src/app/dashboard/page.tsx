export default function DashboardHomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 p-8 text-center animate-in fade-in zoom-in duration-500">
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">Dashboard Overview</h2>
      <p className="max-w-md text-sm text-neutral-400">
        Welcome to the AI Support Platform dashboard. This is the foundation for Phase 1.
        Select an option from the sidebar to navigate to the respective modules.
      </p>
    </div>
  );
}
