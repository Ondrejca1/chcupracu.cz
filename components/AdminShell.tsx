import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  CircleDollarSign,
  HeartPulse,
  Home,
  Inbox,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Plus,
  UserCircle,
  Users
} from "lucide-react";
import { adminLogout } from "@/lib/actions/auth";
import { AdminNavLink } from "@/components/AdminNavLink";
import { AdminToastHost } from "@/components/AdminToastHost";
import { adminRoleLabels, hasPermission, requireAdmin, type AdminPermission } from "@/lib/auth";

const navItems: Array<{ href: string; label: string; icon: typeof BarChart3; exact?: boolean; permission?: AdminPermission }> = [
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3, permission: "dashboard:view" },
  { href: "/admin/tasks", label: "Úkoly redakce", icon: CheckSquare, permission: "tasks:view" },
  { href: "/admin/jobs", label: "Inzeráty", icon: BriefcaseBusiness, permission: "jobs:write" },
  { href: "/admin/jobs/new", label: "Přidat inzerát", icon: Plus, exact: true, permission: "jobs:write" },
  { href: "/admin/applications", label: "Reakce", icon: Inbox, permission: "applications:write" },
  { href: "/admin/ads", label: "Reklamy", icon: Megaphone, permission: "ads:write" },
  { href: "/admin/jalovec", label: "Jalovec", icon: BookOpen, permission: "jalovec:write" },
  { href: "/admin/finance", label: "Finance", icon: CircleDollarSign, permission: "finance:write" },
  { href: "/admin/packages", label: "Balíčky", icon: Package, permission: "packages:write" },
  { href: "/admin/dictionaries", label: "Města a číselníky", icon: Building2, permission: "dictionaries:write" },
  { href: "/admin/users", label: "Uživatelé", icon: Users, permission: "users:manage" },
  { href: "/admin/health", label: "Healthcheck", icon: HeartPulse, permission: "health:view" },
  { href: "/admin/profile", label: "Můj profil", icon: UserCircle }
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(admin, item.permission));

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
        <div className="admin-user-card">
          <strong>{admin.name}</strong>
          <span>{adminRoleLabels[admin.role]}</span>
        </div>
        <nav className="admin-nav-links">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <AdminNavLink exact={item.exact} href={item.href} key={item.href}>
                <Icon size={18} /> {item.label}
              </AdminNavLink>
            );
          })}
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
      <main className="admin-main">
        <AdminToastHost />
        {children}
      </main>
    </div>
  );
}
