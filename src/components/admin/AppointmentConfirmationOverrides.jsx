import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Stethoscope, User, Loader2, Save, RotateCcw, ImagePlus, ImageOff, Pencil, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { listAppointmentConfirmationOverrides, saveAppointmentConfirmationOverride } from '@/functions/appointmentConfirmationOverrides';
import { UploadFile } from '@/integrations/Core';

const GROUP_META = {
  specialty: { icon: Stethoscope, title: 'Por especialidade', hint: 'Vale pra todo profissional com essa especialidade — a não ser que ele tenha um override individual abaixo, que sempre ganha.' },
  professional: { icon: User, title: 'Por profissional', hint: 'Vale só pra esse profissional, mesmo que a especialidade dele também tenha um texto/imagem próprios.' },
};

export default function AppointmentConfirmationOverrides() {
  const [bySpecialty, setBySpecialty] = useState([]);
  const [byProfessional, setByProfessional] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { scope, scope_value, label, template, media_url }
  const [draftText, setDraftText] = useState('');
  const [draftMediaUrl, setDraftMediaUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await listAppointmentConfirmationOverrides();
      setBySpecialty(data.by_specialty || []);
      setByProfessional(data.by_professional || []);
    } catch (error) {
      console.error('Erro ao carregar personalizações de confirmação:', error);
      toast.error('Erro ao carregar personalizações de confirmação');
    }
    setLoading(false);
  };

  const openEditor = (item) => {
    setEditing(item);
    setDraftText(item.template || '');
    setDraftMediaUrl(item.media_url || null);
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setEditing(null);
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
      await saveAppointmentConfirmationOverride({
        scope: editing.scope,
        scope_value: editing.scope_value,
        template: draftText,
        media_url: draftMediaUrl || '',
      });
      toast.success('Confirmação personalizada salva!');
      await load();
      setEditing(null);
    } catch (error) {
      console.error('Erro ao salvar personalização:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar personalização');
    }
    setSaving(false);
  };

  const handleClear = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await saveAppointmentConfirmationOverride({ scope: editing.scope, scope_value: editing.scope_value, template: '', media_url: '' });
      toast.success('Personalização removida — volta a usar o texto/imagem padrão');
      await load();
      setEditing(null);
    } catch (error) {
      console.error('Erro ao remover personalização:', error);
      toast.error('Erro ao remover personalização');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  const hasChanges = editing && (draftText !== (editing.template || '') || draftMediaUrl !== (editing.media_url || null));

  const renderGroup = (scope, items) => {
    const meta = GROUP_META[scope];
    const Icon = meta.icon;
    const customizedCount = items.filter((i) => i.is_customized).length;
    return (
      <AccordionItem value={scope} className="border rounded-lg px-3">
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-gray-800 dark:text-white">{meta.title}</span>
            <Badge variant="outline" className="text-xs font-normal">{items.length}</Badge>
            {customizedCount > 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">{customizedCount} personalizada{customizedCount > 1 ? 's' : ''}</Badge>}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-xs text-gray-500 mb-2">{meta.hint}</p>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nenhum profissional cadastrado ainda.</p>
          ) : (
            <div className="space-y-1.5 pb-2">
              {items.map((item) => (
                <button
                  key={`${item.scope}:${item.scope_value}`}
                  type="button"
                  onClick={() => openEditor(item)}
                  className="w-full text-left flex items-center justify-between gap-3 rounded-md border p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{item.label}</div>
                    {item.scope === 'professional' && <div className="text-xs text-gray-400 truncate">{item.specialty}{item.active === false ? ' • inativo' : ''}</div>}
                    {item.scope === 'specialty' && <div className="text-xs text-gray-400 truncate">{item.professional_count} profissional{item.professional_count !== 1 ? 'is' : ''}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.is_customized && <Badge className="bg-blue-100 text-blue-700 text-xs">Personalizado</Badge>}
                    {item.media_url && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Imagem
                      </Badge>
                    )}
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-5 h-5 text-indigo-500" />
            Confirmação de Agendamento por Especialidade/Profissional
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Personalize o texto e a imagem da mensagem de confirmação pra uma especialidade inteira, ou só pra um profissional específico (que sempre tem prioridade sobre a especialidade dele).
            Deixe o texto em branco pra manter a mensagem padrão e trocar só a imagem. Isso tem prioridade sobre a mensagem padrão de confirmação (inclusive a variação de Depilação a LED).
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <Accordion type="multiple" defaultValue={['specialty']} className="space-y-2">
            {renderGroup('specialty', bySpecialty)}
            {renderGroup('professional', byProfessional)}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{editing.label}</DialogTitle>
                <DialogDescription>
                  {editing.scope === 'specialty' ? 'Confirmação personalizada para esta especialidade' : `Confirmação personalizada para este profissional (${editing.specialty})`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Texto (deixe em branco pra usar o texto padrão da confirmação)
                  </label>
                  <Textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={7}
                    placeholder="Em branco = usa o texto padrão de Mensagens do Bot &gt; Notificações automáticas"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Use <code>{'{{variavel}}'}</code> pra dados do agendamento: patient_name, date, time, professional_line, service_line.
                  </p>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" /> Imagem anexada
                  </div>
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
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                {editing.is_customized && (
                  <Button variant="outline" size="sm" disabled={saving} onClick={handleClear}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Remover personalização
                  </Button>
                )}
                <Button size="sm" disabled={!hasChanges || saving || uploading} onClick={handleSave} className="bg-green-600 hover:bg-green-700">
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
