import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function AdminResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  return (
    <div style={{ margin: "8vh auto", maxWidth: 420 }}>
      <div className="card">
        <h1>Nové heslo</h1>
        <p>Heslo musí mít alespoň 10 znaků. Po změně se můžete přihlásit do administrace.</p>
        <ResetPasswordForm token={params.token ?? ""} />
      </div>
    </div>
  );
}
