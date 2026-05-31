import Link from "next/link";
import { BarChart3, BookOpen, BriefcaseBusiness, Building2, CircleDollarSign, Home, LogOut, Megaphone, Menu, Package, Plus } from "lucide-react";
import { adminLogout } from "@/app/actions";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <input className="admin-menu-toggle" id="admin-menu-toggle" type="checkbox" />
      <header className="admin-mobile-bar">
        <label htmlFor="admin-menu-toggle">
          <Menu size={22} />
          <span>Menu</span>
        </label>
        <strong>chcupracu.cz</strong>
      </header>
      <aside className="admin-nav">
        <div className="admin-brand">
          <span>ch</span>
          <div>
            <strong>Redakce</strong>
            <small>chcupracu.cz</small>
          </div>
        </div>
        <nav className="admin-nav-links">
          <Link href="/admin/dashboard">
            <BarChart3 size={18} /> Dashboard
          </Link>
          <Link href="/admin/jobs">
            <BriefcaseBusiness size={18} /> Inzeráty
          </Link>
          <Link href="/admin/jobs/new">
            <Plus size={18} /> Přidat inzerát
          </Link>
          <Link href="/admin/ads">
            <Megaphone size={18} /> Reklamy
          </Link>
          <Link href="/admin/jalovec">
            <BookOpen size={18} /> Jalovec
          </Link>
          <Link href="/admin/finance">
            <CircleDollarSign size={18} /> Finance
          </Link>
          <Link href="/admin/packages">
            <Package size={18} /> Balíčky
          </Link>
          <Link href="/admin/dictionaries">
            <Building2 size={18} /> Města a číselníky
          </Link>
          <Link href="/">
            <Home size={18} /> Veřejný web
          </Link>
        </nav>
        <form action={adminLogout}>
          <button type="submit">
            <LogOut size={18} /> Odhlásit
          </button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
