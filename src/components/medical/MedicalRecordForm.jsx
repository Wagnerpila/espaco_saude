import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Save, X, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { UploadFile } from "@/integrations/Core";

export default function MedicalRecordForm({ 
  record, 
  patients,
  professionals,
  appointments,
  onSubmit, 
  onCancel 
}) {
  const [formData, setFormData] = useState(record || {
    patient_id: "",
    professional_id: "",
    appointment_id: "",
    session_date: new Date().toISOString().split('T')[0],
    diagnosis: "",
    treatment: "",
    observations: "",
    next_session_notes: "",
    attachments: []
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await UploadFile({ file });
        return {
          file_url: result.file_url,
          file_name: file.name,
          file_type: file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload dos arquivos:", error);
    }
    setIsUploading(false);
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            {record ? 'Editar Prontuário' : 'Novo Prontuário'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => handleChange('patient_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select
                  value={formData.professional_id}
                  onValueChange={(value) => handleChange('professional_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.full_name} - {professional.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Sessão *</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => handleChange('session_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Agendamento Relacionado</Label>
                <Select
                  value={formData.appointment_id}
                  onValueChange={(value) => handleChange('appointment_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o agendamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((appointment) => {
                      const patient = patients.find(p => p.id === appointment.patient_id);
                      return (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {patient?.full_name} - {appointment.appointment_date} {appointment.appointment_time}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico/Avaliação *</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                placeholder="Descreva o diagnóstico ou avaliação realizada..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment">Tratamento Realizado *</Label>
              <Textarea
                id="treatment"
                value={formData.treatment}
                onChange={(e) => handleChange('treatment', e.target.value)}
                placeholder="Descreva o tratamento aplicado..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações da Sessão</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange('observations', e.target.value)}
                placeholder="Observações gerais sobre a sessão..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_session_notes">Anotações para Próxima Sessão</Label>
              <Textarea
                id="next_session_notes"
                value={formData.next_session_notes}
                onChange={(e) => handleChange('next_session_notes', e.target.value)}
                placeholder="Anotações e recomendações para a próxima sessão..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Anexos (Exames, Fotos, Documentos)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isUploading ? 'Enviando arquivos...' : 'Clique para enviar arquivos'}
                  </span>
                </label>
              </div>

              {formData.attachments && formData.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Arquivos Anexados:</Label>
                  {formData.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{attachment.file_name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {record ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}