export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  );
}
