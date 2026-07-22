import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Patient, Professional } from "@/entities/all";
import { Users, UserCheck, Mail, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import UsersList from "../components/users/UsersList";
import InviteManagement from "../components/users/InviteManagement";
import ProfessionalApprovals from "../components/users/ProfessionalApprovals";

const { ProfessionalRequest } = base44.entities;

const tabs = [
  { id: "users",     label: "Usuários",       icon: Users },
  { id: "invites",   label: "Convites",        icon: Mail },
  { id: "approvals", label: "Aprovações",      icon: UserCheck }
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [me, patientsData, professionalsData, requests] = await Promise.all([
      base44.auth.me(),
      Patient.list(),
      Professional.list(),
      ProfessionalRequest.filter({ status: "pending" })
    ]);

    setCurrentUser(me);
    setPatients(patientsData);
    setProfessionals(professionalsData);
    setPendingCount(requests.length);

    const allUsers = [];

    professionalsData.forEach(p => allUsers.push({
      id: p.id, full_name: p.full_name, email: p.email,
      role: "professional", specialty: p.specialty,
      phone: p.phone, created_date: p.created_date, active: p.active
    }));

    patientsData.filter(p => p.email).forEach(p => allUsers.push({
      id: p.id, full_name: p.full_name, email: p.email,
      role: "patient", phone: p.phone,
      created_date: p.created_date, active: p.active
    }));

    if (me && !allUsers.find(u => u.email === me.email)) {
      allUsers.push({
        id: me.id, full_name: me.full_name, email: me.email,
        role: "admin", created_date: me.created_date, active: true
      });
    }

    setUsers(allUsers.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)));
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Controle de acesso e permissões do sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-900 rounded-xl p-1.5 shadow-sm border dark:border-gray-700 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "approvals" && pendingCount > 0 && (
                  <Badge className="bg-yellow-400 text-yellow-900 ml-1 text-xs px-1.5 py-0">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "users" && (
          <UsersList
            users={users}
            patients={patients}
            professionals={professionals}
            currentUser={currentUser}
            onReload={loadData}
          />
        )}
        {activeTab === "invites" && (
          <InviteManagement currentUser={currentUser} />
        )}
        {activeTab === "approvals" && (
          <ProfessionalApprovals currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}