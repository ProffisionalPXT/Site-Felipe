import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { formatCurrency } from "./format";

// Configuração do SES - O SDK automaticamente pega AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY do env
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || "contato@seusite.com.br";

export async function sendPaymentConfirmationEmail({
  email,
  fullName,
  eventName,
  amountCents,
  registrationId,
}: {
  email: string;
  fullName: string;
  eventName: string;
  amountCents: number;
  registrationId: string;
}) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SES_FROM_EMAIL) {
    console.log("[Email] AWS SES não configurado. Pulando envio de email para:", email);
    return;
  }

  const amount = formatCurrency(amountCents / 100);
  
  // URL para acessar o comprovante/qrcode no site
  // O ideal seria pegar a BASE_URL do .env, mas podemos montar uma relativa ou deixar fixo para produção
  const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://correcronoo.onrender.com'}/evento/acesso-rapido?id=${registrationId}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #ea580c;">Inscrição Confirmada!</h2>
      <p>Olá <strong>${fullName}</strong>,</p>
      <p>Seu pagamento no valor de <strong>${amount}</strong> para o evento <strong>${eventName}</strong> foi confirmado com sucesso.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <p style="margin-top: 0;">Acesse seu comprovante e QR Code oficial:</p>
        <a href="${ticketUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver Meu Ingresso</a>
      </div>
      <p>Guarde este e-mail. Para dúvidas, responda diretamente a este remetente.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">Você está recebendo este e-mail pois se inscreveu no evento ${eventName}.</p>
    </div>
  `;

  const textBody = `
    Inscrição Confirmada!
    
    Olá ${fullName},
    Seu pagamento no valor de ${amount} para o evento ${eventName} foi confirmado com sucesso.
    
    Acesse seu comprovante e QR Code oficial:
    ${ticketUrl}
  `;

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: `Inscrição Confirmada: ${eventName}`,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
      },
    },
  });

  try {
    const result = await sesClient.send(command);
    console.log("[Email] Sucesso! Message ID:", result.MessageId);
    return result;
  } catch (error) {
    console.error("[Email] Falha ao enviar email via SES:", error);
    // Não lançamos o erro para não travar o fluxo do webhook, apenas logamos.
  }
}
