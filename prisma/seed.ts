import { JobStatus, PrismaClient } from "@prisma/client";
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

  const [vsetin, roznov, karlovice, valmez, zubri, vizovice, brumov, halenkov] = await Promise.all([
    prisma.city.findUniqueOrThrow({ where: { slug: "vsetin" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "roznov-pod-radhostem" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "velke-karlovice" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "valasske-mezirici" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "zubri" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "vizovice" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "brumov-bylnice" } }),
    prisma.city.findUniqueOrThrow({ where: { slug: "halenkov" } })
  ]);
  const [administrativa, gastro, elektro, remesla, doprava, obchod, strojirenstvi, zdravotnictvi, cestovniRuch, stavebnictvi] = await Promise.all([
    prisma.category.findUniqueOrThrow({ where: { slug: "administrativa-zakaznicky-servis" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "gastronomie-a-pohostinstvi" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "elektrotechnika-a-telekomunikace" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "remeslna-vyroba-a-manualni-prace" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "doprava-logistika-a-zasobovani" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "obchod-nakup-a-prodej-zbozi" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "strojirenstvi-a-automobilovy-prumysl" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "zdravotnictvi-a-socialni-pece" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "ubytovani-a-cestovni-ruch" } }),
    prisma.category.findUniqueOrThrow({ where: { slug: "stavebnictvi-a-realitni-sluzby" } })
  ]);
  const [maturita, bezMaturity] = await Promise.all([
    prisma.education.findUniqueOrThrow({ where: { slug: "stredoskolske-s-maturitou" } }),
    prisma.education.findUniqueOrThrow({ where: { slug: "stredoskolske-bez-maturity" } })
  ]);
  const [fullTime, brigade, partTime, halfTime] = await Promise.all([
    prisma.employmentType.findUniqueOrThrow({ where: { slug: "plny-uvazek" } }),
    prisma.employmentType.findUniqueOrThrow({ where: { slug: "brigada" } }),
    prisma.employmentType.findUniqueOrThrow({ where: { slug: "castecny-uvazek" } }),
    prisma.employmentType.findUniqueOrThrow({ where: { slug: "polovicni-uvazek" } })
  ]);
  const [topPackage, standardPackage] = await Promise.all([
    prisma.pricingPackage.findUniqueOrThrow({ where: { id: "top" } }),
    prisma.pricingPackage.findUniqueOrThrow({ where: { id: "standard" } })
  ]);

  const demoCompanies = [
    { name: "Regionální media s.r.o.", email: "redakce@chcupracu.cz", phone: "+420 777 123 456", brandColor: "#e00909" },
    { name: "Hotel Horal", email: "personalni@horal.cz", phone: "+420 777 555 221", brandColor: "#14532d" },
    { name: "Elektro Beskydy", email: "nabor@elektrobeskydy.cz", phone: "+420 777 240 118", brandColor: "#0f5fa8" },
    { name: "Valašské stavby", email: "obchod@stavby.cz", phone: "+420 777 888 119", brandColor: "#111827" },
    { name: "Kovovýroba Zubří", email: "personalni@kovozubri.cz", phone: "+420 777 420 310", brandColor: "#374151" },
    { name: "Logistika Valmez", email: "hr@logistikavalmez.cz", phone: "+420 777 612 220", brandColor: "#0f766e" },
    { name: "Kavárna u náměstí", email: "info@kavarna-roznov.cz", phone: "+420 777 555 221", brandColor: "#7c2d12" },
    { name: "Domov Vsetín", email: "personalni@domovvsetin.cz", phone: "+420 777 240 551", brandColor: "#166534" },
    { name: "Vizovické služby", email: "prace@vizovickesluzby.cz", phone: "+420 777 882 410", brandColor: "#7f1d1d" },
    { name: "Beskyd servis", email: "nabor@beskydservis.cz", phone: "+420 777 300 112", brandColor: "#1e3a8a" },
    { name: "Potraviny Halenkov", email: "vedouci@potravinyhalenkov.cz", phone: "+420 777 910 123", brandColor: "#854d0e" },
    { name: "Brumovská strojírna", email: "hr@brumovstroj.cz", phone: "+420 777 733 440", brandColor: "#334155" },
    { name: "Recepce Beskydy", email: "recepce@beskydy.cz", phone: "+420 777 505 909", brandColor: "#0369a1" }
  ];
  for (const company of demoCompanies) {
    await prisma.company.upsert({
      where: { slug: slug(company.name) },
      update: company,
      create: { ...company, slug: slug(company.name), contactName: "Redakce chcupracu.cz" }
    });
  }

  const companyBySlug = async (name: string) => prisma.company.findUniqueOrThrow({ where: { slug: slug(name) } });
  const now = new Date();
  const activeUntil = new Date(now);
  activeUntil.setDate(activeUntil.getDate() + 45);
  const topUntil = new Date(now);
  topUntil.setDate(topUntil.getDate() + 14);

  const demoJobs = [
    {
      title: "Asistent/ka redakce a zákaznické podpory",
      companyName: "Regionální media s.r.o.",
      cityId: vsetin.id,
      categoryId: administrativa.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: topPackage.id,
      salaryMinCzk: 32000,
      salaryMaxCzk: 42000,
      isTop: true,
      highlightColor: "#fff7f7",
      showImageInList: true
    },
    {
      title: "Pokojská / provozní výpomoc",
      companyName: "Hotel Horal",
      cityId: karlovice.id,
      categoryId: gastro.id,
      educationId: bezMaturity.id,
      employmentTypeId: brigade.id,
      packageId: standardPackage.id,
      salaryMinCzk: 180,
      salaryMaxCzk: 220,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Elektromechanik výroby",
      companyName: "Elektro Beskydy",
      cityId: roznov.id,
      categoryId: elektro.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: topPackage.id,
      salaryMinCzk: 42000,
      salaryMaxCzk: 56000,
      isTop: true,
      highlightColor: "#fff7f7",
      showImageInList: true
    },
    {
      title: "Zedník pro regionální stavby",
      companyName: "Valašské stavby",
      cityId: vsetin.id,
      categoryId: remesla.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 38000,
      salaryMaxCzk: 52000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Operátor CNC obrábění",
      companyName: "Kovovýroba Zubří",
      cityId: zubri.id,
      categoryId: strojirenstvi.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 36000,
      salaryMaxCzk: 48000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Skladník / expedient",
      companyName: "Logistika Valmez",
      cityId: valmez.id,
      categoryId: doprava.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 33000,
      salaryMaxCzk: 41000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Výpomoc do kavárny",
      companyName: "Kavárna u náměstí",
      cityId: roznov.id,
      categoryId: gastro.id,
      educationId: bezMaturity.id,
      employmentTypeId: brigade.id,
      packageId: standardPackage.id,
      salaryMinCzk: 170,
      salaryMaxCzk: 210,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Pečovatel/ka v sociálních službách",
      companyName: "Domov Vsetín",
      cityId: vsetin.id,
      categoryId: zdravotnictvi.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: topPackage.id,
      salaryMinCzk: 34000,
      salaryMaxCzk: 44000,
      isTop: true,
      highlightColor: "#fff7f7",
      showImageInList: true
    },
    {
      title: "Pracovník údržby města",
      companyName: "Vizovické služby",
      cityId: vizovice.id,
      categoryId: remesla.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 31000,
      salaryMaxCzk: 39000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Servisní technik pro region",
      companyName: "Beskyd servis",
      cityId: valmez.id,
      categoryId: elektro.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 40000,
      salaryMaxCzk: 55000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Prodavač/ka potravin",
      companyName: "Potraviny Halenkov",
      cityId: halenkov.id,
      categoryId: obchod.id,
      educationId: bezMaturity.id,
      employmentTypeId: halfTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 23000,
      salaryMaxCzk: 29000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Seřizovač výrobní linky",
      companyName: "Brumovská strojírna",
      cityId: brumov.id,
      categoryId: strojirenstvi.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: topPackage.id,
      salaryMinCzk: 45000,
      salaryMaxCzk: 62000,
      isTop: true,
      highlightColor: "#fff7f7",
      showImageInList: true
    },
    {
      title: "Recepční v penzionu",
      companyName: "Recepce Beskydy",
      cityId: karlovice.id,
      categoryId: cestovniRuch.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 30000,
      salaryMaxCzk: 38000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Řidič dodávky pro rozvoz",
      companyName: "Logistika Valmez",
      cityId: valmez.id,
      categoryId: doprava.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 35000,
      salaryMaxCzk: 47000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Administrativní podpora prodeje",
      companyName: "Regionální media s.r.o.",
      cityId: vsetin.id,
      categoryId: administrativa.id,
      educationId: maturita.id,
      employmentTypeId: partTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 26000,
      salaryMaxCzk: 34000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Číšník / servírka",
      companyName: "Hotel Horal",
      cityId: karlovice.id,
      categoryId: gastro.id,
      educationId: bezMaturity.id,
      employmentTypeId: fullTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 32000,
      salaryMaxCzk: 43000,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Pomocný stavební dělník",
      companyName: "Valašské stavby",
      cityId: vsetin.id,
      categoryId: stavebnictvi.id,
      educationId: bezMaturity.id,
      employmentTypeId: brigade.id,
      packageId: standardPackage.id,
      salaryMinCzk: 190,
      salaryMaxCzk: 240,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    },
    {
      title: "Obchodní zástupce pro lokální klienty",
      companyName: "Regionální media s.r.o.",
      cityId: vsetin.id,
      categoryId: obchod.id,
      educationId: maturita.id,
      employmentTypeId: fullTime.id,
      packageId: topPackage.id,
      salaryMinCzk: 38000,
      salaryMaxCzk: 68000,
      isTop: true,
      highlightColor: "#fff7f7",
      showImageInList: true
    },
    {
      title: "Pomocná síla do kuchyně",
      companyName: "Kavárna u náměstí",
      cityId: roznov.id,
      categoryId: gastro.id,
      educationId: bezMaturity.id,
      employmentTypeId: partTime.id,
      packageId: standardPackage.id,
      salaryMinCzk: 160,
      salaryMaxCzk: 190,
      isTop: false,
      highlightColor: null,
      showImageInList: false
    }
  ];

  for (const job of demoJobs) {
    const company = await companyBySlug(job.companyName);
    const jobPayload = {
      shortIntro: `${job.companyName} hledá posilu do týmu. Ukázkový inzerát pro ostrý náhled portálu chcupracu.cz.`,
      description: "Budete pracovat v lokálním týmu, komunikovat s kolegy a podílet se na běžném provozu firmy v regionu.",
      requirements: "Spolehlivost, chuť pracovat a férová komunikace. Praxe v oboru je výhodou.",
      benefits: "Práce blízko domova, férové jednání, nástup dle dohody a možnost dlouhodobé spolupráce.",
      contactEmail: company.email,
      contactPhone: company.phone,
      previewImageUrl: "/preview-assets/hero-workers.png",
      detailImageUrl: "/preview-assets/hero-workers.png",
      flyerUrl: null,
      showImageInList: job.showImageInList,
      showSalaryInPreview: true,
      salaryMinCzk: job.salaryMinCzk,
      salaryMaxCzk: job.salaryMaxCzk,
      highlightColor: job.highlightColor,
      isTop: job.isTop,
      topUntil: job.isTop ? topUntil : null,
      status: JobStatus.ACTIVE,
      activeFrom: now,
      activeUntil,
      renewedAt: now,
      companyId: company.id,
      cityId: job.cityId,
      categoryId: job.categoryId,
      educationId: job.educationId,
      employmentTypeId: job.employmentTypeId,
      packageId: job.packageId
    };
    await prisma.jobPost.upsert({
      where: { slug: slug(job.title) },
      update: jobPayload,
      create: {
        title: job.title,
        slug: slug(job.title),
        ...jobPayload
      }
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
