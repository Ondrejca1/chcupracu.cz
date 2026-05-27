"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="cards">
      {state?.message && <p>{state.message}</p>}
      <input className="field" name="email" placeholder="E-mail" required type="email" />
      <input className="field" name="password" placeholder="Heslo" required type="password" />
      <button className="button" disabled={pending} type="submit">
        {pending ? "Přihlašuji..." : "Přihlásit"}
      </button>
    </form>
  );
}
