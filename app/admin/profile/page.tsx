import { KeyRound, ShieldCheck, UserCircle } from "lucide-react";
import { changeOwnPassword } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { adminRoleLabels, adminUserStatusLabels, requireAdmin } from "@/lib/auth";
import { dateTimeCs } from "@/lib/format";

export default async function AdminProfilePage() {
  const admin = await requireAdmin();

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Redakční účet</span>
          <h1>Můj profil</h1>
          <p>Kontrola přístupů, základních údajů a změna vlastního hesla.</p>
        </div>
      </div>

      <section className="admin-dashboard-grid">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Účet</h2>
              <p>Aktuální přihlášený uživatel a jeho oprávnění.</p>
            </div>
            <UserCircle size={24} />
          </div>
          <div className="admin-profile-list">
            <div><span>Jméno</span><strong>{admin.name}</strong></div>
            <div><span>E-mail</span><strong>{admin.email}</strong></div>
            <div><span>Uživatelské jméno</span><strong>{admin.username ?? "-"}</strong></div>
            <div><span>Role</span><strong>{adminRoleLabels[admin.role]}</strong></div>
            <div><span>Stav</span><strong>{adminUserStatusLabels[admin.status]}</strong></div>
            <div><span>Poslední přihlášení</span><strong>{admin.lastLoginAt ? dateTimeCs(admin.lastLoginAt) : "-"}</strong></div>
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Změna hesla</h2>
              <p>{admin.forcePasswordChange ? "Před další prací nastavte nové heslo." : "Použijte silné heslo s alespoň 10 znaky."}</p>
            </div>
            {admin.forcePasswordChange ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
          </div>
          <form action={changeOwnPassword} className="admin-form single">
            {!admin.forcePasswordChange && (
              <label className="field-group">
                <span>Současné heslo</span>
                <input className="field" name="currentPassword" required type="password" />
              </label>
            )}
            <label className="field-group">
              <span>Nové heslo</span>
              <input className="field" name="password" required type="password" />
            </label>
            <label className="field-group">
              <span>Nové heslo znovu</span>
              <input className="field" name="passwordConfirm" required type="password" />
            </label>
            <button className="button" type="submit">Změnit heslo</button>
          </form>
        </article>
      </section>
    </AdminShell>
  );
}
