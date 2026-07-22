import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Professional } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const { ProfessionalRequest } = base44.entities;

export default function RegisterProfile() {
  const [user, setUser] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    specialty: "",
    phone: "",
    crefito: ""
  });

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();

      // Admin users should never be stuck here — send them to the app
      if (me.role === 'admin') {
        window.location.href = '/';
        return;
      }

      // Also check UserPermission is_admin flag
      try {
        const perms = await base44.entities.UserPermission.filter({ user_email: me.email });
        if (perms.length > 0 && perms[0].is_admin) {
          window.location.href = '/';
          return;
        }
      } catch (_) {}

      setUser(me);
      setForm(f => ({ ...f, full_name: me.full_name || "" }));

      // Check if already submitted a request
      const requests = await ProfessionalRequest.filter({ professional_email: me.email });
      if (requests.length > 0) {
        setExistingRequest(requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.specialty.trim()) {
      toast.error("Nome e especialidade são obrigatórios.");
      return;
    }
    setIsSaving(true);

    // Create professional record (inactive until approved)
    const professional = await Professional.create({
      full_name: form.full_name,
      specialty: form.specialty,
      phone: form.phone,
      crefito: form.crefito,
      email: user.email,
      user_id: user.id,
      active: false
    });

    // Create approval request
    await ProfessionalRequest.create({
      professional_id: professional.id,
      professional_name: form.full_name,
      professional_email: user.email,
      specialty: form.specialty,
      status: "pending"
    });

    toast.success("Solicitação enviada! Aguarde a aprovação do administrador.");
    // Reload to show pending state
    const requests = await ProfessionalRequest.filter({ professional_email: user.email });
    setExistingRequest(requests[0]);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show status if already requested
  if (existingRequest) {
    const isPending = existingRequest.status === "pending";
    const isApproved = existingRequest.status === "approved";
    const isRejected = existingRequest.status === "rejected";

    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-white overflow-hidden shadow">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b73e93560562b92900ccee/37d55f318_espaosade1.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-xl">Clínica Espaço Saúde</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            {isPending && (
              <>
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Solicitação Pendente</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Seu cadastro foi enviado e está aguardando aprovação do administrador.
                  Você receberá um e-mail assim que for aprovado.
                </p>
              </>
            )}
            {isApproved && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso Aprovado!</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Seu acesso foi aprovado. Recarregue a página para acessar o sistema.
                </p>
                <Button onClick={() => { window.location.replace('/'); }} className="w-full bg-green-600 hover:bg-green-700">
                  Acessar o Sistema
                </Button>
              </>
            )}
            {isRejected && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Solicitação Rejeitada</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Sua solicitação foi rejeitada.
                  {existingRequest.rejection_reason && (
                    <span className="block mt-1 text-red-500">Motivo: {existingRequest.rejection_reason}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">Entre em contato com o administrador para mais informações.</p>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => base44.auth.logout("/")}
              className="mt-4"
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-white overflow-hidden shadow">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b73e93560562b92900ccee/37d55f318_espaosade1.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-xl">Clínica Espaço Saúde</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Complete seu cadastro para solicitar acesso</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-5">
            <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Logado como</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Nome Completo *
              </label>
              <Input
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="Dr. João da Silva"
                required
                className="dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Especialidade *
              </label>
              <Input
                value={form.specialty}
                onChange={e => setForm({ ...form, specialty: e.target.value })}
                placeholder="Ex: Fisioterapia, Pilates, Estética..."
                required
                className="dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Telefone
              </label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                CREFITO / CRM / Registro Profissional
              </label>
              <Input
                value={form.crefito}
                onChange={e => setForm({ ...form, crefito: e.target.value })}
                placeholder="Ex: CREFITO-3 12345"
                className="dark:bg-gray-800"
              />
            </div>
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
            >
              {isSaving ? "Enviando..." : "Solicitar Acesso"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-gray-500"
              onClick={() => base44.auth.logout("/")}
            >
              Cancelar e Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}