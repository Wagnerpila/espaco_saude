
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export default function PublicChatLink() {
  const chatUrl = `${window.location.origin}/PublicChat`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(chatUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  const sendWhatsAppMessage = () => {
    const message = `🏥 *Clínica Espaço Saúde* 🏥

Olá! 

Agora você pode agendar suas consultas de forma ainda mais fácil através do nosso assistente virtual inteligente! 🤖

✨ *Acesse aqui:*
${chatUrl}

💡 *O que o assistente pode fazer:*
📅 Agendar consultas
⏰ Verificar horários disponíveis  
📞 Cancelar ou reagendar
ℹ️ Tirar dúvidas sobre nossos serviços

*É rápido, fácil e disponível 24h!*

💙 Estética • Fisioterapia • Pilates
_Equipe Clínica Espaço Saúde_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Link do Assistente Virtual</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Compartilhe este link com seus clientes para que eles possam agendar consultas diretamente com nosso assistente IA.
        </p>
        
        <div className="bg-white rounded-lg p-3 border mb-4">
          <code className="text-sm text-gray-800 break-all">{chatUrl}</code>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Link
          </Button>
          <Button onClick={sendWhatsAppMessage} className="flex-1 bg-green-600 hover:bg-green-700">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar no WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Badge variant="outline" className="flex items-center justify-center gap-2 py-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Login automático
        </Badge>
        <Badge variant="outline" className="flex items-center justify-center gap-2 py-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Cadastro automático
        </Badge>
        <Badge variant="outline" className="flex items-center justify-center gap-2 py-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          IA inteligente
        </Badge>
      </div>
    </div>
  );
}
