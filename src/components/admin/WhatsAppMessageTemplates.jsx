import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { MessageSquareText, Save, RotateCcw, Loader2, ImagePlus, ImageOff, Pencil, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { listWhatsAppMessageTemplates, saveWhatsAppMessageTemplate } from '@/functions/whatsappMessageTemplates';
import { UploadFile } from '@/integrations/Core';

export default function WhatsAppMessageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [draftMediaUrl, setDraftMediaUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await listWhatsAppMessageTemplates();
      setTemplates(data.list);
      setCategories(data.categories || {});
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens do WhatsApp');
    }
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const tpl of templates) {
      if (!map.has(tpl.category)) map.set(tpl.category, []);
      map.get(tpl.category).push(tpl);
    }
    return map;
  }, [templates]);

  const editing = templates.find((t) => t.key === editingKey) || null;

  const openEditor = (tpl) => {
    setEditingKey(tpl.key);
    setDraftText(tpl.template);
    setDraftMediaUrl(tpl.media_url);
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setEditingKey(null);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setDraftMediaUrl(file_url);
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast.error('Erro ao enviar imagem');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = { key: editing.key, template: draftText };
      // Só manda media_url quando o admin de fato mexeu na imagem — omitir o
      // campo preserva uma imagem já anexada ao salvar só o texto. '' remove
      // explicitamente (inclusive uma imagem padrão do sistema).
      if (draftMediaUrl !== editing.media_url) {
        payload.media_url = draftMediaUrl || '';
      }
      await saveWhatsAppMessageTemplate(payload);
      toast.success('Mensagem salva!');
      await loadTemplates();
      setEditingKey(null);
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar mensagem');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await saveWhatsAppMessageTemplate({ key: editing.key, reset: true });
      toast.success('Restaurado para o padrão');
      await loadTemplates();
      setEditingKey(null);
    } catch (error) {
      console.error('Erro ao restaurar mensagem:', error);
      toast.error('Erro ao restaurar mensagem');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  const textChanged = editing && draftText !== editing.template;
  const mediaChanged = editing && draftMediaUrl !== editing.media_url;
  const hasChanges = textChanged || mediaChanged;
  const isCustomized = editing && (editing.is_customized || editing.is_media_customized);

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareText className="w-5 h-5 text-green-500" />
            Mensagens do Bot de WhatsApp
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Selecione uma mensagem abaixo para editar o texto e, nas notificações automáticas, anexar uma imagem. Use{' '}
            <code>{'{{variavel}}'}</code> onde aparecer — esses trechos são preenchidos pelo sistema (nome, data, horário etc.), não altere o nome entre chaves.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <Accordion type="multiple" defaultValue={['notificacoes']} className="space-y-2">
            {Object.entries(categories).map(([catKey, catLabel]) => {
              const items = grouped.get(catKey) || [];
              if (!items.length) return null;
              const customizedCount = items.filter((t) => t.is_customized || t.is_media_customized).length;
              return (
                <AccordionItem key={catKey} value={catKey} className="border rounded-lg px-3">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-800 dark:text-white">{catLabel}</span>
                      <Badge variant="outline" className="text-xs font-normal">{items.length}</Badge>
                      {customizedCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{customizedCount} personalizada{customizedCount > 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 pb-2">
                      {items.map((tpl) => (
                        <button
                          key={tpl.key}
                          type="button"
                          onClick={() => openEditor(tpl)}
                          className="w-full text-left flex items-center justify-between gap-3 rounded-md border p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{tpl.description}</div>
                            <div className="text-xs text-gray-400 font-mono truncate">{tpl.key}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {tpl.is_customized && <Badge className="bg-blue-100 text-blue-700 text-xs">Texto editado</Badge>}
                            {tpl.is_media_customized && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Imagem
                              </Badge>
                            )}
                            {tpl.supports_media && !tpl.is_media_customized && tpl.media_url && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Padrão
                              </Badge>
                            )}
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{editing.description}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{editing.key}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={7}
                    className="font-mono text-sm"
                  />
                </div>

                {editing.supports_media && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" /> Imagem anexada
                    </div>
                    <p className="text-xs text-gray-500">
                      Enviada junto com o texto acima, como legenda. Só disponível em notificações automáticas (uma mensagem, um envio).
                    </p>
                    {draftMediaUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={draftMediaUrl} alt="Imagem anexada" className="w-20 h-20 object-cover rounded-md border" />
                        <div className="flex flex-col gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
                            Trocar imagem
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDraftMediaUrl(null)}>
                            <ImageOff className="w-3.5 h-3.5 mr-1.5" /> Remover imagem
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
                        Anexar imagem
                      </Button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                {isCustomized && (
                  <Button variant="outline" size="sm" disabled={saving} onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar padrão
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={!hasChanges || saving || uploading}
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
