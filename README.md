# chcupracu.cz

MVP pracovní platformy pro Vsetín a okolí. Veřejná část umožňuje hledání nabídek podle lokality, oboru, vzdělání, vhodnosti, úvazku a mzdy. Redakční administrace spravuje inzeráty za firmy, ruční platby, balíčky, obnovu inzerátů a číselníky.

## Doporučený stack

- Next.js App Router
- PostgreSQL
- Prisma ORM
- Server actions pro formuláře
- Redakční přihlášení přes zabezpečenou session cookie

## Lokální spuštění

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

> V tomto prostředí není dostupný `npm`, takže zdrojové soubory jsou připravené, ale závislosti je potřeba doinstalovat v běžném Node prostředí.

## Produkční poznámky

- Nastavit silné `SESSION_SECRET` a heslo redakce.
- Použít PostgreSQL s pravidelnými zálohami.
- Přidat perzistentní úložiště příloh CV, pokud se povolí nahrávání souborů.
- Připojit e-mailovou službu pro upozornění redakci a uchazečům.
- Před ostrým spuštěním udělat penetrační kontrolu formulářů a adminu.
