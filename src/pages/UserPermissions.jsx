import React, { useState, useEffect } from "react";
import { UserPermission, Patient, Professional } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Users,
  Search,
  Save,
  Settings,
  UserCheck,
  Lock,
  Unlock,
  Crown
} from "lucide-react";
import { motion } from "framer-motion";

const moduleLabels = {
  dashboard: "Dashboard",
  schedule: "Agenda",
  patients: "Gestão de Pacientes",
  financial: "Financeiro",
  medical_records: "Prontuários",
  professionals: "Gestão de Profissionais",
  package_services: "Atend. e Serviços",
  commissions: "Comissionamento",
  clinical_registration: "Cadastros Clínicos",
  admin_panel: "Painel Admin",
  user_management: "Gerenciar Usuários",
  chat_assistant: "Assistente IA",
  whatsapp_sofia: "WhatsApp Sofia",
  my_patients: "Meus Pacientes",
  professional_financial: "Financeiro Profissional"
};

const defaultPermissions = {
  admin: {
    dashboard: true,
    schedule: true,
    patients: true,
    financial: true,
    medical_records: true,
    professionals: true,
    package_services: true,
    commissions: true,
    clinical_registration: true,
    admin_panel: true,
    user_management: true,
    chat_assistant: true,
    whatsapp_sofia: true,
    my_patients: true,
    professional_financial: true
  },
  professional: {
    dashboard: false,
    schedule: true,
    patients: false,
    financial: false,
    medical_records: true,
    professionals: false,
    package_services: false,
    commissions: false,
    clinical_registration: false,
    admin_panel: false,
    user_management: false,
    chat_assistant: true,
    whatsapp_sofia: false,
    my_patients: true,
    professional_financial: true
  },
  patient: {
    dashboard: false,
    schedule: false,
    patients: false,
    financial: false,
    medical_records: false,
    professionals: false,
    package_services: false,
    commissions: false,
    clinical_registration: false,
    admin_panel: false,
    user_management: false,
    chat_assistant: true,
    whatsapp_sofia: false,
    my_patients: false,
    professional_financial: false
  }
};

export default function UserPermissionsPage() {
  const [userPermissions, setUserPermissions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState(null); // Changed to store only email
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get selected user object
  const selectedUser = selectedUserEmail ? allUsers.find(u => u.user_email === selectedUserEmail) : null;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filterUsers = () => {
      if (!searchTerm) {
        setFilteredUsers(allUsers);
        return;
      }

      const filtered = allUsers.filter(user =>
        user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    };

    filterUsers();
  }, [allUsers, searchTerm]);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Get existing permissions
      const permissions = await UserPermission.list();
      setUserPermissions(permissions);

      // Get all users from different entities
      const [patients, professionals] = await Promise.all([
        Patient.list(),
        Professional.list()
      ]);

      const users = [];

      // Add professionals
      professionals.forEach(prof => {
        const existingPermission = permissions.find(p => p.user_email === prof.email);
        const isUserAdmin = existingPermission?.is_admin || false;
        const baseRole = 'professional';
        const effectiveRole = isUserAdmin ? 'admin' : baseRole;

        users.push({
          user_email: prof.email,
          user_name: prof.full_name,
          base_role: baseRole, // Store the underlying role
          user_role: effectiveRole, // The current effective role for permissions lookup
          phone: prof.phone,
          specialty: prof.specialty,
          permissions: existingPermission?.permissions || defaultPermissions[effectiveRole],
          is_admin: isUserAdmin,
          permission_id: existingPermission?.id
        });
      });

      // Add patients with email
      patients.filter(p => p.email).forEach(patient => {
        const existingPermission = permissions.find(p => p.user_email === patient.email);
        const isUserAdmin = existingPermission?.is_admin || false;
        const baseRole = 'patient';
        const effectiveRole = isUserAdmin ? 'admin' : baseRole;

        users.push({
          user_email: patient.email,
          user_name: patient.full_name,
          base_role: baseRole, // Store the underlying role
          user_role: effectiveRole, // The current effective role for permissions lookup
          phone: patient.phone,
          permissions: existingPermission?.permissions || defaultPermissions[effectiveRole],
          is_admin: isUserAdmin,
          permission_id: existingPermission?.id
        });
      });

      // Add current admin if they are not already in the list (e.g., an admin account not tied to patient/professional entity)
      const adminPermission = permissions.find(p => p.user_email === user.email);
      if (!users.find(u => u.user_email === user.email)) {
        const baseRole = adminPermission?.user_role || 'professional'; // If current user is an admin without a specific base role, default to professional for permission structure
        users.push({
          user_email: user.email,
          user_name: user.full_name,
          base_role: baseRole,
          user_role: 'admin', // Current effective role for the logged-in admin
          permissions: adminPermission?.permissions || defaultPermissions.admin,
          is_admin: true,
          permission_id: adminPermission?.id
        });
      } else {
        // If current user is already in the list (e.g., as a professional who is also admin),
        // ensure their `is_admin` and `user_role` are correctly set to 'admin'.
        const userIndex = users.findIndex(u => u.user_email === user.email);
        if (userIndex !== -1) {
          const existingUser = users[userIndex];
          if (!existingUser.is_admin) {
            users[userIndex] = {
              ...existingUser,
              is_admin: true,
              user_role: 'admin',
              permissions: adminPermission?.permissions || defaultPermissions.admin // Re-apply default admin permissions if they just became admin
            };
          }
        }
      }

      setAllUsers(users.sort((a, b) => a.user_name.localeCompare(b.user_name)));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const handlePermissionChange = (userEmail, module, value) => {
    const updatedUsers = allUsers.map(u => {
      if (u.user_email === userEmail) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [module]: value
          }
        };
      }
      return u;
    });
    setAllUsers(updatedUsers);
  };

  const handleAdminToggle = (userEmail, value) => {
    const updatedUsers = allUsers.map(u => {
      if (u.user_email === userEmail) {
        // Determine the base role. If base_role is not set, or if user_role is admin,
        // fall back to professional (as admins often start as professional).
        const baseRole = u.base_role || (u.user_role === 'admin' ? 'professional' : u.user_role);
        const newEffectiveRole = value ? 'admin' : baseRole;

        return {
          ...u,
          is_admin: value,
          user_role: newEffectiveRole,
          // Apply default permissions for the new effective role
          permissions: value ? defaultPermissions.admin : defaultPermissions[baseRole]
        };
      }
      return u;
    });
    setAllUsers(updatedUsers);
  };

  const savePermissions = async (user) => {
    setIsSaving(true);
    try {
      // When saving, `user_role` should represent the *base* role, not the effective 'admin' role.
      // `is_admin` is the separate flag.
      const baseRole = user.base_role || (user.user_role === 'admin' ? 'professional' : user.user_role);
      const permissionData = {
        user_email: user.user_email,
        user_name: user.user_name,
        user_role: baseRole, // Save the base role to DB
        permissions: user.permissions, // Save the current permissions from state
        is_admin: user.is_admin,
        active: true
      };

      if (user.permission_id) {
        await UserPermission.update(user.permission_id, permissionData);
      } else {
        const created = await UserPermission.create(permissionData);
        // Update the user with the new permission ID
        const updatedUsers = allUsers.map(u =>
          u.user_email === user.user_email
            ? { ...u, permission_id: created.id }
            : u
        );
        setAllUsers(updatedUsers);
      }

      alert('Permissões salvas com sucesso!');
      loadData(); // Reload to ensure consistency and correct permission states
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      alert('Erro ao salvar permissões');
    }
    setIsSaving(false);
  };

  const getUserTypeColor = (role, isAdmin) => {
    if (isAdmin) return 'bg-red-100 text-red-800';
    switch (role) {
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'patient': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeIcon = (role, isAdmin) => {
    if (isAdmin) return Crown;
    switch (role) {
      case 'professional': return UserCheck;
      case 'patient': return Users;
      default: return Users;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid md:grid-cols-2 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Permissões de Usuários</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerencie o acesso de cada usuário aos módulos do sistema</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista de Usuários */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuários do Sistema
                </CardTitle>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-auto">
                  {filteredUsers.map((user) => {
                    const TypeIcon = getUserTypeIcon(user.base_role || user.user_role, user.is_admin);
                    const isSelected = selectedUserEmail === user.user_email;
                    
                    return (
                      <div
                        key={user.user_email}
                        onClick={() => setSelectedUserEmail(user.user_email)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.user_name?.[0] || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                {user.user_name}
                              </p>
                              <Badge className={`${getUserTypeColor(user.base_role || user.user_role, user.is_admin)} text-xs`}>
                                <TypeIcon className="w-3 h-3 mr-1" />
                                {user.is_admin ? 'Admin' : user.base_role === 'professional' || user.user_role === 'professional' ? 'Prof' : 'Pac'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.user_email}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes e Permissões */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={selectedUser.user_email}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {selectedUser.user_name?.[0] || 'U'}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl">{selectedUser.user_name}</CardTitle>
                          <p className="text-gray-600">{selectedUser.user_email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getUserTypeColor(selectedUser.base_role || selectedUser.user_role, selectedUser.is_admin)}>
                              {selectedUser.is_admin ? 'Administrador' : 
                               (selectedUser.base_role === 'professional' || selectedUser.user_role === 'professional') ? 'Profissional' : 'Paciente'}
                            </Badge>
                            {selectedUser.specialty && (
                              <span className="text-sm text-gray-500">• {selectedUser.specialty}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => savePermissions(selectedUser)}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Admin Toggle */}
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <Crown className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-900">Privilégios de Administrador</p>
                          <p className="text-sm text-red-600">Concede acesso total ao sistema</p>
                        </div>
                      </div>
                      <Switch
                        checked={selectedUser.is_admin}
                        onCheckedChange={(value) => handleAdminToggle(selectedUser.user_email, value)}
                        disabled={selectedUser.user_email === currentUser?.email} // Can't remove own admin status
                      />
                    </div>

                    {/* Permissions Grid */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Permissões Específicas
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {Object.entries(moduleLabels).map(([module, label]) => (
                          <div key={module} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              {selectedUser.permissions[module] ? (
                                <Unlock className="w-4 h-4 text-green-500" />
                              ) : (
                                <Lock className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                            </div>
                            <Switch
                             checked={selectedUser.is_admin ? true : (selectedUser.permissions[module] || false)}
                             onCheckedChange={(value) => handlePermissionChange(selectedUser.user_email, module, value)}
                             disabled={selectedUser.is_admin}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedUser.is_admin && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Nota:</strong> Administradores têm acesso total ao sistema. 
                          As permissões específicas são gerenciadas automaticamente.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecione um Usuário
                  </h3>
                  <p className="text-gray-500">
                    Escolha um usuário da lista para gerenciar suas permissões
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}