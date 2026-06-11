import { AdProductType } from "@prisma/client";

export type AdSlotDefinition = {
  key: string;
  name: string;
  location: string;
  format: string;
  recommendedSize: string;
  preview: string;
  availableSlots: number;
  defaultDurationDays: number;
  defaultPriceCzk: number;
  productType: AdProductType;
};

export const adSlotDefinitions: AdSlotDefinition[] = [
  {
    key: "homepage_strip",
    name: "Homepage reklamní pás",
    location: "Homepage / pod rychlými dlaždicemi",
    format: "Široký banner + text",
    recommendedSize: "min. 1200 x 360 px",
    preview: "Zobrazí se na titulní straně pod hlavními akcemi.",
    availableSlots: 1,
    defaultDurationDays: 14,
    defaultPriceCzk: 2900,
    productType: AdProductType.PAID_AD
  },
  {
    key: "jobs_top_strip",
    name: "Výpis nabídek nahoře",
    location: "Hledání práce / nad výsledky",
    format: "Horizontální reklamní pruh",
    recommendedSize: "min. 1200 x 300 px",
    preview: "Zobrazí se nad výsledky hledání pracovních nabídek.",
    availableSlots: 1,
    defaultDurationDays: 14,
    defaultPriceCzk: 2400,
    productType: AdProductType.PAID_AD
  },
  {
    key: "sidebar_box",
    name: "Boční promo box",
    location: "Homepage a hledání / boční sloupec",
    format: "Obrázek 4:3 + text",
    recommendedSize: "800 x 600 px",
    preview: "Zobrazí se v bočních promo blocích na homepage a ve výpisu.",
    availableSlots: 2,
    defaultDurationDays: 14,
    defaultPriceCzk: 1900,
    productType: AdProductType.PAID_AD
  },
  {
    key: "job_detail_sidebar",
    name: "Detail inzerátu",
    location: "Detail pracovní nabídky / pravý panel",
    format: "Karta partnera",
    recommendedSize: "800 x 600 px",
    preview: "Zobrazí se v detailu pracovní nabídky u odpovědního formuláře.",
    availableSlots: 1,
    defaultDurationDays: 14,
    defaultPriceCzk: 2200,
    productType: AdProductType.PARTNER_OF_WEEK
  }
];

export function getAdSlotDefinition(key: string) {
  return adSlotDefinitions.find((slot) => slot.key === key) ?? adSlotDefinitions[0];
}
