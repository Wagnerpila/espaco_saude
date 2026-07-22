import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Edit, Calendar, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function MedicalRecordList({ 
  records, 
  patients,
  professionals,
  isLoading, 
  onEdit, 
  onSelect, 
  selectedRecord 
}) {
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Paciente não encontrado';
  };

  const getProfessionalName = (professionalId) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.full_name || 'Profissional não encontrado';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="w-8 h-8 rounded" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum prontuário encontrado
        </h3>
        <p className="text-gray-500">
          Tente ajustar os termos de busca ou cadastre um novo prontuário
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <motion.div
          key={record.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedRecord?.id === record.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(record)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {getPatientName(record.patient_id)}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(record.session_date), 'dd/MM/yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getProfessionalName(record.professional_id)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      <strong>Diagnóstico:</strong> {record.diagnosis}
                    </p>
                    {record.treatment && (
                      <p className="text-sm text-gray-700 line-clamp-1 mt-1">
                        <strong>Tratamento:</strong> {record.treatment}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(record);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}