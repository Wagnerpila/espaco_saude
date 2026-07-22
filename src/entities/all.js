import { createEntityClient } from './_factory';

// Mesmos 18 nomes de entidade do base44 (ver server/src/entityMap.js) — o
// nome aqui precisa bater exatamente com a chave de ENTITY_MAP no backend.
export const Patient = createEntityClient('Patient');
export const Professional = createEntityClient('Professional');
export const Appointment = createEntityClient('Appointment');
export const Commission = createEntityClient('Commission');
export const MonthlyClosing = createEntityClient('MonthlyClosing');
export const FinancialRecord = createEntityClient('FinancialRecord');
export const MedicalRecord = createEntityClient('MedicalRecord');
export const MedicalRecordTemplate = createEntityClient('MedicalRecordTemplate');
export const Equipment = createEntityClient('Equipment');
export const ExerciseItem = createEntityClient('ExerciseItem');
export const Room = createEntityClient('Room');
export const ScheduleBlock = createEntityClient('ScheduleBlock');
export const ServicePlan = createEntityClient('ServicePlan');
export const ServicePackage = createEntityClient('ServicePackage');
export const Notification = createEntityClient('Notification');
export const ProfessionalRequest = createEntityClient('ProfessionalRequest');
export const InviteLink = createEntityClient('InviteLink');
export const UserPermission = createEntityClient('UserPermission');
export const WhatsAppConversation = createEntityClient('WhatsAppConversation');

export { User } from './User';
