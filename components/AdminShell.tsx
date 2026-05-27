import Link from "next/link";
import { adminLogout } from "@/app/actions";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <h2>Redakce</h2>
        <Link href="/admin/jobs">Inzeráty</Link>
        <Link href="/admin/jobs/new">Přidat inzerát</Link>
        <Link href="/admin/settings">Číselníky a finance</Link>
        <Link href="/">Veřejný web</Link>
        <form action={adminLogout}>
          <button type="submit">Odhlásit</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
