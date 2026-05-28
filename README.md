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

Build script spouští `prisma generate`, `prisma migrate deploy`, seed referenčních dat a potom `next build`, takže po pushi stačí na Vercelu připojit Neon databázi a nastavit env.

## Produkční poznámky

- Nastavit silné `SESSION_SECRET` a heslo redakce.
- Použít PostgreSQL s pravidelnými zálohami.
- Přidat perzistentní úložiště příloh CV, pokud se povolí nahrávání souborů.
- Připojit e-mailovou službu pro upozornění redakci a uchazečům.
- Před ostrým spuštěním udělat penetrační kontrolu formulářů a adminu.
