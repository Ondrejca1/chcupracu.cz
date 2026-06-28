import Link from "next/link";
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  CircleDollarSign,
  HeartPulse,
  Home,
  Inbox,
  LogOut,
  MapPinned,
  Megaphone,
  Menu,
  Package,
  Plus,
  Send,
  UserCircle,
  Users
} from "lucide-react";
import { adminLogout } from "@/lib/actions/auth";
import { AdminNavLink } from "@/components/AdminNavLink";
import { AdminToastHost } from "@/components/AdminToastHost";
import { getAdminNotificationSummary } from "@/lib/admin-notifications";
import { adminRoleLabels, hasPermission, requireAdmin, type AdminPermission } from "@/lib/auth";
import { productReleaseName, productVersion } from "@/lib/release";

const navItems: Array<{ href: string; label: string; icon: typeof BarChart3; exact?: boolean; permission?: AdminPermission; badgeKey?: "notifications" | "clientReviewJobs" | "newApplications" | "unpaidInvoices" }> = [
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3, permission: "dashboard:view" },
  { href: "/admin/notifications", label: "Upozornění", icon: Bell, permission: "dashboard:view", badgeKey: "notifications" },
  { href: "/admin/tasks", label: "Úkoly redakce", icon: CheckSquare, permission: "tasks:view" },
  { href: "/admin/companies", label: "Firmy", icon: Building2, permission: "companies:write" },
  { href: "/admin/jobs", label: "Inzeráty", icon: BriefcaseBusiness, permission: "jobs:write" },
  { href: "/admin/jobs?view=client-review", label: "Ke schválení", icon: Send, exact: true, permission: "jobs:write", badgeKey: "clientReviewJobs" },
  { href: "/admin/jobs/new", label: "Přidat inzerát", icon: Plus, exact: true, permission: "jobs:write" },
  { href: "/admin/applications", label: "Reakce", icon: Inbox, permission: "applications:write", badgeKey: "newApplications" },
  { href: "/admin/ads", label: "Reklamy", icon: Megaphone, permission: "ads:write" },
  { href: "/admin/jalovec", label: "Jalovec", icon: BookOpen, permission: "jalovec:write" },
  { href: "/admin/finance", label: "Finance", icon: CircleDollarSign, permission: "finance:write", badgeKey: "unpaidInvoices" },
  { href: "/admin/packages", label: "Balíčky", icon: Package, permission: "packages:write" },
  { href: "/admin/dictionaries", label: "Města a číselníky", icon: MapPinned, permission: "dictionaries:write" },
  { href: "/admin/users", label: "Uživatelé", icon: Users, permission: "users:manage" },
  { href: "/admin/health", label: "Healthcheck", icon: HeartPulse, permission: "health:view" },
  { href: "/admin/profile", label: "Můj profil", icon: UserCircle }
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const notifications = await getAdminNotificationSummary();
  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(admin, item.permission));
  const badgeFor = (key?: "notifications" | "clientReviewJobs" | "newApplications" | "unpaidInvoices") => {
    if (!key) return 0;
    if (key === "notifications") return notifications.total;
    return notifications.counts[key];
  };

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
            const badge = badgeFor(item.badgeKey);
            return (
              <AdminNavLink exact={item.exact} href={item.href} key={item.href}>
                <Icon size={18} />
                <span className="admin-nav-label">{item.label}</span>
                {badge > 0 && <span className="admin-nav-badge">{badge > 99 ? "99+" : badge}</span>}
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
        <div className="admin-release-card">
          <strong>v{productVersion}</strong>
          <span>{productReleaseName}</span>
        </div>
      </aside>
      <main className="admin-main">
        <AdminToastHost />
        {children}
      </main>
    </div>
  );
}
