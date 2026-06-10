import { Activity, CheckCircle2, Database, KeyRound, XCircle } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

export default async function AdminHealthPage() {
  await requirePermission("health:view");
  const checks: Check[] = [];
  let migrations: { migration_name: string; finished_at: Date | null }[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ label: "Databáze", ok: true, detail: "Připojení funguje." });
  } catch (error) {
    checks.push({ label: "Databáze", ok: false, detail: error instanceof Error ? error.message : "DB připojení selhalo." });
  }

  try {
    migrations = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 8
    `;
    checks.push({ label: "Migrace", ok: migrations.length > 0, detail: `${migrations.length} posledních migrací načteno.` });
  } catch (error) {
    checks.push({ label: "Migrace", ok: false, detail: error instanceof Error ? error.message : "Nelze přečíst tabulku migrací." });
  }

  const envChecks = [
    { key: "DATABASE_URL", required: true },
    { key: "SESSION_SECRET", required: true },
    { key: "ADMIN_NOTIFICATION_EMAIL", required: false },
    { key: "RESEND_API_KEY", required: false },
    { key: "MAIL_FROM", required: false },
    { key: "NEXT_PUBLIC_SITE_URL", required: false }
  ];
  for (const item of envChecks) {
    const isSet = Boolean(process.env[item.key]);
    checks.push({
      label: item.key,
      ok: item.required ? isSet : true,
      detail: isSet ? "Nastaveno." : item.required ? "Chybí povinná proměnná." : "Volitelně nenastaveno."
    });
  }

  let tableCounts = { jobs: 0, applications: 0, ads: 0, issues: 0 };
  try {
    const [jobs, applications, ads, issues] = await Promise.all([
      prisma.jobPost.count(),
      prisma.application.count(),
      prisma.adPlacement.count(),
      prisma.publicationIssue.count()
    ]);
    tableCounts = { jobs, applications, ads, issues };
    checks.push({ label: "Klíčové tabulky", ok: true, detail: "Inzeráty, reakce, reklamy a Jalovec jsou čitelné." });
  } catch (error) {
    checks.push({ label: "Klíčové tabulky", ok: false, detail: error instanceof Error ? error.message : "Kontrola tabulek selhala." });
  }

  const okCount = checks.filter((check) => check.ok).length;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Technická jistota</span>
          <h1>Healthcheck</h1>
          <p>Rychlá kontrola produkční připravenosti: databáze, migrace, env proměnné a klíčová data.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><Activity size={22} /><span>Stav</span><strong>{okCount}/{checks.length}</strong><small>úspěšných kontrol</small></article>
        <article className="admin-stat"><Database size={22} /><span>Inzeráty</span><strong>{tableCounts.jobs}</strong><small>celkem v DB</small></article>
        <article className="admin-stat"><Database size={22} /><span>Reakce</span><strong>{tableCounts.applications}</strong><small>celkem v DB</small></article>
        <article className="admin-stat"><Database size={22} /><span>Reklamy</span><strong>{tableCounts.ads}</strong><small>celkem v DB</small></article>
      </section>

      <section className="admin-card">
        <div className="health-grid">
          {checks.map((check) => (
            <article className={`health-check ${check.ok ? "ok" : "fail"}`} key={check.label}>
              {check.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <div>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Poslední migrace</h2>
            <p>Kontrola, že produkční DB zná aktuální schéma.</p>
          </div>
          <KeyRound size={22} />
        </div>
        <div className="admin-list compact">
          {migrations.map((migration) => (
            <div className="admin-list-row" key={migration.migration_name}>
              <div>
                <strong>{migration.migration_name}</strong>
                <span>{migration.finished_at ? migration.finished_at.toISOString() : "bez dokončení"}</span>
              </div>
            </div>
          ))}
          {migrations.length === 0 && <p className="admin-empty">Migrace se nepodařilo načíst.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
