import Link from "next/link";

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={
        solid
          ? "border-b border-border bg-background/95 backdrop-blur sticky z-30"
          : "absolute left-0 right-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-md"
      }
      style={
        solid
          ? { top: "var(--demo-banner-h, 0px)" }
          : { top: "var(--demo-banner-h, 0px)" }
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            IC
          </span>
          <span className={solid ? "text-foreground" : "text-white"}>
            Ingresso Corrida
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/atleta"
            className={
              solid
                ? "rounded-full border border-border px-3 py-2 font-medium text-muted hover:text-foreground hover:bg-slate-100 transition"
                : "rounded-full border border-white/25 bg-white/10 px-3 py-2 font-medium text-white/90 hover:bg-white/20 transition"
            }
          >
            Meu ingresso
          </Link>
          <Link
            href="/admin"
            className={
              solid
                ? "hidden sm:inline-flex rounded-full border border-border px-3 py-2 font-medium text-muted hover:text-foreground hover:bg-slate-100 transition"
                : "hidden sm:inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-2 font-medium text-white/90 hover:bg-white/20 transition"
            }
          >
            Admin
          </Link>
          <Link
            href="/inscrever"
            className="rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-brand-dark transition"
          >
            Comprar ingresso
          </Link>
        </nav>
      </div>
    </header>
  );
}
