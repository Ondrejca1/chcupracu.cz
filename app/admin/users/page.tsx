import { AdminRole, AdminUserStatus, ClientUserStatus } from "@prisma/client";
import { KeyRound, Shield, UserPlus, Users } from "lucide-react";
import { archiveAdminUser, createAdminUser, setAdminUserPassword, updateAdminUser } from "@/lib/actions/users";
import { AdminShell } from "@/components/AdminShell";
import { adminRoleLabels, adminUserStatusLabels, requirePermission } from "@/lib/auth";
import { dateTimeCs } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const currentAdmin = await requirePermission("users:manage");
  const [users, clientUsers] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.clientUser.findMany({
      include: { company: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100
    })
  ]);
  const roleOptions = Object.values(AdminRole);
  const statusOptions = Object.values(AdminUserStatus);
  const activeCount = users.filter((user) => user.status === AdminUserStatus.ACTIVE).length;
  const lockedCount = users.filter((user) => user.lockedUntil && user.lockedUntil > new Date()).length;
  const activeClientCount = clientUsers.filter((user) => user.status === ClientUserStatus.ACTIVE).length;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Přístupy redakce</span>
          <h1>Uživatelé</h1>
          <p>Přidávání redaktorů, role, stav účtu, vynucení změny hesla a reset přístupu.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><Users size={22} /><span>Účty celkem</span><strong>{users.length}</strong><small>včetně pozastavených</small></article>
        <article className="admin-stat"><Shield size={22} /><span>Aktivní</span><strong>{activeCount}</strong><small>mohou se přihlásit</small></article>
        <article className="admin-stat"><KeyRound size={22} /><span>Uzamčené</span><strong>{lockedCount}</strong><small>po chybných pokusech</small></article>
        <article className="admin-stat"><Users size={22} /><span>Klienti</span><strong>{activeClientCount}</strong><small>aktivní firemní účty</small></article>
        <article className="admin-stat"><UserPlus size={22} /><span>Role</span><strong>{roleOptions.length}</strong><small>ADMIN, editor, obchod, náhled</small></article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Přidat uživatele</h2>
            <p>Nový účet může mít dočasné heslo a vynucenou změnu po prvním přihlášení.</p>
          </div>
        </div>
        <form action={createAdminUser} className="admin-form wide">
          <label className="field-group"><span>Jméno</span><input className="field" name="firstName" required /></label>
          <label className="field-group"><span>Příjmení</span><input className="field" name="lastName" required /></label>
          <label className="field-group"><span>Uživatelské jméno</span><input className="field" name="username" required /></label>
          <label className="field-group"><span>E-mail</span><input className="field" name="email" required type="email" /></label>
          <label className="field-group">
            <span>Role</span>
            <select className="select" name="role" defaultValue={AdminRole.EDITOR}>
              {roleOptions.map((role) => <option key={role} value={role}>{adminRoleLabels[role]}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>Stav</span>
            <select className="select" name="status" defaultValue={AdminUserStatus.PENDING}>
              {statusOptions.map((status) => <option key={status} value={status}>{adminUserStatusLabels[status]}</option>)}
            </select>
          </label>
          <label className="field-group"><span>Dočasné heslo</span><input className="field" name="password" required type="password" /></label>
          <label className="admin-check"><input defaultChecked name="forcePasswordChange" type="checkbox" /> Vynutit změnu hesla</label>
          <button className="button full" type="submit">Vytvořit účet</button>
        </form>
      </section>

      <section className="admin-user-grid">
        {users.map((user) => (
          <article className="admin-user-item" key={user.id}>
            <div className="admin-card-head">
              <div>
                <h2>{user.name}</h2>
                <p>{user.email} · {user.username ?? "bez uživatelského jména"}</p>
              </div>
              <span className={`status-pill ${user.status.toLowerCase()}`}>{adminUserStatusLabels[user.status]}</span>
            </div>

            <form action={updateAdminUser} className="admin-form">
              <input name="id" type="hidden" value={user.id} />
              <label className="field-group"><span>Jméno</span><input className="field" name="firstName" required defaultValue={user.firstName ?? user.name} /></label>
              <label className="field-group"><span>Příjmení</span><input className="field" name="lastName" required defaultValue={user.lastName ?? ""} /></label>
              <label className="field-group"><span>Uživatelské jméno</span><input className="field" name="username" required defaultValue={user.username ?? user.email.split("@")[0]} /></label>
              <label className="field-group"><span>E-mail</span><input className="field" name="email" required type="email" defaultValue={user.email} /></label>
              <label className="field-group">
                <span>Role</span>
                <select className="select" name="role" defaultValue={user.role}>
                  {roleOptions.map((role) => <option key={role} value={role}>{adminRoleLabels[role]}</option>)}
                </select>
              </label>
              <label className="field-group">
                <span>Stav</span>
                <select className="select" name="status" defaultValue={user.status}>
                  {statusOptions.map((status) => <option key={status} value={status}>{adminUserStatusLabels[status]}</option>)}
                </select>
              </label>
              <button className="button full" type="submit">Uložit údaje</button>
            </form>

            <div className="admin-profile-list compact">
              <div><span>Role</span><strong>{adminRoleLabels[user.role]}</strong></div>
              <div><span>Poslední přihlášení</span><strong>{user.lastLoginAt ? dateTimeCs(user.lastLoginAt) : "-"}</strong></div>
              <div><span>Chybné pokusy</span><strong>{user.failedLoginCount}</strong></div>
              <div><span>Změna hesla</span><strong>{user.forcePasswordChange ? "vyžadována" : "ne"}</strong></div>
            </div>

            <form action={setAdminUserPassword} className="admin-form">
              <input name="id" type="hidden" value={user.id} />
              <label className="field-group"><span>Nové heslo</span><input className="field" name="password" required type="password" /></label>
              <label className="admin-check"><input name="forcePasswordChange" type="checkbox" /> Vynutit změnu po přihlášení</label>
              <button className="button ghost full" type="submit">Nastavit heslo</button>
            </form>

            <form action={archiveAdminUser} className="inline-form">
              <input name="id" type="hidden" value={user.id} />
              <input name="status" type="hidden" value={user.status} />
              <button className="button secondary" disabled={user.id === currentAdmin.id} type="submit">
                {user.status === AdminUserStatus.ACTIVE ? "Pozastavit účet" : "Aktivovat účet"}
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Klientské účty firem</h2>
            <p>Přehled firem, které se registrovaly do samoobslužné klientské sekce.</p>
          </div>
        </div>
        <table className="table admin-table">
          <thead>
            <tr><th>Firma</th><th>Kontakt</th><th>Stav</th><th>Poslední přihlášení</th></tr>
          </thead>
          <tbody>
            {clientUsers.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.company.name}</strong><div className="meta">{client.company.ico ?? "IČO neuvedeno"}</div></td>
                <td>{client.name}<div className="meta">{client.email} · {client.phone ?? "bez telefonu"}</div></td>
                <td><span className={`status-pill status-${client.status.toLowerCase()}`}>{client.status === ClientUserStatus.ACTIVE ? "Aktivní" : client.status === ClientUserStatus.SUSPENDED ? "Pozastavený" : "Archiv"}</span></td>
                <td>{client.lastLoginAt ? dateTimeCs(client.lastLoginAt) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientUsers.length === 0 && <p className="admin-empty">Zatím není registrovaný žádný klientský účet.</p>}
      </section>
    </AdminShell>
  );
}
