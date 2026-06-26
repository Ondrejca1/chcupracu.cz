import Link from "next/link";
import { BarChart3, BriefcaseBusiness, CircleDollarSign, Home, LogOut, Plus, Settings, UserRound } from "lucide-react";
import { clientLogout } from "@/lib/actions/client-auth";
import { requireClient } from "@/lib/client-auth";

const navItems = [
  { href: "/klient", label: "Přehled", icon: BarChart3 },
  { href: "/klient/inzeraty", label: "Inzeráty", icon: BriefcaseBusiness },
  { href: "/klient/inzeraty/novy", label: "Zadat inzerát", icon: Plus },
  { href: "/klient/finance", label: "Finance", icon: CircleDollarSign },
  { href: "/klient/ucet", label: "Účet", icon: Settings }
];

export async function ClientShell({ children }: { children: React.ReactNode }) {
  const client = await requireClient();

  return (
    <div className="client-shell">
      <aside className="client-sidebar">
        <Link className="client-brand" href="/klient">
          <span>ch</span>
          <div>
            <strong>Klientská sekce</strong>
            <small>chcupracu.cz</small>
          </div>
        </Link>
        <div className="client-user-card">
          <UserRound size={20} />
          <div>
            <strong>{client.company.name}</strong>
            <span>{client.name}</span>
          </div>
        </div>
        <nav className="client-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
          <Link href="/">
            <Home size={18} /> Veřejný web
          </Link>
        </nav>
        <form action={clientLogout}>
          <button className="client-logout" type="submit">
            <LogOut size={18} /> Odhlásit
          </button>
        </form>
      </aside>
      <main className="client-main">{children}</main>
    </div>
  );
}
