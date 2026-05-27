import { AdminLoginForm } from "@/components/AdminLoginForm";

export default function AdminPage() {
  return (
    <div style={{ margin: "8vh auto", maxWidth: 420 }}>
      <div className="card">
        <h1>Přihlášení redakce</h1>
        <p>Administrace slouží pro zadávání inzerce za firmy, obnovu nabídek a ruční evidenci plateb.</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
