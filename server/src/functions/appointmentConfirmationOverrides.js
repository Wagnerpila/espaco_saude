import { prisma } from '../db.js';

// Lista, pra tela de admin, todas as especialidades e profissionais
// existentes (derivados da tabela Professional — não há catálogo fixo, é
// texto livre) já casados com o override salvo, se houver. Ver
// services/appointmentConfirmationOverrides.js pra ordem de prioridade
// aplicada no envio real.
export async function listAppointmentConfirmationOverrides(req, res, next) {
  try {
    const [professionals, overrides] = await Promise.all([
      prisma.professional.findMany({ orderBy: { fullName: 'asc' } }),
      prisma.appointmentConfirmationOverride.findMany(),
    ]);

    const overrideMap = new Map(overrides.map((o) => [`${o.scope}:${o.scopeValue}`, o]));

    const specialties = [...new Set(professionals.map((p) => p.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const bySpecialty = specialties.map((specialty) => {
      const override = overrideMap.get(`specialty:${specialty}`);
      return {
        scope: 'specialty',
        scope_value: specialty,
        label: specialty,
        professional_count: professionals.filter((p) => p.specialty === specialty).length,
        template: override?.template ?? null,
        media_url: override?.mediaUrl || null,
        is_customized: !!override,
      };
    });

    const byProfessional = professionals.map((prof) => {
      const override = overrideMap.get(`professional:${prof.id}`);
      return {
        scope: 'professional',
        scope_value: prof.id,
        label: prof.fullName,
        specialty: prof.specialty,
        active: prof.active,
        template: override?.template ?? null,
        media_url: override?.mediaUrl || null,
        is_customized: !!override,
      };
    });

    res.json({ by_specialty: bySpecialty, by_professional: byProfessional });
  } catch (err) {
    next(err);
  }
}

// Salva (upsert) ou remove (quando não sobra nada customizado) o override de
// uma especialidade ou profissional. `template: null/''` usa o texto padrão
// da confirmação; `media_url: null/''` remove a imagem customizada.
export async function saveAppointmentConfirmationOverride(req, res, next) {
  try {
    const { scope, scope_value: scopeValue, template, media_url: mediaUrlInput } = req.body || {};
    if (!['specialty', 'professional'].includes(scope) || !scopeValue) {
      return res.status(400).json({ error: 'scope/scope_value inválidos' });
    }

    const finalTemplate = (template ?? '').trim() || null;
    const finalMediaUrl = (mediaUrlInput ?? '').trim() || null;

    if (!finalTemplate && !finalMediaUrl) {
      await prisma.appointmentConfirmationOverride.deleteMany({ where: { scope, scopeValue } });
      return res.json({ success: true, template: null, media_url: null, is_customized: false });
    }

    const saved = await prisma.appointmentConfirmationOverride.upsert({
      where: { scope_scopeValue: { scope, scopeValue } },
      update: { template: finalTemplate, mediaUrl: finalMediaUrl },
      create: { scope, scopeValue, template: finalTemplate, mediaUrl: finalMediaUrl },
    });

    res.json({ success: true, template: saved.template, media_url: saved.mediaUrl, is_customized: true });
  } catch (err) {
    next(err);
  }
}
