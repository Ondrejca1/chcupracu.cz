# UI/UX zadani pro design chcupracu.cz

Tento dokument je podklad pro design ve Figme. Projekt uz ma hotovou produktovou strukturu, verejne stranky, administraci, databazove modely a zakladni vyvojarsky vzhled. Cilem designu neni znovu vymyslet produkt, ale udelat z existujici struktury profesionalni, citelny a duveryhodny regionalni pracovni portal.

## Kratka verze zadani

Navrhni vizualni a UX podobu existujiciho pracovního portalu chcupracu.cz. Struktura stran uz existuje: homepage, hledani prace, detail nabidky a redakcni administrace. Tvym ukolem je sjednotit vzhled, zlepsit citelnost, pripravit mobilni varianty, navrhnout komponenty a popsat interakce tak, aby vyvoj mohl design prevest do kodu bez domysleni zasadnich rozhodnuti.

Neprogramuj. Pracuj ve Figme. Dodavat potrebujeme desktop a mobil pro hlavni obrazovky, design system, varianty karet a formulare, stavy komponent a poznamky k chovani.

## Kontext projektu

chcupracu.cz je regionalni pracovni portal pro Vsetinsko a okoli. Propojuje tri potreby:

- uchazec rychle najde relevantni praci v regionu,
- firma nebo redakce muze jednoduse vlozit a spravovat inzerat,
- portal umi prodavat topovani, reklamni pozice a promo prostoru Jalovce.

Ton znacky ma byt lokalni, primy, duveryhodny a prakticky. Ne korporatni job-board bez tvare, ale ani prezdobeny magazin. Web ma pusobit jako misto, kde clovek najde praci rychle a bez zbytecneho hledani.

## Co uz je dane

Struktura produktu uz existuje a mela by se drzet:

- Homepage s hlavnim vyhledavanim, rychlymi kategoriemi, reklamnim pasem, firemnimi bloky, filtrem a vypisem vybranych nabidek.
- Samostatna stranka `/jobs` pro hledani a filtrovani pracovnich nabidek.
- Detail nabidky `/jobs/[slug]` s informacemi o pozici, firmou, mzdou, kontaktem, odpovednim formularem, medii a podobnymi nabidkami.
- Redakcni/admin cast `/admin` pro dashboard, inzeraty, pridani inzeratu, reklamy, Jalovec, finance, balicky a ciselniky.
- Datove objekty: mesta, obory, vzdelani, uvazky, vhodnost pro skupiny, firmy, inzeraty, reakce, faktury, balicky, reklamni pozice, vydani Jalovce.

Aktualni vzhled je funkcni prototyp. Jsou zde zakladni barvy, karty, formulare a responzivita, ale vizualni system je potreba sjednotit a zprofesionalnit.

## Hlavni designove cile

1. Vytvorit jasnou vizualni identitu pro chcupracu.cz.
2. Zlepsit citelnost a prehlednost verejne casti.
3. Udelat z homepage prodejni, ale ne reklamne preplacanou vstupni stranku.
4. Z detailu nabidky udelat stranku, kde se uchazec rychle rozhodne a jednoduse odpovi.
5. Navrhnout administraci jako pracovni nastroj pro redakci, ne jako marketingovy web.
6. Sjednotit komponenty: tlacitka, inputy, selecty, karty, statusy, filtry, tabulky, prazdne stavy, chybove stavy.
7. Navrhnout desktop i mobilni verzi.

## Verejna cast

### 1. Homepage

Soucasny obsah:

- header s logem a navigaci,
- hero s claimem a hlavnim vyhledavanim,
- promo/reklamni box v hero casti,
- rychle odkazy na oblibene typy prace,
- reklamni pas pro Jalovec / partnera tydne / top obory,
- firemni strip pro vetsi kampane,
- levy filtr a vypis vybranych nabidek.

Design ma vyresit:

- silnejsi prvni dojem znacky,
- jak pracovat s reklamou, aby byla obchodne viditelna, ale nerusila hledani prace,
- jak zobrazit rychle kategorie bez dojmu generickych karet,
- jak odlisit topovane inzeraty od beznych,
- jak ma homepage vypadat na mobilu, kde levy filtr nemuze zustat jako sticky sidebar.

Otevrene UX rozhodnuti:

- Na mobilu pravdepodobne skryt rozsirene filtry za tlacitko "Filtrovat".
- U reklamnich pozic jasne oznacit "Inzerce", ale vizualne je sladit se zbytkem webu.
- Homepage by nemela byt jen dlouhy seznam prace. Ma pusobit jako regionalni rozcestnik.

### 2. Hledani prace `/jobs`

Soucasny obsah:

- mensi hero s vysvetlenim hledani,
- hlavni vyhledavaci formular,
- reklamni horni pas,
- postranni filtr,
- seznam vysledku,
- prazdny stav.

Design ma vyresit:

- prehledny vyhledavaci layout pro desktop,
- mobilni filtr jako drawer/modal nebo rozbalovaci panel,
- jasny pocet vysledku a aktualne aktivni filtry,
- srozumitelny prazdny stav,
- konzistentni kartu pracovni nabidky.

Otevrene UX rozhodnuti:

- Navrhnout "aktivni chipy" filtru s moznosti odebrani.
- Navrhnout radeni, i kdyz zatim neni implementovane: nejrelevantnejsi, nejnovejsi, mzda.
- Navrhnout paginaci nebo nacitani dalsich vysledku pro pozdejsi fazi.

### 3. Karta pracovni nabidky

Soucasna karta obsahuje:

- mesto,
- uvazek,
- obor,
- nazev pozice,
- kratky uvod,
- firmu,
- mzdu,
- volitelny top stitek,
- volitelnou fotku,
- volitelnou barvu zvyrazneni.

Design ma dodat varianty:

- bezna karta,
- topovana karta,
- karta s fotkou,
- siroka/promovana karta,
- karta bez mzdy,
- karta v prazdnem nebo loading stavu.

Dulezite:

- Karta musi byt dobre citelna i s dlouhym nazvem pozice.
- Topovani nesmi vypadat jako chyba nebo agresivni reklama.
- Mzda ma byt viditelna, ale ne jediny dominantni prvek.

### 4. Detail nabidky

Soucasny obsah:

- breadcrumb,
- top stitek,
- nadpis pozice,
- kratky uvod,
- firma a lokalita,
- chipy s mestem, uvazkem, oborem, vzdelanim,
- highlight blok: mzda, nastup, aktivni do,
- hero fotka/detailni media,
- letak/PDF,
- panely: napln prace, ocekavame, nabizime, firma,
- kontaktni/odpovedni sidebar,
- odpovedni formular,
- reklamni karta,
- podobne nabidky.

Design ma vyresit:

- hierarchii informaci: co ma clovek videt do 5 sekund,
- sticky kontaktni panel na desktopu,
- jasnou a kratkou cestu k odpovedi,
- mobilni verzi, kde formular nesmi zmizet moc hluboko,
- variantu bez fotky, bez mzdy, bez telefonu, bez letaku,
- vizualni napojeni na firemni barvu, ale s kontrolovanou citelnosti.

Otevrene UX rozhodnuti:

- Na mobilu pridat sticky spodní CTA "Odpovedet" nebo "Mam zajem".
- U formulare navrhnout validacni chyby, odesilani a uspesny stav.
- Vyresit GDPR text tak, aby byl pravne viditelny, ale neprebijel formular.

## Administrace

Administrace je pro redakci/provoz. Ma byt hutna, rychla a klidna. Nepotrebuje hero sekce ani velke marketingove efekty.

### Admin obrazovky

Uz existuji tyto casti:

- `/admin/dashboard` - prehled inzeratu, reakci, financi, reklam a Jalovce.
- `/admin/jobs` - seznam inzeratu, filtry, obnova, topovani, skryti, editace.
- `/admin/jobs/new` a `/admin/jobs/[id]/edit` - formular inzeratu.
- `/admin/ads` - reklamni kampane a sloty.
- `/admin/jalovec` - aktualni vydani Jalovce a archiv.
- `/admin/finance` - finance/faktury.
- `/admin/packages` - ceník balicku.
- `/admin/dictionaries` - mesta, obory, ciselniky.

Design ma dodat:

- sidebar navigaci desktop + mobilni navigaci,
- dashboard KPI karty,
- seznam inzeratu,
- detail/format velkeho formulare inzeratu,
- stavy: active, draft, expired, archived, paid, unpaid, reserved, available,
- tabulky a seznamy,
- prazdne stavy,
- chybove a uspesne hlasky,
- potvrzovaci stav pro nebezpecne akce, napr. skryti inzeratu.

Dulezite:

- Admin je nastroj pro opakovane pouzivani. Musi byt citelny, kompaktni a predvidatelny.
- Formulare maji hodne poli. Potrebuji sekce, dobrou sirku sloupcu, napovedy a citelne povinne/nepovinne polozky.
- Na mobilu admin nemusi byt luxusni, ale musi byt pouzitelny pro rychlou opravu.

## Design system

Ve Figme pripravit minimalne tyto komponenty:

- Logo / wordmark chcupracu.cz.
- Barvy: primarni, sekundarni, text, muted text, pozadi, linky, uspech, varovani, chyba.
- Typografie: H1, H2, H3, body, small, label, table text.
- Tlacitka: primary, secondary, danger, icon, disabled, loading.
- Form prvky: input, select, textarea, checkbox, search input, validation error, help text.
- Karty: job card, top job card, admin stat card, ad card, company tile, package card.
- Stitky/chipy: status, filtr, top, lokalita, obor, uvazek.
- Navigace: verejny header, mobilni menu, admin sidebar, admin mobile bar.
- Alerty: success, error, warning, empty state.
- Tabulka/list row: normal, hover, selected, empty.
- Modal/drawer: mobilni filtry, potvrzeni akce.

## Responzivni breakpointy pro navrh

Navrhnout minimalne:

- Desktop: 1440 px.
- Mensi desktop/notebook: 1180-1280 px, pokud se nekde lame layout.
- Mobil: 390 px.

Volitelne:

- Tablet: 768 px pro kontrolu filtru a adminu.

## Obsahove podklady

Znacka:

- Nazev: chcupracu.cz
- Region: Vsetinsko a okoli
- Zakladni claim z prototypu: "Prace na Vsetine a okoli bez zbytecneho hledani"
- Ton: lokalni, primy, lidsky, duveryhodny

Hlavni lokality:

- Vsetin
- Valasske Mezirici
- Roznov pod Radhostem
- Velke Karlovice
- Brumov-Bylnice
- dalsi obce Vsetinska

Typicke kategorie:

- Vyroba a remesla
- Administrativa
- Gastronomie
- Obchod
- Doprava a logistika
- Strojirenstvi
- Zdravotnictvi a socialni pece
- Cestovni ruch

Obchodni produkty:

- Start: 14 dni
- Standard: 30 dni
- Top: 45 dni + topovani
- Reklamni pozice: homepage, vysledky hledani, sidebar, detail inzeratu

Aktualni assety v projektu:

- `/public/preview-assets/hero-workers.png`
- `/public/ads/jalovec-aktualni-vydani.jpg`

Tyto assety jsou jen vychozi. Design muze navrhnout lepsi vizualni smer, fotostyl, praci s logem a formaty reklam.

## Co zbyva navrhnout nebo rozhodnout

### Co predelat v aktualnim prototypu

- Aktualni vizual je funkcni, ale pusobi jako vyvojarsky prototyp. Potrebuje finalni identitu.
- Cervena barva a gradienty jsou ted hodne dominantni. Design ma rozhodnout, jestli zustanou hlavni znackou, nebo se zjemni.
- Typografie je misty prilis velka a agresivni, hlavne v hero sekcich a admin nadpisech.
- Karty a reklamni bloky jsou si vizualne podobne. Je potreba jasne odlisit praci, reklamu, Jalovec a admin data.
- Mobilni filtry zatim nejsou vyresene jako samostatny pohodlny tok.
- Admin formulare jsou funkcni, ale potrebuji lepsi rytmus, seskupeni poli a citelnejsi kontrolu dlouhych obrazovek.
- Chybi kompletni stavy: hover, focus, disabled, loading, error, success, empty.
- Chybi finalni pravidla pro obrazky, logo firmy, firemni barvu a reklamni kreativy.

### Vysoka priorita

- Finalni vizualni identita: barvy, typografie, logo/wordmark, fotostyl.
- Finalni verejny header a mobilni menu.
- Homepage desktop + mobil.
- Vyhledavani `/jobs` desktop + mobil vcetne mobilnich filtru.
- Job card ve vsech variantach.
- Detail nabidky desktop + mobil vcetne odpovedniho formulare.
- Admin dashboard a admin formular inzeratu.
- Stavove hlasky: prazdno, chyba, uspech, loading.

### Stredni priorita

- Reklamni pozice a jejich pravidla vzhledu.
- Jalovec promo bloky.
- Ceník/balicky.
- Finance a tabulkove obrazovky.
- Potvrzovaci dialogy pro admin akce.
- Aktivni filtry jako chipy.
- Pagination / "nacist dalsi".

### Pozdeji

- Nahravani souboru a stav uploadu.
- Verejna stranka "Zadat inzerat" mimo admin.
- Firmy/profily firem.
- Detailni analytika pro firmy.
- E-mailove sablony pro reakce.

## Predani z designu do vyvoje

Figma by mela obsahovat:

- Stranku "00 Zadani" s kratkym popisem cile.
- Stranku "01 Design system" s komponentami.
- Stranku "02 Public web" s homepage, hledanim, detailem.
- Stranku "03 Admin" s dashboardem, seznamem inzeratu a formularem.
- Stranku "04 States" s prazdnymi, chybovymi, loading a success stavy.
- Stranku "05 Handoff" s poznamkami k interakcim a responsivite.

Ke kazde obrazovce dodat:

- desktop a mobilni variantu,
- popis interakci,
- popis prazdnych/chybovych stavu,
- upozorneni na povinne texty a elementy,
- exportovatelne assety, pokud vzniknou.

## Akceptacni checklist

Design je pripraveny k implementaci, kdyz:

- Existuje jasna homepage pro desktop i mobil.
- Existuje vyhledavani s filtrem pro desktop i mobil.
- Existuje detail nabidky s odpovednim formularem pro desktop i mobil.
- Existuji vsechny varianty karty nabidky.
- Admin ma navrzeny dashboard, seznam inzeratu a dlouhy formular.
- Jsou definovane barvy, fonty, mezery a komponenty.
- Jsou navrzene hover/focus/disabled/loading/error/success stavy.
- Je jasne, jak vypada reklama a jak je oznacena.
- Je jasne, co se ma stat po kliknuti na hlavni akce.
- Vyvoj nemusi domyslet zasadni vizualni ani UX rozhodnuti.

## Poznamky pro designera

- Neres kod ani technickou implementaci.
- Drz existujici strukturu stran, pokud neni zjevne spatna.
- Kdyz chces zmenit strukturu, napis duvod a navrhni konkretni zmenu.
- Priorita je citelnost, duvera a rychle rozhodovani.
- Admin navrhuj jako pracovni nastroj, ne jako landing page.
- Reklama je soucast obchodniho modelu, ale nesmi rozbit hlavni tok hledani prace.
- U kazde obrazovky mysli na dlouhe ceske texty, dlouhe nazvy firem a male mobilni displeje.
