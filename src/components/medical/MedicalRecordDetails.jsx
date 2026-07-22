import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar,
  User,
  Edit,
  Download,
  Eye
} from "lucide-react";
import { format } from "date-fns";

export default function MedicalRecordDetails({ record, patients, professionals, onEdit }) {
  if (!record) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione um Prontuário
          </h3>
          <p className="text-gray-500">
            Clique em um prontuário da lista para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || 'Paciente não encontrado';
  };

  const getProfessionalName = (professionalId) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.full_name || 'Profissional não encontrado';
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Detalhes do Prontuário</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onEdit(record)}>
          <Edit className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {getPatientName(record.patient_id)}
            </h3>
            <p className="text-gray-600">
              {format(new Date(record.session_date), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {getProfessionalName(record.professional_id)}
              </p>
              <p className="text-sm text-gray-500">Profissional Responsável</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {format(new Date(record.session_date), "dd 'de' MMMM 'de' yyyy")}
              </p>
              <p className="text-sm text-gray-500">Data da Sessão</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Diagnóstico/Avaliação</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">{record.diagnosis}</p>
            </div>
          </div>

          {record.treatment && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Tratamento Realizado</h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{record.treatment}</p>
              </div>
            </div>
          )}

          {record.observations && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Observações</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{record.observations}</p>
              </div>
            </div>
          )}

          {record.next_session_notes && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Próxima Sessão</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{record.next_session_notes}</p>
              </div>
            </div>
          )}

          {record.attachments && record.attachments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Anexos</h4>
              <div className="space-y-2">
                {record.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {attachment.file_name}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(attachment.file_url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = attachment.file_url;
                          link.download = attachment.file_name;
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}