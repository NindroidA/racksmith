import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// Read at call-time so test env mutations and runtime reconfiguration
// (e.g. swapping the dev sender) take effect without reimport.
function getFromAddress(): string {
  return (
    process.env.RACKSMITH_EMAIL_FROM || "RackSmith <noreply@racksmith.local>"
  );
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey) {
    console.log("\n─── [RackSmith dev-mode email] ─────────────");
    console.log(`To:      ${input.to}`);
    console.log(`From:    ${from}`);
    console.log(`Subject: ${input.subject}`);
    console.log("");
    console.log(input.text);
    console.log("────────────────────────────────────────────\n");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
