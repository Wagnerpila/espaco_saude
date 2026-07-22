
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bot, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Phone,
  CheckCircle,
  Users,
  Sparkles
} from "lucide-react";
import AgentChat from "../components/chat/AgentChat";
import PublicChatLink from "../components/chat/PublicChatLink";

export default function ChatAssistantPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const features = [
    {
      icon: Calendar,
      title: "Agendar Consultas",
      description: "Marque suas consultas de forma rápida e prática",
      color: "bg-blue-500"
    },
    {
      icon: Clock,
      title: "Verificar Horários",
      description: "Consulte disponibilidade de profissionais",
      color: "bg-green-500"
    },
    {
      icon: Phone,
      title: "Cancelar Agendamentos",
      description: "Cancele ou reagende suas consultas",
      color: "bg-orange-500"
    },
    {
      icon: CheckCircle,
      title: "Confirmar Consultas",
      description: "Confirme sua presença nos agendamentos",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assistente Virtual</h1>
              <p className="text-gray-600">Espaço Saúde</p>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Converse com nosso assistente inteligente para gerenciar seus agendamentos, 
            consultar horários disponíveis e obter informações sobre nossos serviços.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Link para Compartilhar com Clientes
          </h2>
          <PublicChatLink />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${feature.color} bg-opacity-20`}>
                    <feature.icon className={`w-6 h-6 ${feature.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h2 className="font-bold text-xl">Pronto para começar?</h2>
            </div>
            <p className="mb-6 opacity-90">
              Clique no botão abaixo para iniciar uma conversa com nosso assistente virtual. 
              Ele pode ajudar você com agendamentos, informações e muito mais!
            </p>
            <Button 
              size="lg"
              onClick={() => setIsChatOpen(true)}
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Iniciar Conversa
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Como funciona?</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Converse naturalmente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span>Gerencie agendamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  <span>Receba confirmações</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AgentChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
}
