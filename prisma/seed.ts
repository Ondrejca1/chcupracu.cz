import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  const cities = [
    "Vsetín",
    "Valašské Meziříčí",
    "Rožnov pod Radhoštěm",
    "Vizovice",
    "Zubří",
    "Jablůnka",
    "Pržno",
    "Ratiboř",
    "Liptál",
    "Lhota u Vsetína",
    "Ústí",
    "Janová",
    "Hovězí",
    "Huslenky",
    "Halenkov",
    "Nový Hrozenkov",
    "Karolinka",
    "Velké Karlovice",
    "Valašská Polanka",
    "Pozděchov",
    "Lužná",
    "Leskovec",
    "Valašská Bystřice",
    "Zašová",
    "Střítež nad Bečvou",
    "Vidče",
    "Vigantice",
    "Brumov-Bylnice"
  ];
  for (const [index, name] of cities.entries()) {
    await prisma.city.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), region: "Vsetínsko", isDefault: index === 0, sortOrder: index }
    });
  }

  for (const [index, name] of [
    "Administrativa, zákaznický servis",
    "Bankovnictví, finance a pojišťovnictví",
    "Doprava, logistika a zásobování",
    "Elektrotechnika a telekomunikace",
    "Energetika, životní prostředí, ekologie",
    "Gastronomie a pohostinství",
    "Informační systémy a technologie",
    "Lidské zdroje a personální management",
    "Management",
    "Marketing, reklama, média a PR",
    "Obchod, nákup a prodej zboží",
    "Ozbrojené síly a bezpečnost",
    "Polygrafie, tisk, grafika a vydavatelství",
    "Potravinářství a krmivářství",
    "Právní služby a soudnictví",
    "Průmyslová a chemická výroba",
    "Řemeslná výroba a manuální práce",
    "Služby, umění a kultura",
    "Státní správa a samospráva",
    "Stavebnictví a realitní služby",
    "Strojírenství a automobilový průmysl",
    "Těžba, hutnictví a slévárenství",
    "Ubytování a cestovní ruch",
    "Zdravotnictví a sociální péče",
    "Školství a vzdělávání",
    "Zemědělství, lesnictví a vodní hospodářství"
  ].entries()) {
    await prisma.category.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index }
    });
  }

  for (const [index, name] of ["Základní", "Středoškolské bez maturity", "Středoškolské s maturitou", "Vysokoškolské"].entries()) {
    await prisma.education.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index }
    });
  }

  for (const [index, name] of ["Plný úvazek", "Poloviční úvazek", "Částečný úvazek", "Brigáda"].entries()) {
    await prisma.employmentType.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index }
    });
  }

  for (const [index, name] of ["ZTP", "Absolvent", "Maturant", "Rodič na mateřské", "Senior"].entries()) {
    await prisma.suitability.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index }
    });
  }

  for (const item of [
    { name: "Start", durationDays: 14, priceCzk: 990, highlightColor: null, isTopPlacement: false, topDays: null },
    { name: "Standard", durationDays: 30, priceCzk: 1890, highlightColor: "#eef5fc", isTopPlacement: false, topDays: null },
    { name: "Top", durationDays: 45, priceCzk: 3490, highlightColor: "#fff7ed", isTopPlacement: true, topDays: 14 }
  ]) {
    await prisma.pricingPackage.upsert({
      where: { id: item.name.toLowerCase() },
      update: item,
      create: { id: item.name.toLowerCase(), ...item, description: "Ruční evidence objednávky přes redakci." }
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "redakce@chcupracu.cz";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-this-before-production";
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Redakce",
      passwordHash: await bcrypt.hash(adminPassword, 12)
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
