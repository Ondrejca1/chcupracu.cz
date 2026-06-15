type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Chci práci <noreply@chcupracu.cz>";
  if (!apiKey) return { ok: false, skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo
    })
  });

  if (!response.ok) {
    console.error("Unable to send transactional email.", await response.text());
    return { ok: false, skipped: false };
  }

  return { ok: true, skipped: false };
}
