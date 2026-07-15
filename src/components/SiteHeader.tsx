"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Início", match: (p: string) => p === "/" },
  {
    href: "/inscrever",
    label: "Inscrição",
    match: (p: string) => p.startsWith("/inscrever"),
  },
  {
    href: "/atleta",
    label: "Meu ingresso",
    match: (p: string) =>
      p.startsWith("/atleta") ||
      p.startsWith("/comprar") ||
      p.startsWith("/pagar"),
  },
] as const;

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname() || "/";

  const tabClass = (active: boolean) => {
    if (solid) {
      return active
        ? "rounded-full bg-brand px-3.5 py-2 font-semibold text-white text-xs sm:text-sm"
        : "rounded-full border border-border px-3.5 py-2 font-medium text-muted hover:text-foreground hover:bg-slate-100 transition text-xs sm:text-sm";
    }
    return active
      ? "rounded-full bg-brand px-3.5 py-2 font-semibold text-white shadow-lg shadow-orange-900/30 text-xs sm:text-sm"
      : "rounded-full border border-white/25 bg-white/10 px-3.5 py-2 font-medium text-white/90 hover:bg-white/20 transition text-xs sm:text-sm";
  };

  return (
    <header
      className={
        solid
          ? "border-b border-border bg-background/95 backdrop-blur sticky z-30"
          : "absolute left-0 right-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-md"
      }
      style={{ top: "var(--demo-banner-h, 0px)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 sm:px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight shrink-0"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            IC
          </span>
          <span
            className={
              solid
                ? "text-foreground hidden md:inline"
                : "text-white hidden md:inline"
            }
          >
            Ingresso Corrida
          </span>
        </Link>

        <nav
          className="flex flex-1 items-center justify-end sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto"
          aria-label="Menu principal"
        >
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={tabClass(active)}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/admin"
          className={
            solid
              ? "hidden lg:inline-flex shrink-0 rounded-full border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-slate-100 transition"
              : "hidden lg:inline-flex shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/20 transition"
          }
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
