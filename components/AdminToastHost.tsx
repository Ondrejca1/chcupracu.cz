"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

const notices: Record<string, string> = {
  created: "Uloženo.",
  "created-current": "Vydání bylo uloženo a nastaveno jako aktuální.",
  current: "Aktuální položka byla změněna.",
  saved: "Změny byly uloženy.",
  status: "Stav byl změněn.",
  forwarded: "Reakce byla předána firmě.",
  password: "Heslo bylo změněno.",
  "change-password": "Než budete pokračovat, nastavte nové heslo."
};

const errors: Record<string, string> = {
  create: "Uložení se nepodařilo.",
  current: "Nastavení aktuální položky se nepodařilo.",
  invalid: "Zkontrolujte prosím hodnoty ve formuláři.",
  date: "Zkontrolujte prosím termín.",
  "slot-full": "Vybraný reklamní slot je v daném termínu obsazený.",
  "no-company-email": "U firmy nebo inzerátu chybí kontaktní e-mail.",
  forbidden: "Na tuto sekci nemáte oprávnění.",
  password: "Heslo musí mít alespoň 10 znaků a shodovat se v obou polích.",
  "current-password": "Současné heslo nesouhlasí.",
  "user-exists": "Uživatel se stejným e-mailem nebo uživatelským jménem už existuje.",
  "self-disable": "Vlastní účet si nemůžete pozastavit ani archivovat."
};

export function AdminToastHost() {
  const params = useSearchParams();
  const toast = useMemo(() => {
    const notice = params.get("notice");
    const error = params.get("error");
    if (error) return { type: "error", message: errors[error] ?? "Akce se nepodařila." };
    if (notice) return { type: "success", message: notices[notice] ?? "Hotovo." };
    return null;
  }, [params]);

  if (!toast) return null;
  return <div className={`admin-toast ${toast.type}`}>{toast.message}</div>;
}
