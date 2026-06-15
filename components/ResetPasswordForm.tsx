"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { resetPassword } from "@/lib/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="cards">
      {state?.message && <p>{state.message}</p>}
      <input name="token" type="hidden" value={token} />
      <label className="password-field">
        <input className="field" name="password" placeholder="Nové heslo" required type={showPassword ? "text" : "password"} />
        <button aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"} onClick={() => setShowPassword((value) => !value)} type="button">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
      <input className="field" name="passwordConfirm" placeholder="Nové heslo znovu" required type={showPassword ? "text" : "password"} />
      <button className="button" disabled={pending || !token} type="submit">
        {pending ? "Ukládám..." : "Změnit heslo"}
      </button>
      <Link className="admin-login-link" href="/admin">Zpět na přihlášení</Link>
    </form>
  );
}
