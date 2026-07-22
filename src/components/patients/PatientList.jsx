import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MessageCircle, Edit, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInYears } from "date-fns";
import { motion } from "framer-motion";

export default function PatientList({ patients, isLoading, onEdit, onSelect, selectedPatient }) {
  const handleWhatsApp = (patient, e) => {
    e.stopPropagation();
    const phoneNumber = patient.phone?.replace(/\D/g, '');
    const message = `Olá ${patient.full_name}! Como vai? Aqui é da Espaço Saúde.`;
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum paciente encontrado
        </h3>
        <p className="text-gray-500">
          Tente ajustar os termos de busca ou cadastre um novo paciente
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => (
        <motion.div
          key={patient.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md dark:bg-gray-900 dark:border-gray-800 ${
              selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => onSelect(patient)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {patient.full_name[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {patient.full_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{patient.phone}</span>
                      {patient.birth_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {differenceInYears(new Date(), new Date(patient.birth_date))} anos
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={patient.active ? "default" : "secondary"}>
                    {patient.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleWhatsApp(patient, e)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(patient);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}