"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { clientLogin, clientRegister } from "@/lib/actions/client-auth";

export function ClientLoginForm() {
  const [state, action, pending] = useActionState(clientLogin, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="client-auth-card">
      <div>
        <span className="admin-kicker">Přihlášení firmy</span>
        <h2>Klientská sekce</h2>
      </div>
      {state?.message && <p className="form-message">{state.message}</p>}
      <input className="field" name="email" placeholder="Firemní e-mail" required type="email" />
      <label className="password-field">
        <input className="field" name="password" placeholder="Heslo" required type={showPassword ? "text" : "password"} />
        <button aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"} onClick={() => setShowPassword((value) => !value)} type="button">
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Přihlašuji..." : "Přihlásit"}
      </button>
    </form>
  );
}

export function ClientRegisterForm() {
  const [state, action, pending] = useActionState(clientRegister, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="client-auth-card">
      <div>
        <span className="admin-kicker">Nový účet</span>
        <h2>Registrace firmy</h2>
      </div>
      {state?.message && <p className="form-message">{state.message}</p>}
      <div className="form-grid single">
        <input className="field" name="companyName" placeholder="Název firmy" required />
        <input className="field" name="ico" placeholder="IČO" />
        <input className="field" name="name" placeholder="Jméno kontaktní osoby" required />
        <input className="field" name="email" placeholder="Firemní e-mail" required type="email" />
        <input className="field" name="phone" placeholder="Telefon" />
        <label className="password-field">
          <input className="field" name="password" placeholder="Heslo alespoň 10 znaků" required type={showPassword ? "text" : "password"} />
          <button aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"} onClick={() => setShowPassword((value) => !value)} type="button">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>
        <input className="field" name="passwordConfirm" placeholder="Heslo znovu" required type={showPassword ? "text" : "password"} />
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Zakládám účet..." : "Zaregistrovat a pokračovat"}
      </button>
    </form>
  );
}
