"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { adminLogin } from "@/app/actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form action={action} className="cards">
      {state?.message && <p>{state.message}</p>}
      <input className="field" name="email" placeholder="E-mail nebo uživatelské jméno" required />
      <label className="password-field">
        <input className="field" name="password" placeholder="Heslo" required type={showPassword ? "text" : "password"} />
        <button aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"} type="button" onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Přihlašuji..." : "Přihlásit"}
      </button>
      <Link className="admin-login-link" href="/admin/forgot-password">Zapomenuté heslo</Link>
    </form>
  );
}
