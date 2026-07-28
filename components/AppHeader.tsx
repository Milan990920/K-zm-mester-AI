import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={30} height={30} className="shrink-0" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Számlamenedzsment
          </span>
        </Link>
      </div>
    </header>
  );
}
