import { sendEmail } from '../services/email.js';

export async function sendInviteEmail(req, res, next) {
  try {
    const { email, role, token, expiresAt, inviterName } = req.body || {};
    const roleLabel = role === 'professional' ? 'Profissional' : 'Paciente';
    const origin = req.headers.origin || process.env.CORS_ORIGIN || '';
    const inviteUrl = `${origin}/accept-invite/${token}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Clínica Espaço Saúde</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Convite de Acesso</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Olá! Você foi convidado</h2>
          <p style="color: #666; line-height: 1.6;">
            <strong>${inviterName || 'Um administrador'}</strong> convidou você para acessar o sistema da Clínica Espaço Saúde como <strong>${roleLabel}</strong>.
          </p>
          <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #444;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0 0; color: #444;"><strong>Tipo:</strong> ${roleLabel}</p>
            <p style="margin: 5px 0 0; color: #444;"><strong>Expira em:</strong> ${new Date(expiresAt).toLocaleString('pt-BR')}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              ✅ Aceitar Convite
            </a>
          </div>
          ${role === 'professional' ? `
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              ⚠️ <strong>Atenção:</strong> Como profissional, seu acesso precisará ser aprovado por um administrador após o cadastro.
            </p>
          </div>
          ` : ''}
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Se você não solicitou este convite, ignore este email. O link expira em ${new Date(expiresAt).toLocaleString('pt-BR')}.
          </p>
        </div>
      </div>
    `;

    await sendEmail({ to: email, subject: `Convite para acessar a Clínica Espaço Saúde - ${roleLabel}`, body: emailBody });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
