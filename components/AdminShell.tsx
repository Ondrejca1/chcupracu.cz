import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Home, LogOut, Megaphone, Plus, Settings } from "lucide-react";
import { adminLogout } from "@/app/actions";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
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
            <Megaphone size={18} /> Jalovec a reklamy
          </Link>
          <Link href="/admin/settings">
            <Settings size={18} /> Finance a číselníky
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
