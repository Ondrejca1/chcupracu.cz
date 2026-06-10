"use client";

import { CheckCircle2, UploadCloud } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { uploadAdminAsset } from "@/app/actions";

export function AssetUploadField({
  accept,
  defaultValue,
  help,
  label,
  name,
  placeholder
}: {
  accept?: string;
  defaultValue?: string | null;
  help?: string;
  label: string;
  name: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="field-group asset-upload-field">
      <span>{label}</span>
      <input className="field" name={name} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} value={value} />
      <div className="asset-upload-row">
        <input accept={accept} ref={inputRef} type="file" />
        <button
          className="admin-mini-button"
          disabled={isPending}
          onClick={() => {
            const file = inputRef.current?.files?.[0];
            if (!file) {
              setMessage("Vyberte soubor k nahrání.");
              return;
            }
            const formData = new FormData();
            formData.append("file", file);
            startTransition(async () => {
              const result = await uploadAdminAsset(formData);
              setMessage(result.message);
              if (result.ok) setValue(result.url);
            });
          }}
          type="button"
        >
          {isPending ? "Nahrávám..." : <><UploadCloud size={15} /> Nahrát</>}
        </button>
      </div>
      {help && <small>{help}</small>}
      {message && (
        <small className={message.includes("nahrán") ? "asset-upload-ok" : "asset-upload-error"}>
          {message.includes("nahrán") && <CheckCircle2 size={14} />} {message}
        </small>
      )}
    </div>
  );
}
