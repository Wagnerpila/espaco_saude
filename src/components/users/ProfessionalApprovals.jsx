import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Professional } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { notifyProfessionalStatus } from "@/functions/notifyProfessionalStatus";
import { CheckCircle, XCircle, Clock, UserCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const { ProfessionalRequest, UserPermission } = base44.entities;

const statusConfig = {
  pending:  { label: "Pendente",  color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Aprovado",  color: "bg-green-100 text-green-800",  icon: CheckCircle },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800",      icon: XCircle }
};

export default function ProfessionalApprovals({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await ProfessionalRequest.list("-created_date");
    setRequests(data);
    setIsLoading(false);
  };

  const handleApprove = async (request) => {
    setProcessing(request.id);
    
    // Update request
    await ProfessionalRequest.update(request.id, {
      status: "approved",
      reviewed_by: currentUser?.email,
      reviewed_at: new Date().toISOString()
    });

    // Activate professional
    await Professional.update(request.professional_id, { active: true });

    // Update/create permissions
    const perms = await UserPermission.filter({ user_email: request.professional_email });
    const permData = {
      user_email: request.professional_email,
      user_name: request.professional_name,
      user_role: "professional",
      is_admin: false,
      active: true,
      permissions: {
        dashboard: false, schedule: true, patients: false, financial: false,
        medical_records: true, professionals: false, admin_panel: false,
        user_management: false, chat_assistant: true, my_patients: true,
        professional_financial: true
      }
    };
    if (perms.length > 0) {
      await UserPermission.update(perms[0].id, permData);
    } else {
      await UserPermission.create(permData);
    }

    // Notify by email
    await notifyProfessionalStatus({
      email: request.professional_email,
      name: request.professional_name,
      status: "approved"
    });

    toast.success(`${request.professional_name} aprovado(a) com sucesso!`);
    setProcessing(null);
    loadRequests();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);

    await ProfessionalRequest.update(rejectModal.id, {
      status: "rejected",
      reviewed_by: currentUser?.email,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectReason
    });

    await Professional.update(rejectModal.professional_id, { active: false });

    await notifyProfessionalStatus({
      email: rejectModal.professional_email,
      name: rejectModal.professional_name,
      status: "rejected",
      rejectionReason: rejectReason
    });

    toast.success("Solicitação rejeitada.");
    setRejectModal(null);
    setRejectReason("");
    setProcessing(null);
    loadRequests();
  };

  const filtered = requests.filter(r => filter === "all" || r.status === filter);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Aprovação de Profissionais
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">{pendingCount} pendente(s)</Badge>
            )}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie as solicitações de acesso</p>
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "all"].map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
            </Button>
          ))}
        </div>
      </div>

      {/* Alert for pending */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
            <strong>{pendingCount} profissional(is)</strong> aguardando aprovação de acesso ao sistema.
          </p>
        </div>
      )}

      {/* List */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {filtered.map(request => {
                const cfg = statusConfig[request.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                          {request.professional_name?.[0] || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-white">{request.professional_name}</span>
                            <Badge className={cfg.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{request.professional_email}</p>
                          {request.specialty && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">🏥 {request.specialty}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Solicitado em {format(new Date(request.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {request.reviewed_at && (
                            <p className="text-xs text-gray-400">
                              Revisado por {request.reviewed_by} em {format(new Date(request.reviewed_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                          {request.rejection_reason && (
                            <p className="text-xs text-red-500 mt-0.5">Motivo: {request.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={processing === request.id}
                            onClick={() => handleApprove(request)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {processing === request.id ? "Aprovando..." : "Aprovar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-400 text-red-600 hover:bg-red-50"
                            disabled={processing === request.id}
                            onClick={() => { setRejectModal(request); setRejectReason(""); }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-red-600">Rejeitar Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Você está rejeitando o acesso de <strong>{rejectModal.professional_name}</strong>. Um email será enviado informando a decisão.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Motivo (opcional)</label>
                <Input
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ex: Documentação incompleta..."
                  className="dark:bg-gray-800"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 flex-1" disabled={!!processing}>
                  {processing ? "Rejeitando..." : "Confirmar Rejeição"}
                </Button>
                <Button variant="outline" onClick={() => setRejectModal(null)} className="flex-1">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}