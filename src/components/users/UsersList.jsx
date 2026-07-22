import React, { useState } from "react";
import { Patient, Professional } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Shield, UserCheck, User as UserIcon,
  Mail, Calendar, Trash2, Edit, CheckCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const roleConfig = {
  admin:        { label: "Administrador", color: "bg-red-100 text-red-800",    icon: Shield },
  professional: { label: "Profissional",  color: "bg-blue-100 text-blue-800",  icon: UserCheck },
  patient:      { label: "Paciente",      color: "bg-green-100 text-green-800", icon: UserIcon }
};

export default function UsersList({ users, patients, professionals, currentUser, onReload }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = users.filter(u => {
    const matchSearch = !searchTerm ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (user) => {
    setEditModal(user);
    setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || "", specialty: user.specialty || "" });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editModal.role === "patient") {
      const p = patients.find(x => x.id === editModal.id);
      if (p) await Patient.update(p.id, { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone });
    } else if (editModal.role === "professional") {
      const p = professionals.find(x => x.id === editModal.id);
      if (p) await Professional.update(p.id, { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialty: editForm.specialty });
    }
    toast.success("Usuário atualizado!");
    setEditModal(null);
    setSaving(false);
    onReload();
  };

  const handleDelete = async (user) => {
    if (user.email === currentUser?.email) { toast.error("Não pode excluir seu próprio usuário."); return; }
    if (!confirm(`Excluir ${user.full_name}?`)) return;
    if (user.role === "patient") {
      const p = patients.find(x => x.id === user.id);
      if (p) await Patient.delete(p.id);
    } else if (user.role === "professional") {
      const p = professionals.find(x => x.id === user.id);
      if (p) await Professional.delete(p.id);
    } else {
      toast.error("Não é possível excluir administradores aqui."); return;
    }
    toast.success("Usuário excluído.");
    onReload();
  };

  const toggleActive = async (user) => {
    if (user.role === "patient") {
      const p = patients.find(x => x.id === user.id);
      if (p) await Patient.update(p.id, { active: !p.active });
    } else if (user.role === "professional") {
      const p = professionals.find(x => x.id === user.id);
      if (p) await Professional.update(p.id, { active: !p.active });
    }
    toast.success("Status atualizado.");
    onReload();
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    professionals: users.filter(u => u.role === "professional").length,
    patients: users.filter(u => u.role === "patient").length,
    active: users.filter(u => u.active !== false).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "from-blue-500 to-blue-600" },
          { label: "Admins", value: stats.admins, color: "from-red-500 to-red-600" },
          { label: "Profissionais", value: stats.professionals, color: "from-purple-500 to-purple-600" },
          { label: "Pacientes", value: stats.patients, color: "from-green-500 to-green-600" },
          { label: "Ativos", value: stats.active, color: "from-orange-500 to-orange-600" }
        ].map(s => (
          <Card key={s.label} className={`bg-gradient-to-r ${s.color} text-white border-0`}>
            <CardContent className="p-4 text-center">
              <p className="text-white/80 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div className="flex gap-2">
              {["all", "admin", "professional", "patient"].map(r => (
                <Button
                  key={r}
                  variant={roleFilter === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRoleFilter(r)}
                  className={roleFilter === r ? "bg-purple-600 hover:bg-purple-700" : "dark:border-gray-600 dark:text-gray-300"}
                >
                  {r === "all" ? "Todos" : r === "admin" ? "Admins" : r === "professional" ? "Profissionais" : "Pacientes"}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{filtered.length} usuário(s) encontrado(s)</p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-0">
          <div className="divide-y dark:divide-gray-700">
            {filtered.map(user => {
              const cfg = roleConfig[user.role] || roleConfig.patient;
              const RoleIcon = cfg.icon;
              const isMe = user.email === currentUser?.email;
              const isActive = user.active !== false;
              return (
                <div key={`${user.role}-${user.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${isActive ? "bg-gradient-to-r from-blue-500 to-purple-600" : "bg-gray-400"}`}>
                      {user.full_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white">{user.full_name}</span>
                        <Badge className={cfg.color}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                        <Badge className={isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        {isMe && <Badge className="bg-yellow-100 text-yellow-800">Você</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                        {user.created_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(user.created_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {user.specialty && <span className="text-blue-500">• {user.specialty}</span>}
                        {user.phone && <span>• {user.phone}</span>}
                      </div>
                    </div>
                  </div>
                  {!isMe && user.role !== "admin" && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(user)} title={isActive ? "Desativar" : "Ativar"}>
                        {isActive ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(user)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Editar {roleConfig[editModal.role]?.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Nome Completo *</label>
                  <Input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} required className="dark:bg-gray-800" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email *</label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required className="dark:bg-gray-800" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Telefone</label>
                  <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="dark:bg-gray-800" />
                </div>
                {editModal.role === "professional" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Especialidade</label>
                    <Input value={editForm.specialty} onChange={e => setEditForm({...editForm, specialty: e.target.value})} className="dark:bg-gray-800" />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditModal(null)} className="flex-1">Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}