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
# Pro lokální PostgreSQL upravte DATABASE_URL např. na:
# postgresql://postgres:postgres@localhost:5432/chcupracu
npm run db:migrate
npm run db:seed
npm run dev
```

> V tomto prostředí není dostupný `npm`, takže zdrojové soubory jsou připravené, ale závislosti je potřeba doinstalovat v běžném Node prostředí.

## Deploy na Vercel + Neon

Vercel musí mít nastavené proměnné prostředí:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/chcupracu?sslmode=require"
SESSION_SECRET="nahodne-dlouhe-tajemstvi-minimalne-32-znaku"
ADMIN_EMAIL="redakce@chcupracu.cz"
ADMIN_PASSWORD="silne-docasne-heslo"
NEXT_PUBLIC_SITE_URL="https://chcupracu.cz"
```

Build script na Vercelu spouští jen `prisma generate` a `next build`. Databázové migrace a seed se spouští samostatně, aby deploy nepadal na PostgreSQL advisory locku při souběžných buildech:

```bash
npm run db:setup
```

Pokud databáze už obsahuje produkční data, používejte jen migrace bez seedu:

```bash
npm run db:deploy
```

## Produkční poznámky

- Nastavit silné `SESSION_SECRET` a heslo redakce.
- Použít PostgreSQL s pravidelnými zálohami.
- Přidat perzistentní úložiště příloh CV, pokud se povolí nahrávání souborů.
- Připojit e-mailovou službu pro upozornění redakci a uchazečům.
- Před ostrým spuštěním udělat penetrační kontrolu formulářů a adminu.

## Design podklady

Zadání pro UI/UX design je v [`docs/ui-ux-zadani-pro-design.md`](docs/ui-ux-zadani-pro-design.md). Shrnuje existující strukturu, obrazovky, komponenty, otevřená UX rozhodnutí a checklist výstupů pro předání z Figmy do vývoje.
