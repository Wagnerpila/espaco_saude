import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquareText, Save, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { listWhatsAppMessageTemplates, saveWhatsAppMessageTemplate } from '@/functions/whatsappMessageTemplates';

export default function WhatsAppMessageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await listWhatsAppMessageTemplates();
      setTemplates(data);
      setDrafts(Object.fromEntries(data.map((tpl) => [tpl.key, tpl.template])));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens do WhatsApp');
    }
    setLoading(false);
  };

  const handleSave = async (key) => {
    setSavingKey(key);
    try {
      await saveWhatsAppMessageTemplate({ key, template: drafts[key] });
      toast.success('Mensagem salva!');
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar mensagem');
    }
    setSavingKey(null);
  };

  const handleReset = async (tpl) => {
    setSavingKey(tpl.key);
    try {
      await saveWhatsAppMessageTemplate({ key: tpl.key, template: '' });
      toast.success('Restaurado para o texto padrão');
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao restaurar mensagem:', error);
      toast.error('Erro ao restaurar mensagem');
    }
    setSavingKey(null);
  };

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="w-5 h-5 text-green-500" />
          Mensagens do Bot de WhatsApp
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Edite os textos que o bot envia automaticamente pelo WhatsApp. Use <code>{'{{variavel}}'}</code> onde aparecer — esses trechos são preenchidos pelo sistema (nome, data, horário etc.), não altere o nome entre chaves.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {templates.map((tpl) => {
          const changed = drafts[tpl.key] !== tpl.template;
          return (
            <div key={tpl.key} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">{tpl.description}</span>
                  <span className="text-xs text-gray-400 ml-2 font-mono">{tpl.key}</span>
                </div>
                {tpl.is_customized && <Badge className="bg-blue-100 text-blue-700 text-xs">Personalizada</Badge>}
              </div>
              <Textarea
                value={drafts[tpl.key] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [tpl.key]: e.target.value }))}
                rows={4}
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                {tpl.is_customized && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingKey === tpl.key}
                    onClick={() => handleReset(tpl)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar padrão
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={!changed || savingKey === tpl.key}
                  onClick={() => handleSave(tpl.key)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingKey === tpl.key ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Salvar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
