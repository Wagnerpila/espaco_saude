import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, X, AlertCircle, Package, CheckCircle, MessageCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, Appointment, ScheduleBlock, ServicePackage, Patient } from "@/entities/all";
import { createFinancialTransaction } from "@/functions/createFinancialTransaction";

export default function AppointmentForm({ 
  appointment, 
  selectedSlot,
  patients,
  professionals,
  onSubmit, 
  onCancel 
}) {
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isCheckingRooms, setIsCheckingRooms] = useState(false);
  const [holidayBlock, setHolidayBlock] = useState(null);
  const [patientPackages, setPatientPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [cycleAlert, setCycleAlert] = useState(null); // { package, patient }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  const [formData, setFormData] = useState(() => {
    if (appointment) {
      return { ...appointment, room_id: appointment.room_id || "", package_id: appointment.package_id || "" };
    } else if (selectedSlot) {
      return {
        patient_id: "",
        professional_id: selectedSlot.professionalId || "",
        appointment_date: selectedSlot.date || new Date().toISOString().split('T')[0],
        appointment_time: selectedSlot.time || "09:00",
        duration: 60,
        status: "pending",
        service_type: "",
        notes: "",
        value: 0,
        payment_status: "pending",
        room_id: "",
        package_id: ""
      };
    } else {
      return {
        patient_id: "",
        professional_id: "",
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: "09:00",
        duration: 60,
        status: "pending",
        service_type: "",
        notes: "",
        value: 0,
        payment_status: "pending",
        room_id: "",
        package_id: ""
      };
    }
  });

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (formData.appointment_date && formData.appointment_time && rooms.length > 0) {
      checkRoomAvailability();
    }
  }, [formData.appointment_date, formData.appointment_time, formData.duration, rooms]);

  useEffect(() => {
    if (formData.appointment_date && formData.professional_id) {
      checkHolidayBlock();
    } else {
      setHolidayBlock(null);
    }
  }, [formData.appointment_date, formData.professional_id]);

  useEffect(() => {
    if (formData.patient_id) {
      loadPatientPackages(formData.patient_id);
    } else {
      setPatientPackages([]);
      setSelectedPackage(null);
    }
  }, [formData.patient_id]);

  useEffect(() => {
    if (formData.package_id && patientPackages.length > 0) {
      const pkg = patientPackages.find(p => p.id === formData.package_id);
      setSelectedPackage(pkg || null);
    } else {
      setSelectedPackage(null);
    }
  }, [formData.package_id, patientPackages]);

  const loadPatientPackages = async (patientId) => {
    const pkgs = await ServicePackage.filter({ patient_id: patientId, status: "active" });
    setPatientPackages(pkgs);
  };

  const checkHolidayBlock = async () => {
    const blocks = await ScheduleBlock.filter({
      professional_id: formData.professional_id,
      active: true,
      block_type: "full_day",
      start_date: formData.appointment_date,
    });
    setHolidayBlock(blocks.length > 0 ? blocks[0] : null);
  };

  const loadRooms = async () => {
    const roomsData = await Room.filter({ active: true });
    setRooms(roomsData);
  };

  const checkRoomAvailability = async () => {
    setIsCheckingRooms(true);
    if (!formData.appointment_date || !formData.appointment_time) {
      setAvailableRooms(rooms);
      setIsCheckingRooms(false);
      return;
    }
    const existingAppointments = await Appointment.filter({ appointment_date: formData.appointment_date });
    const confirmed = existingAppointments.filter(apt => apt.status !== 'cancelled');
    const [hours, minutes] = formData.appointment_time.split(':').map(Number);
    const startMin = hours * 60 + minutes;
    const endMin = startMin + (formData.duration || 60);
    const overlapping = confirmed.filter(apt => {
      if (appointment && apt.id === appointment.id) return false;
      if (!apt.room_id) return false;
      const [h, m] = apt.appointment_time.split(':').map(Number);
      const s = h * 60 + m, e = s + (apt.duration || 60);
      return (startMin >= s && startMin < e) || (endMin > s && endMin <= e) || (startMin <= s && endMin >= e);
    });
    // Uma sala só fica indisponível quando o número de agendamentos sobrepostos
    // já atinge a capacidade dela — antes qualquer sobreposição bloqueava a
    // sala inteira, mesmo que ela comportasse vários atendimentos ao mesmo tempo.
    setAvailableRooms(rooms.filter(r => {
      const occupancy = overlapping.filter(apt => apt.room_id === r.id).length;
      return occupancy < (r.capacity || 1);
    }));
    setIsCheckingRooms(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (holidayBlock) {
      alert(`❌ Não é possível agendar nesta data.\nMotivo: ${holidayBlock.reason}`);
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const saved = await onSubmit(formData);

      // Contabilizar sessão no plano se status = completed. O incremento em si
      // já acontece no backend (ver server/src/services/packages.js, disparado
      // pelo PUT do Appointment) — aqui só calculamos se o ciclo fechou, pra
      // decidir se mostramos o aviso, sem gravar de novo (evita duplicar a
      // contagem de sessões).
      if (formData.status === 'completed' && formData.package_id && selectedPackage) {
        const newSessionsUsed = (selectedPackage.sessions_used || 0) + 1;
        const maxSessions = selectedPackage.sessions_per_cycle || selectedPackage.max_sessions || 0;

        if (maxSessions > 0 && newSessionsUsed >= maxSessions) {
          const patient = patients.find(p => p.id === formData.patient_id);
          setCycleAlert({ package: { ...selectedPackage, sessions_used: newSessionsUsed }, patient });
        }
      }

      // Criar transação financeira se concluído
      if (formData.status === 'completed' && formData.value > 0) {
        await createFinancialTransaction({
          appointmentId: appointment?.id || saved?.id || formData.id,
          paymentStatus: 'pending'
        });
      }
    } catch (error) {
      // onSubmit (Schedule.jsx) já exibe um toast com o erro — aqui só
      // paramos a execução do pós-processamento (plano/financeiro) sem
      // duplicar a mensagem pro usuário.
      console.error("Erro ao salvar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendWhatsApp = () => {
    if (!cycleAlert?.patient?.phone) return;
    const phone = cycleAlert.patient.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${cycleAlert.patient.full_name}! 🎉\n\nSuas ${cycleAlert.package.sessions_per_cycle || cycleAlert.package.sessions_used} sessões do plano *${cycleAlert.package.plan_name}* foram concluídas!\n\nEntre em contato para renovar seu plano e continuar seu acompanhamento. 💙\n\n_Clínica Espaço Saúde_`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  const sessionsProgress = selectedPackage
    ? { used: selectedPackage.sessions_used || 0, total: selectedPackage.sessions_per_cycle || selectedPackage.max_sessions || 0 }
    : null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Card className="bg-white shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holidayBlock && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Feriado: {holidayBlock.reason} — Agendamento bloqueado nesta data.</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(v) => handleChange('patient_id', v)}
                    onOpenChange={(open) => { if (!open) setPatientSearch(""); }}
                    required
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                    <SelectContent>
                      <div className="relative px-2 py-1.5 sticky top-0 bg-white z-10" onKeyDown={(e) => e.stopPropagation()}>
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Buscar paciente..."
                          className="pl-8 h-8"
                        />
                      </div>
                      {patients
                        .filter(p => p.full_name?.toLowerCase().includes(patientSearch.toLowerCase()))
                        .map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select value={formData.professional_id} onValueChange={(v) => handleChange('professional_id', v)} required>
                    <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                    <SelectContent>
                      {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} - {p.specialty}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={formData.appointment_date} onChange={(e) => handleChange('appointment_date', e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input type="time" value={formData.appointment_time} onChange={(e) => handleChange('appointment_time', e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Valor da Consulta (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={formData.value || ''} onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <Label>Duração (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duration ?? ''}
                    onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sala *</Label>
                  <Select value={formData.room_id} onValueChange={(v) => handleChange('room_id', v)} required disabled={isCheckingRooms}>
                    <SelectTrigger><SelectValue placeholder={isCheckingRooms ? "Verificando..." : "Selecione a sala"} /></SelectTrigger>
                    <SelectContent>
                      {availableRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_name} - {r.room_type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {availableRooms.length === 0 && !isCheckingRooms && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                      <AlertCircle className="w-4 h-4" /><span>Todas as salas estão ocupadas neste horário</span>
                    </div>
                  )}
                  {availableRooms.length > 0 && <p className="text-xs text-gray-500 mt-1">{availableRooms.length} sala(s) disponível(is)</p>}
                </div>

                {/* Seleção de Plano */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Package className="w-4 h-4 text-purple-500" /> Plano do Paciente</Label>
                  <Select value={formData.package_id || "none"} onValueChange={(v) => handleChange('package_id', v === "none" ? "" : v)} disabled={!formData.patient_id}>
                    <SelectTrigger><SelectValue placeholder={formData.patient_id ? "Selecione o plano (opcional)" : "Selecione o paciente primeiro"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano vinculado</SelectItem>
                      {patientPackages.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.plan_name} ({pkg.sessions_used || 0}/{pkg.sessions_per_cycle || pkg.max_sessions || '∞'} sessões)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPackage && sessionsProgress && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-800">{selectedPackage.plan_name}</span>
                        <Badge className={`text-xs ${sessionsProgress.total > 0 && sessionsProgress.used >= sessionsProgress.total - 1 ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                          {sessionsProgress.used}/{sessionsProgress.total || '∞'} sessões
                        </Badge>
                      </div>
                      {sessionsProgress.total > 0 && (
                        <div className="w-full bg-purple-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (sessionsProgress.used / sessionsProgress.total) * 100)}%` }}
                          />
                        </div>
                      )}
                      {sessionsProgress.total > 0 && sessionsProgress.total - sessionsProgress.used === 1 && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">⚠️ Esta é a última sessão do ciclo!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Input value={formData.service_type} onChange={(e) => handleChange('service_type', e.target.value)} placeholder="Ex: Fisioterapia Ortopédica, RPG, Pilates..." />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Observações sobre o agendamento..." rows={3} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />{isSubmitting ? 'Salvando...' : (appointment ? 'Atualizar' : 'Agendar')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de ciclo encerrado */}
      <AnimatePresence>
        {cycleAlert && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Ciclo Encerrado! 🎉</h2>
                  <p className="text-gray-600 mt-1">
                    O paciente <strong>{cycleAlert.patient?.full_name}</strong> concluiu todas as <strong>{cycleAlert.package.sessions_per_cycle || cycleAlert.package.sessions_used}</strong> sessões do plano <strong>{cycleAlert.package.plan_name}</strong>.
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 w-full text-sm text-blue-800">
                  💡 Uma fatura foi gerada automaticamente para este ciclo. Acesse o módulo Financeiro para confirmar o pagamento.
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {cycleAlert.patient?.phone && (
                    <Button className="bg-green-500 hover:bg-green-600 text-white w-full gap-2" onClick={sendWhatsApp}>
                      <MessageCircle className="w-4 h-4" />
                      Notificar Paciente pelo WhatsApp
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setCycleAlert(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}