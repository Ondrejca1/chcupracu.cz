"use client";

import { useActionState } from "react";
import { createApplication } from "@/lib/actions/applications";

export function ApplicationForm({ jobId, slug }: { jobId: string; slug: string }) {
  const [state, action, pending] = useActionState(createApplication, null);

  return (
    <form action={action} className="card">
      <h2>Odpovědět na nabídku</h2>
      {state?.message && <p className={state.ok ? "notice" : undefined}>{state.message}</p>}
      <input name="jobId" type="hidden" value={jobId} />
      <input name="slug" type="hidden" value={slug} />
      <input aria-hidden="true" autoComplete="off" className="honeypot-field" name="website" tabIndex={-1} type="text" />
      <input className="field" name="name" placeholder="Jméno a příjmení" required />
      <input className="field" name="email" placeholder="E-mail" required type="email" />
      <input className="field" name="phone" placeholder="Telefon" />
      <textarea className="textarea" name="message" placeholder="Krátká zpráva pro zaměstnavatele" required />
      <label>
        <input name="consentGdpr" required type="checkbox" /> Souhlasím se zpracováním osobních údajů pro předání reakce zaměstnavateli.
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Odesílám..." : "Odeslat odpověď"}
      </button>
    </form>
  );
}
