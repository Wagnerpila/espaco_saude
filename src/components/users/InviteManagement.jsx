import React, { useState, useEffect } from "react";
import { InviteLink } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { sendInviteEmail } from "@/functions/sendInviteEmail";
import { 
  Mail, Plus, Copy, RefreshCw, Clock, CheckCircle, XCircle, 
  UserCheck, User, Send, Trash2
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const roleLabels = { patient: "Paciente", professional: "Profissional" };
const roleColors = { patient: "bg-green-100 text-green-800", professional: "bg-blue-100 text-blue-800" };

export default function InviteManagement({ currentUser }) {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", role: "patient", expireHours: "48", notes: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => { loadInvites(); }, []);

  const loadInvites = async () => {
    setIsLoading(true);
    const data = await InviteLink.list("-created_date");
    setInvites(data);
    setIsLoading(false);
  };

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSending(true);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + parseInt(form.expireHours) * 60 * 60 * 1000).toISOString();

    const invite = await InviteLink.create({
      email: form.email,
      role: form.role,
      token,
      expires_at: expiresAt,
      used: false,
      created_by: currentUser?.email,
      notes: form.notes
    });

    // Send invite email
    await sendInviteEmail({
      email: form.email,
      role: form.role,
      token,
      expiresAt,
      inviterName: currentUser?.full_name
    });

    toast.success(`Convite enviado para ${form.email}!`);
    setForm({ email: "", role: "patient", expireHours: "48", notes: "" });
    setShowForm(false);
    loadInvites();
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este convite?")) return;
    await InviteLink.delete(id);
    toast.success("Convite removido.");
    loadInvites();
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const isExpired = (expiresAt) => !isAfter(new Date(expiresAt), new Date());

  const getStatus = (invite) => {
    if (invite.used) return { label: "Usado", color: "bg-gray-100 text-gray-600", icon: CheckCircle };
    if (isExpired(invite.expires_at)) return { label: "Expirado", color: "bg-red-100 text-red-700", icon: XCircle };
    return { label: "Ativo", color: "bg-green-100 text-green-700", icon: Clock };
  };

  const activeCount = invites.filter(i => !i.used && !isExpired(i.expires_at)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Links de Convite</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{activeCount} convite(s) ativo(s)</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Convite
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-2 border-purple-200 dark:border-purple-800 dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600" />
              Enviar Convite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email do convidado *</Label>
                  <Input
                    type="email"
                    required
                    className="mt-1"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo de usuário *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">👤 Paciente</SelectItem>
                      <SelectItem value="professional">🧑‍⚕️ Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Validade</Label>
                  <Select value={form.expireHours} onValueChange={v => setForm({ ...form, expireHours: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                      <SelectItem value="168">7 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    className="mt-1"
                    placeholder="Opcional..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              {form.role === 'professional' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                  ⚠️ Profissionais precisarão de aprovação do administrador após o cadastro.
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={sending} className="bg-purple-600 hover:bg-purple-700">
                  {sending ? "Enviando..." : <><Send className="w-4 h-4 mr-2" /> Enviar Convite</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : invites.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhum convite enviado ainda</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {invites.map(invite => {
                const status = getStatus(invite);
                const StatusIcon = status.icon;
                return (
                  <div key={invite.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {invite.role === 'professional' ? <UserCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{invite.email}</span>
                          <Badge className={roleColors[invite.role]}>{roleLabels[invite.role]}</Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Criado em {format(new Date(invite.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {" · "}Expira em {format(new Date(invite.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!invite.used && !isExpired(invite.expires_at) && (
                        <Button variant="outline" size="sm" onClick={() => copyLink(invite.token)} title="Copiar link">
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(invite.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}