import { KeyRound, Save } from "lucide-react";
import { ClientShell } from "@/components/ClientShell";
import { changeClientPassword, updateClientAccount } from "@/lib/actions/client-auth";
import { requireClient } from "@/lib/client-auth";

export default async function ClientAccountPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const client = await requireClient();
  const params = await searchParams;

  return (
    <ClientShell>
      <div className="client-page-head">
        <div>
          <span className="admin-kicker">Účet</span>
          <h1>Správa účtu a firmy</h1>
          <p>Kontaktní údaje se používají pro komunikaci s redakcí a předvyplnění nových inzerátů.</p>
        </div>
      </div>

      {params.notice === "account" && <p className="client-notice">Údaje jsou uložené.</p>}
      {params.notice === "password" && <p className="client-notice">Heslo bylo změněno.</p>}
      {params.error && <p className="client-alert">Změnu se nepodařilo uložit. Zkontrolujte prosím vyplněná pole.</p>}

      <section className="client-detail-grid">
        <form action={updateClientAccount} className="client-card client-card-wide">
          <div className="admin-card-head">
            <div>
              <h2>Firemní a kontaktní údaje</h2>
              <p>Tyto údaje vidí redakce u vašich inzerátů.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field-group">
              <span>Jméno kontaktní osoby</span>
              <input className="field" name="name" required defaultValue={client.name} />
            </label>
            <label className="field-group">
              <span>Telefon kontaktní osoby</span>
              <input className="field" name="phone" defaultValue={client.phone ?? ""} />
            </label>
            <label className="field-group">
              <span>Název firmy</span>
              <input className="field" name="companyName" required defaultValue={client.company.name} />
            </label>
            <label className="field-group">
              <span>IČO</span>
              <input className="field" name="ico" defaultValue={client.company.ico ?? ""} />
            </label>
            <label className="field-group">
              <span>Firemní e-mail</span>
              <input className="field" name="companyEmail" type="email" defaultValue={client.company.email ?? client.email} />
            </label>
            <label className="field-group">
              <span>Firemní telefon</span>
              <input className="field" name="companyPhone" defaultValue={client.company.phone ?? ""} />
            </label>
            <label className="field-group full">
              <span>Adresa</span>
              <input className="field" name="address" defaultValue={client.company.address ?? ""} />
            </label>
            <label className="field-group full">
              <span>Poznámka o firmě</span>
              <textarea className="textarea" name="note" defaultValue={client.company.note ?? ""} />
            </label>
          </div>
          <button className="button" type="submit"><Save size={17} /> Uložit údaje</button>
        </form>

        <form action={changeClientPassword} className="client-card">
          <div className="admin-card-head">
            <div>
              <h2>Změna hesla</h2>
              <p>Nové heslo musí mít alespoň 10 znaků.</p>
            </div>
            <KeyRound size={22} />
          </div>
          <div className="form-grid single">
            <input className="field" name="currentPassword" placeholder="Současné heslo" required type="password" />
            <input className="field" name="password" placeholder="Nové heslo" required type="password" />
            <input className="field" name="passwordConfirm" placeholder="Nové heslo znovu" required type="password" />
          </div>
          <button className="button secondary" type="submit">Změnit heslo</button>
        </form>
      </section>
    </ClientShell>
  );
}
