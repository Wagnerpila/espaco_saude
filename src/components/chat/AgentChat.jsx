
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
  X
} from "lucide-react";
import { agentSDK } from "@/agents";
import { User as UserEntity } from "@/entities/User";
import MessageBubble from "./MessageBubble";

export default function AgentChat({ isOpen, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientData, setPatientData] = useState(null); // Added new state variable
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const initializeChat = async () => {
        try {
          const user = await UserEntity.me();
          setCurrentUser(user);

          // Tentar encontrar dados do paciente pelo email
          const { Patient } = await import("@/entities/all");
          const patients = await Patient.list();
          const patient = patients.find(p => p.email === user.email);
          setPatientData(patient);

          // Create or get existing conversation
          const newConversation = await agentSDK.createConversation({
            agent_name: "appointment_manager",
            metadata: {
              name: `Agendamentos - ${user.full_name}`,
              description: "Conversa sobre agendamentos médicos",
              user_id: user.id,
              user_email: user.email, // Added user_email to metadata
              patient_id: patient?.id || null, // Added patient_id to metadata
              patient_name: patient?.full_name || user.full_name // Added patient_name to metadata
            }
          });

          setConversation(newConversation);
          setMessages(newConversation.messages || []);

          // Subscribe to updates
          const unsubscribe = agentSDK.subscribeToConversation(newConversation.id, (data) => {
            setMessages(data.messages);
          });

          // Send welcome message if it's a new conversation
          if (!newConversation.messages || newConversation.messages.length === 0) {
            let welcomeMessage;
            
            if (patient) {
              welcomeMessage = {
                role: "user",
                content: `Olá! Sou ${patient.full_name}, paciente cadastrado no sistema (ID: ${patient.id}). Meu email é ${user.email} e telefone ${patient.phone || 'não informado'}. Gostaria de informações sobre agendamentos no Espaço Saúde.`
              };
            } else {
              welcomeMessage = {
                role: "user", 
                content: `Olá! Sou ${user.full_name}, meu email é ${user.email}. Gostaria de informações sobre agendamentos no Espaço Saúde. Preciso verificar se já estou cadastrado no sistema como paciente.`
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
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente Espaço Saúde</CardTitle>
              <p className="text-sm text-gray-500">Agendamentos e Informações</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Olá! Como posso ajudar?
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Posso ajudar você com:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Agendar consultas
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Verificar horários
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Cancelar agendamentos
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

          <div className="border-t p-4">
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
  );
}
