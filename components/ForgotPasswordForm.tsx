"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <form action={action} className="cards">
      {state?.message && <p>{state.message}</p>}
      <input className="field" name="email" placeholder="E-mail redakčního účtu" required type="email" />
      <button className="button" disabled={pending} type="submit">
        {pending ? "Odesílám..." : "Poslat odkaz"}
      </button>
      <Link className="admin-login-link" href="/admin">Zpět na přihlášení</Link>
    </form>
  );
}
