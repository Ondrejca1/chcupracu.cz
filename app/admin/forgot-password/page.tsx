import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <div style={{ margin: "8vh auto", maxWidth: 420 }}>
      <div className="card">
        <h1>Obnova hesla</h1>
        <p>Zadejte e-mail redakčního účtu. Pokud existuje, pošleme odkaz pro nastavení nového hesla.</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
