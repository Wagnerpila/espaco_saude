// Mapa entidade (nome usado pelo frontend, igual ao base44) -> model Prisma.
// `dateFields` lista os campos (em snake_case, como chegam do frontend) que
// precisam virar objetos Date antes de ir para o Prisma.
// `jsonFields` lista campos JSON "opacos": seu conteúdo interno não é tocado
// pela conversão snake_case <-> camelCase, só a chave de topo.
export const ENTITY_MAP = {
  Patient: { model: 'patient', dateFields: ['birth_date'], jsonFields: [] },
  Professional: { model: 'professional', dateFields: [], jsonFields: ['working_hours'] },
  Appointment: { model: 'appointment', dateFields: ['appointment_date'], jsonFields: [] },
  Commission: { model: 'commission', dateFields: ['payment_date', 'service_date'], jsonFields: [] },
  MonthlyClosing: { model: 'monthlyClosing', dateFields: ['closing_date'], jsonFields: [] },
  FinancialRecord: { model: 'financialRecord', dateFields: ['transaction_date'], jsonFields: [] },
  MedicalRecord: { model: 'medicalRecord', dateFields: ['session_date'], jsonFields: ['attachments'] },
  MedicalRecordTemplate: { model: 'medicalRecordTemplate', dateFields: [], jsonFields: [] },
  Equipment: { model: 'equipment', dateFields: [], jsonFields: [] },
  ExerciseItem: { model: 'exerciseItem', dateFields: [], jsonFields: [] },
  Room: { model: 'room', dateFields: [], jsonFields: [] },
  ScheduleBlock: { model: 'scheduleBlock', dateFields: ['start_date', 'end_date', 'custom_dates'], jsonFields: [] },
  ServicePlan: { model: 'servicePlan', dateFields: [], jsonFields: [] },
  ServicePackage: { model: 'servicePackage', dateFields: ['start_date', 'end_date'], jsonFields: [] },
  Notification: { model: 'notification', dateFields: [], jsonFields: ['data'] },
  ProfessionalRequest: { model: 'professionalRequest', dateFields: ['reviewed_at'], jsonFields: [] },
  InviteLink: { model: 'inviteLink', dateFields: ['expires_at', 'used_at'], jsonFields: [] },
  UserPermission: { model: 'userPermission', dateFields: [], jsonFields: ['permissions'] },
  WhatsAppConversation: { model: 'whatsAppConversation', dateFields: ['last_active'], jsonFields: ['messages', 'state', 'draft'] },
};

export function getEntityConfig(name) {
  const config = ENTITY_MAP[name];
  if (!config) return null;
  return config;
}
