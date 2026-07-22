import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, RotateCcw, Search, Phone, Clock, User,
  TrendingUp, CheckCircle, AlertCircle, BarChart2, Trash2, RefreshCw
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STEP_LABELS = {
  MENU: "Menu inicial",
  AGUARDA_MENU: "Aguardando escolha",
  AGUARDA_PROFISSIONAL: "Escolhendo profissional",
  AGUARDA_DATA: "Escolhendo data",
  AGUARDA_HORARIO: "Escolhendo horário",
  CONFIRMA_PACIENTE: "Confirmando paciente",
  CADASTRO_NOME: "Cadastro - Nome",
  CADASTRO_CPF: "Cadastro - CPF",
  CONFIRMA_AGENDAMENTO: "Confirmando agendamento",
  AGUARDA_CANCELAR: "Cancelando consulta",
  CANCELAR_CPF: "Cancelamento - CPF",
};

function getStepBadge(step) {
  const completed = ["MENU"];
  const warning = ["AGUARDA_MENU"];
  const active = Object.keys(STEP_LABELS).filter(s => !completed.includes(s) && !warning.includes(s));
  if (!step || completed.includes(step)) return <Badge className="bg-gray-100 text-gray-600">Inativo</Badge>;
  if (warning.includes(step)) return <Badge className="bg-yellow-100 text-yellow-700">Aguardando</Badge>;
  return <Badge className="bg-blue-100 text-blue-700">{STEP_LABELS[step] || step}</Badge>;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function formatPhone(phone) {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

// ── Componente de chat de mensagens ──────────────────────────
function ConversationChat({ conversation }) {
  const messages = conversation?.messages || [];
  const endRef = React.useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  if (messages.length === 0) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem mensagens registradas.</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-96 bg-[#e5ddd5] rounded-lg">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${
            m.role === "user"
              ? "bg-[#dcf8c6] text-gray-800 rounded-br-none"
              : "bg-white text-gray-800 rounded-bl-none"
          }`}>
            {m.content}
            {m.timestamp && (
              <div className="text-[10px] text-gray-400 mt-1 text-right">
                {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

// ── Relatórios ───────────────────────────────────────────────
function ReportsTab({ conversations }) {
  const total = conversations.length;
  const withMessages = conversations.filter(c => (c.messages || []).length > 0);
  const completed = conversations.filter(c => c.state?.step === "MENU" && (c.messages || []).length > 2);
  const stuck = conversations.filter(c => {
    if (!c.last_active) return false;
    const diff = Date.now() - new Date(c.last_active).getTime();
    return diff > 2 * 60 * 60 * 1000 && c.state?.step && c.state.step !== "MENU";
  });

  const stepCounts = {};
  conversations.forEach(c => {
    const s = c.state?.step || "MENU";
    stepCounts[s] = (stepCounts[s] || 0) + 1;
  });

  const avgMessages = withMessages.length > 0
    ? (withMessages.reduce((a, c) => a + (c.messages || []).length, 0) / withMessages.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de conversas", value: total, icon: MessageCircle, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Fluxos concluídos", value: completed.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Conversas travadas", value: stuck.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Média de mensagens", value: avgMessages, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribuição por etapa */}
      <Card>
        <CardHeader><CardTitle className="text-base">Distribuição por etapa do fluxo</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stepCounts).sort((a, b) => b[1] - a[1]).map(([step, count]) => (
              <div key={step} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-48 truncate">{STEP_LABELS[step] || step}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversas travadas */}
      {stuck.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base text-red-700">⚠️ Conversas travadas há mais de 2h</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stuck.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{formatPhone(c.phone)}</p>
                    <p className="text-xs text-gray-500">{STEP_LABELS[c.state?.step] || c.state?.step} · {timeAgo(c.last_active)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function WhatsAppConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.WhatsAppConversation.list("-last_active", 200);
    setConversations(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = conversations.filter(c =>
    !search ||
    c.phone?.includes(search.replace(/\D/g, "")) ||
    (c.messages || []).some(m => m.content?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    await base44.entities.WhatsAppConversation.update(resetTarget.id, {
      state: { step: "MENU" },
      draft: {},
      last_active: new Date().toISOString()
    });
    setResetting(false);
    setResetTarget(null);
    if (selected?.id === resetTarget.id) {
      setSelected(prev => ({ ...prev, state: { step: "MENU" }, draft: {} }));
    }
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.WhatsAppConversation.delete(deleteTarget.id);
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) setSelected(null);
    load();
  };

  const handleResetAttendantMode = async (conv) => {
    const updatedState = { ...conv.state };
    delete updatedState.attendant_mode_until;
    
    await base44.entities.WhatsAppConversation.update(conv.id, { state: updatedState });
    
    if (selected?.id === conv.id) {
      setSelected(prev => ({ ...prev, state: updatedState }));
    }
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conversas WhatsApp</h1>
              <p className="text-sm text-gray-500">Gerenciamento e histórico de atendimentos via Sofia</p>
            </div>
          </div>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        <Tabs defaultValue="conversations">
          <TabsList>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          {/* ABA CONVERSAS */}
          <TabsContent value="conversations" className="mt-4">
            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-220px)]">
              {/* Lista */}
              <div className="w-full md:w-80 flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por telefone..."
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">Nenhuma conversa encontrada</div>
                  ) : filtered.map(conv => {
                    const isExpired = conv.last_active &&
                      Date.now() - new Date(conv.last_active).getTime() > 2 * 60 * 60 * 1000 &&
                      conv.state?.step && conv.state.step !== "MENU";
                    const isSelected = selected?.id === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelected(conv)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 bg-white dark:bg-gray-900 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Phone className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{formatPhone(conv.phone)}</p>
                              <p className="text-xs text-gray-400">{timeAgo(conv.last_active)}</p>
                            </div>
                          </div>
                          {isExpired && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                        </div>
                        <div className="mt-2">{getStepBadge(conv.state?.step)}</div>
                        {conv.messages?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {conv.messages[conv.messages.length - 1]?.content?.slice(0, 50)}...
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center">{filtered.length} conversa(s)</p>
              </div>

              {/* Detalhe */}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                {!selected ? (
                  <Card className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Selecione uma conversa</p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Info header */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white">{formatPhone(selected.phone)}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStepBadge(selected.state?.step)}
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {timeAgo(selected.last_active)}
                                </span>
                                <span className="text-xs text-gray-400">{selected.messages?.length || 0} mensagens</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {selected.state?.attendant_mode_until && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                                onClick={() => handleResetAttendantMode(selected)}
                              >
                                <RotateCcw className="w-4 h-4" /> Liberar Sofia
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                              onClick={() => setResetTarget(selected)}
                            >
                              <RotateCcw className="w-4 h-4" /> Resetar conversa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTarget(selected)}
                            >
                              <Trash2 className="w-4 h-4" /> Excluir
                            </Button>
                          </div>
                        </div>

                        {/* Draft info */}
                        {selected.draft && Object.keys(selected.draft).length > 0 && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                            <p className="font-medium mb-1">Dados em progresso:</p>
                            {selected.draft.professional_name && <p>👨‍⚕️ {selected.draft.professional_name}</p>}
                            {selected.draft.date && <p>📅 {selected.draft.date}</p>}
                            {selected.draft.time && <p>⏰ {selected.draft.time}</p>}
                            {selected.draft.patient_name && <p>👤 {selected.draft.patient_name}</p>}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Chat */}
                    <Card className="flex-1 overflow-hidden">
                      <CardHeader className="py-3 px-4 border-b">
                        <CardTitle className="text-sm text-gray-600">Histórico da conversa</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <ConversationChat conversation={selected} />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ABA RELATÓRIOS */}
          <TabsContent value="reports" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ReportsTab conversations={conversations} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Reset */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar conversa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            A conversa de <strong>{formatPhone(resetTarget?.phone)}</strong> será reiniciada do início.
            O histórico de mensagens será mantido, mas o estado do fluxo será resetado.
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              onClick={handleReset}
              disabled={resetting}
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? "Resetando..." : "Confirmar reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conversa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir permanentemente o histórico de <strong>{formatPhone(deleteTarget?.phone)}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}