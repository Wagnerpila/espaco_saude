import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, 
  Phone, 
  Mail, 
  Calendar,
  Edit,
  MessageCircle,
  Clock,
  DollarSign,
  CalendarX,
  CalendarOff
} from "lucide-react";
import { ScheduleBlock } from "@/entities/all";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function ProfessionalDetails({ professional, onEdit, currentUser, onShowBlockManager }) {
  const handleBlockWeek = async () => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    if (!confirm(`Bloquear agenda de ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}?`)) return;
    await ScheduleBlock.create({
      professional_id: professional.id,
      block_type: "full_day",
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
      reason: "Bloqueio rápido - semana",
      active: true
    });
    alert("Semana bloqueada com sucesso!");
  };

  const handleBlockMonth = async () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    if (!confirm(`Bloquear agenda do mês inteiro (${format(start, 'dd/MM')} a ${format(end, 'dd/MM')})?`)) return;
    await ScheduleBlock.create({
      professional_id: professional.id,
      block_type: "full_day",
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
      reason: "Bloqueio rápido - mês",
      active: true
    });
    alert("Mês bloqueado com sucesso!");
  };

  if (!professional) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center">
          <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione um Profissional
          </h3>
          <p className="text-gray-500">
            Clique em um profissional da lista para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleWhatsApp = () => {
    const phoneNumber = professional.phone?.replace(/\D/g, '');
    const message = `Olá ${professional.full_name}! Aqui é do Espaço Saúde.`;
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const dayLabels = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira", 
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Detalhes do Profissional</CardTitle>
        <div className="flex gap-2">
          {professional.phone && (
            <Button variant="outline" size="sm" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          {onEdit && isAdmin && (
            <Button variant="outline" size="sm" onClick={() => onEdit(professional)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {professional.full_name[0]}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{professional.full_name}</h3>
            <p className="text-gray-600">{professional.specialty}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant={professional.active ? "default" : "secondary"}>
                {professional.active ? "Ativo" : "Inativo"}
              </Badge>
              {professional.default_commission_percentage > 0 && (
                <Badge className="bg-green-100 text-green-800 border border-green-300">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Comissão: {professional.default_commission_percentage}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {professional.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{professional.phone}</p>
                <p className="text-sm text-gray-500">Telefone</p>
              </div>
            </div>
          )}

          {professional.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{professional.email}</p>
                <p className="text-sm text-gray-500">E-mail</p>
              </div>
            </div>
          )}

          {professional.crefito && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{professional.crefito}</p>
                <p className="text-sm text-gray-500">CREFITO</p>
              </div>
            </div>
          )}

          {professional.working_hours && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários de Trabalho
              </h4>
              <div className="space-y-2">
                {Object.entries(dayLabels).map(([day, label]) => {
                  const workingHour = professional.working_hours[day];
                  if (!workingHour?.active) return null;
                  
                  return (
                    <div key={day} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-sm text-gray-600">
                        {workingHour.start} - {workingHour.end}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
            <CalendarX className="w-4 h-4" />
            Bloqueios de Agenda
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-orange-400 text-orange-600 hover:bg-orange-50"
              onClick={handleBlockWeek}
            >
              <CalendarOff className="w-4 h-4 mr-1" />
              Bloquear Semana
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-400 text-red-600 hover:bg-red-50"
              onClick={handleBlockMonth}
            >
              <CalendarOff className="w-4 h-4 mr-1" />
              Bloquear Mês
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}