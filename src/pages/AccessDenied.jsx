import React from "react";
import { base44 } from "@/api/base44Client";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Este sistema é exclusivo para profissionais e administradores da clínica.
          Pacientes não possuem acesso ao painel administrativo.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Se você acredita que isso é um erro, entre em contato com a administração da clínica.
        </p>
        <Button
          onClick={() => base44.auth.logout("/")}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Sair
        </Button>
      </div>
    </div>
  );
}