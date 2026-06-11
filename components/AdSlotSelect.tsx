"use client";

import { useMemo, useState } from "react";
import type { AdSlotDefinition } from "@/lib/ad-slots";
import { money } from "@/lib/format";

export function AdSlotSelect({ defaultValue, slots }: { defaultValue: string; slots: AdSlotDefinition[] }) {
  const [selectedKey, setSelectedKey] = useState(defaultValue);
  const selected = useMemo(() => slots.find((slot) => slot.key === selectedKey) ?? slots[0], [selectedKey, slots]);

  return (
    <div className="ad-slot-select">
      <label className="field-group">
        <span>Reklamní pozice</span>
        <select className="select" name="placementKey" required value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
          {slots.map((slot) => <option key={slot.key} value={slot.key}>{slot.name}</option>)}
        </select>
        <small>Umístění a formát se doplní automaticky podle vybrané pozice.</small>
      </label>
      <div className="ad-slot-select-preview">
        <strong>{selected.name}</strong>
        <span>{selected.location}</span>
        <span>{selected.format} · {selected.recommendedSize}</span>
        <small>{selected.preview}</small>
        <em>{selected.availableSlots} sloty · {selected.defaultDurationDays} dní · {money(selected.defaultPriceCzk)}</em>
      </div>
    </div>
  );
}
