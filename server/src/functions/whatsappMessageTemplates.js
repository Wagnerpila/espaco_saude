import { prisma } from '../db.js';
import { DEFAULT_TEMPLATES, TEMPLATE_CATEGORIES } from '../services/whatsappMessages.js';

// Devolve todas as chaves conhecidas com o texto atualmente em uso (override
// salvo pelo admin, ou o padrão do sistema) — a UI de admin usa isso pra
// montar a lista editável, agrupada por categoria (TEMPLATE_CATEGORIES).
//
// mediaUrl no banco: null = sem override (herda a imagem padrão da chave, se
// houver — ver `media` em DEFAULT_TEMPLATES); '' = admin removeu
// explicitamente (nem imagem customizada, nem a padrão); string = imagem
// customizada.
export async function listWhatsAppMessageTemplates(req, res, next) {
  try {
    const overrides = await prisma.whatsAppMessageTemplate.findMany();
    const overrideMap = new Map(overrides.map((o) => [o.key, o]));

    const list = Object.entries(DEFAULT_TEMPLATES).map(([key, meta]) => {
      const override = overrideMap.get(key);
      const mediaCustomized = !!override && override.mediaUrl !== null;
      return {
        key,
        category: meta.category,
        description: meta.description,
        default_template: meta.template,
        template: override?.template ?? meta.template,
        supports_media: !!meta.supportsMedia,
        default_media_url: meta.media || null,
        media_url: mediaCustomized ? (override.mediaUrl || null) : (meta.media || null),
        is_customized: !!override && override.template !== meta.template,
        is_media_customized: mediaCustomized,
      };
    });

    res.json({ list, categories: TEMPLATE_CATEGORIES });
  } catch (err) {
    next(err);
  }
}

// Salva o texto e/ou a imagem de uma chave. `template` sempre é aplicado;
// `media_url` só é tocado quando o campo vem no payload (permite editar só o
// texto sem mexer numa imagem já anexada) — string customiza, '' remove
// explicitamente (inclusive uma imagem padrão do sistema). `reset: true`
// ignora tudo o mais e apaga o override inteiro (volta ao texto e imagem
// padrão da chave).
export async function saveWhatsAppMessageTemplate(req, res, next) {
  try {
    const { key, template, media_url: mediaUrlInput, reset } = req.body || {};
    const meta = DEFAULT_TEMPLATES[key];
    if (!key || !meta) {
      return res.status(400).json({ error: 'Chave de mensagem desconhecida' });
    }

    if (reset) {
      await prisma.whatsAppMessageTemplate.deleteMany({ where: { key } });
      return res.json({
        success: true,
        template: meta.template,
        media_url: meta.media || null,
        is_customized: false,
        is_media_customized: false,
      });
    }

    const trimmed = (template ?? '').trim();
    const finalTemplate = trimmed || meta.template;

    const mediaProvided = meta.supportsMedia && Object.prototype.hasOwnProperty.call(req.body || {}, 'media_url');
    let finalMediaUrl;
    if (mediaProvided) {
      finalMediaUrl = mediaUrlInput ? String(mediaUrlInput).trim() : '';
    } else {
      const existing = await prisma.whatsAppMessageTemplate.findUnique({ where: { key } });
      finalMediaUrl = existing?.mediaUrl ?? null;
    }

    const saved = await prisma.whatsAppMessageTemplate.upsert({
      where: { key },
      update: { template: finalTemplate, mediaUrl: finalMediaUrl },
      create: { key, template: finalTemplate, mediaUrl: finalMediaUrl },
    });

    res.json({
      success: true,
      template: saved.template,
      media_url: saved.mediaUrl !== null ? (saved.mediaUrl || null) : (meta.media || null),
      is_customized: saved.template !== meta.template,
      is_media_customized: saved.mediaUrl !== null,
    });
  } catch (err) {
    next(err);
  }
}
