import { prisma } from '../db.js';
import { DEFAULT_TEMPLATES } from '../services/whatsappMessages.js';

// Devolve todas as chaves conhecidas com o texto atualmente em uso (override
// salvo pelo admin, ou o padrão do sistema) — a UI de admin usa isso pra
// montar a lista editável.
export async function listWhatsAppMessageTemplates(req, res, next) {
  try {
    const overrides = await prisma.whatsAppMessageTemplate.findMany();
    const overrideMap = new Map(overrides.map((o) => [o.key, o.template]));

    const list = Object.entries(DEFAULT_TEMPLATES).map(([key, meta]) => ({
      key,
      description: meta.description,
      default_template: meta.template,
      template: overrideMap.get(key) ?? meta.template,
      is_customized: overrideMap.has(key),
    }));

    res.json(list);
  } catch (err) {
    next(err);
  }
}

// Salva (upsert) ou remove (reset ao padrão, quando template vazio/igual ao
// padrão) o override de uma chave de mensagem.
export async function saveWhatsAppMessageTemplate(req, res, next) {
  try {
    const { key, template } = req.body || {};
    if (!key || !DEFAULT_TEMPLATES[key]) {
      return res.status(400).json({ error: 'Chave de mensagem desconhecida' });
    }

    const trimmed = (template ?? '').trim();
    const isDefault = !trimmed || trimmed === DEFAULT_TEMPLATES[key].template;

    if (isDefault) {
      await prisma.whatsAppMessageTemplate.deleteMany({ where: { key } });
      return res.json({ success: true, template: DEFAULT_TEMPLATES[key].template, is_customized: false });
    }

    await prisma.whatsAppMessageTemplate.upsert({
      where: { key },
      update: { template: trimmed },
      create: { key, template: trimmed },
    });

    res.json({ success: true, template: trimmed, is_customized: true });
  } catch (err) {
    next(err);
  }
}
