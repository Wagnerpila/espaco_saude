
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Bot, 
  Loader2,
  Calendar,
  Phone,
  Clock,
  Sparkles
} from "lucide-react";
import { agentSDK } from "@/agents";
import { User as UserEntity } from "@/entities/User";
import MessageBubble from "../components/chat/MessageBubble";

export default function PublicChatPage() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        let user = null;
        let patient = null;
        
        try {
          user = await UserEntity.me();
          
          if (user) {
            const { Patient } = await import("@/entities/all");
            const patients = await Patient.list();
            patient = patients.find(p => p.email === user.email);
          }
        } catch (error) {
          console.log("Usuário não logado ou erro ao buscar dados:", error);
        }
        
        setCurrentUser(user);
        setPatientData(patient);

        const conversationMetadata = {
          name: user ? `Chat Público - ${user.full_name}` : "Chat Público - Visitante",
          description: "Conversa pública sobre agendamentos",
          source: "public_chat" // Keep existing source
        };

        if (user) {
          conversationMetadata.user_id = user.id;
          conversationMetadata.user_email = user.email;
        }

        if (patient) {
          conversationMetadata.patient_id = patient.id;
          conversationMetadata.patient_name = patient.full_name;
        }

        const newConversation = await agentSDK.createConversation({
          agent_name: "appointment_manager",
          metadata: conversationMetadata
        });

        setConversation(newConversation);
        setMessages(newConversation.messages || []);

        const unsubscribe = agentSDK.subscribeToConversation(newConversation.id, (data) => {
          setMessages(data.messages);
        });

        if (!newConversation.messages || newConversation.messages.length === 0) {
          let welcomeMessage;
          
          if (patient) {
            welcomeMessage = {
              role: "user",
              content: `Olá! Sou ${patient.full_name}, paciente já cadastrado no sistema (ID: ${patient.id}). Meu email é ${user.email} e telefone ${patient.phone || 'não informado'}. Gostaria de informações sobre agendamentos no Espaço Saúde.`
            };
          } else if (user) {  
            welcomeMessage = {
              role: "user",
              content: `Olá! Sou ${user.full_name}, meu email é ${user.email}. Gostaria de informações sobre agendamentos no Espaço Saúde. Preciso verificar se já estou cadastrado como paciente.`
            };
          } else {
            welcomeMessage = {
              role: "user",
              content: "Olá! Gostaria de informações sobre agendamentos no Espaço Saúde. Como posso marcar uma consulta?"
            };
          }

          await agentSDK.addMessage(newConversation, welcomeMessage);
        }

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error("Erro ao inicializar chat:", error);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversation || isLoading) return;

    setIsLoading(true);
    try {
      const userMessage = {
        role: "user",
        content: inputMessage.trim()
      };

      await agentSDK.addMessage(conversation, userMessage);
      setInputMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="h-[calc(100vh-2rem)] flex flex-col">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Assistente Espaço Saúde</CardTitle>
                  <p className="text-sm text-gray-600">Agendamentos e Informações</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  Olá, {currentUser?.full_name || 'Visitante'}!
                </p>
                <p className="text-xs text-gray-500">
                  💙 Estética • Fisioterapia • Pilates
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Olá! Como posso ajudar você hoje?
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Sou seu assistente virtual especializado em agendamentos médicos
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-md mx-auto">
                      <Badge variant="outline" className="flex items-center justify-center gap-2 py-3 px-4">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Agendar</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center justify-center gap-2 py-3 px-4">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Consultar</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center justify-center gap-2 py-3 px-4">
                        <Phone className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Cancelar</span>
                      </Badge>
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">Digitando...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-4 bg-white">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Digite sua mensagem e pressione Enter para enviar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
