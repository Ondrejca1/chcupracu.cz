import Link from "next/link";
import { BarChart3, BookOpen, BriefcaseBusiness, Building2, CircleDollarSign, Home, Inbox, LogOut, Megaphone, Menu, Package, Plus } from "lucide-react";
import { adminLogout } from "@/app/actions";
import { AdminNavLink } from "@/components/AdminNavLink";

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
          <AdminNavLink href="/admin/dashboard">
            <BarChart3 size={18} /> Dashboard
          </AdminNavLink>
          <AdminNavLink href="/admin/jobs">
            <BriefcaseBusiness size={18} /> Inzeráty
          </AdminNavLink>
          <AdminNavLink exact href="/admin/jobs/new">
            <Plus size={18} /> Přidat inzerát
          </AdminNavLink>
          <AdminNavLink href="/admin/applications">
            <Inbox size={18} /> Reakce
          </AdminNavLink>
          <AdminNavLink href="/admin/ads">
            <Megaphone size={18} /> Reklamy
          </AdminNavLink>
          <AdminNavLink href="/admin/jalovec">
            <BookOpen size={18} /> Jalovec
          </AdminNavLink>
          <AdminNavLink href="/admin/finance">
            <CircleDollarSign size={18} /> Finance
          </AdminNavLink>
          <AdminNavLink href="/admin/packages">
            <Package size={18} /> Balíčky
          </AdminNavLink>
          <AdminNavLink href="/admin/dictionaries">
            <Building2 size={18} /> Města a číselníky
          </AdminNavLink>
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
