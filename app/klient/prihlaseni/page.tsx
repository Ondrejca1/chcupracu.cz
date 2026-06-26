import { redirect } from "next/navigation";
import { ClientLoginForm, ClientRegisterForm } from "@/components/ClientAuthForms";
import { SiteHeader } from "@/components/SiteHeader";
import { getOptionalClient } from "@/lib/client-auth";

export default async function ClientLoginPage() {
  const client = await getOptionalClient();
  if (client) redirect("/klient");

  return (
    <>
      <SiteHeader />
      <main className="client-auth-page">
        <section className="client-auth-intro">
          <span className="admin-kicker">Pro zaměstnavatele</span>
          <h1>Zadat inzerát a sledovat jeho průběh</h1>
          <p>Po přihlášení uvidíte rozpracované, schvalované i aktivní inzeráty, finance, výkon a historii komunikace s redakcí.</p>
        </section>
        <section className="client-auth-grid">
          <ClientLoginForm />
          <ClientRegisterForm />
        </section>
      </main>
    </>
  );
}
