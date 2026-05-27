export function money(value?: number | null) {
  if (!value) return "dohodou";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0
  }).format(value);
}

export function salaryRange(min?: number | null, max?: number | null) {
  if (min && max) return `${money(min)} - ${money(max)}`;
  if (min) return `od ${money(min)}`;
  if (max) return `do ${money(max)}`;
  return "mzda dohodou";
}

export function dateCs(date?: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
