import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { email, name, status, rejectionReason } = await req.json();

  const isApproved = status === 'approved';

  const emailBody = isApproved ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">✅ Acesso Aprovado!</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333;">Parabéns, ${name}!</h2>
        <p style="color: #666; line-height: 1.6;">
          Sua solicitação de acesso como <strong>Profissional</strong> à Clínica Espaço Saúde foi <strong style="color: #11998e;">aprovada</strong>!
        </p>
        <p style="color: #666;">Você já pode acessar o sistema com seu email e senha cadastrados.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${req.headers.get('origin') || 'https://app.base44.com'}" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
            🚀 Acessar Sistema
          </a>
        </div>
      </div>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">❌ Solicitação Não Aprovada</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333;">Olá, ${name}</h2>
        <p style="color: #666; line-height: 1.6;">
          Infelizmente sua solicitação de acesso como <strong>Profissional</strong> não foi aprovada neste momento.
        </p>
        ${rejectionReason ? `
        <div style="background: #fff3f3; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #444;"><strong>Motivo:</strong> ${rejectionReason}</p>
        </div>
        ` : ''}
        <p style="color: #666;">Entre em contato com a clínica para mais informações.</p>
      </div>
    </div>
  `;

  await base44.integrations.Core.SendEmail({
    to: email,
    subject: isApproved ? '✅ Seu acesso foi aprovado - Clínica Espaço Saúde' : '❌ Solicitação de acesso - Clínica Espaço Saúde',
    body: emailBody
  });

  return Response.json({ success: true });
});