import Link from "next/link";
import { Menu } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="bar">
        <Link className="logo" href="/">
          chcupracu.cz
        </Link>
        <input className="site-menu-toggle" id="site-menu-toggle" type="checkbox" />
        <label className="site-menu-button" htmlFor="site-menu-toggle">
          <Menu size={22} />
          <span>Menu</span>
        </label>
        <nav className="nav">
          <Link href="/">Domů</Link>
          <Link href="/jobs">Hledat práci</Link>
          <Link href="/klient/prihlaseni">Zadat inzerát</Link>
          <Link href="/klient">Klientská sekce</Link>
          <Link href="/admin">Redakce</Link>
        </nav>
      </div>
    </header>
  );
}
