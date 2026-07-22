import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Plus } from "lucide-react"; // Changed Phone to MessageCircle
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInYears } from "date-fns";

export default function RecentPatients({ patients, isLoading }) {
  const handleWhatsApp = (patient) => {
    const phoneNumber = patient.phone?.replace(/\D/g, '');
    const message = `Olá ${patient.full_name}! Como vai? Aqui é da Espaço Saúde.`; // Changed message content
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          Pacientes Recentes
        </CardTitle>
        <Link to={createPageUrl("Patients")}>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Ver Todos
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum paciente cadastrado</p>
            <Link to={createPageUrl("Patients")}>
              <Button className="mt-2">Cadastrar Primeiro Paciente</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {patient.full_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{patient.full_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {patient.birth_date && `${differenceInYears(new Date(), new Date(patient.birth_date))} anos`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleWhatsApp(patient)}
                  className="text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="w-4 h-4" /> {/* Changed Phone to MessageCircle */}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}