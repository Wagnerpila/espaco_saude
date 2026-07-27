import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadPermissions, requireAdmin } from '../middleware/rbac.js';
import * as fns from '../functions/index.js';

export const functionsRouter = Router();

// Pública — usada pela página ConfirmAppointment.jsx, aberta pelo paciente a
// partir do link enviado por WhatsApp/email, sem estar logado.
functionsRouter.post('/processAppointmentResponse', fns.processAppointmentResponse);
functionsRouter.get('/appointment-public/:id', fns.getAppointmentPublicDetails);

// Autenticadas (qualquer usuário logado) — mesma exigência do base44 original.
functionsRouter.post('/generateMonthlyAppointments', requireAuth, fns.generateMonthlyAppointments);
functionsRouter.post('/generateCommission', requireAuth, fns.generateCommission);
functionsRouter.post('/confirmPayment', requireAuth, fns.confirmPayment);
functionsRouter.post('/createFinancialTransaction', requireAuth, fns.createFinancialTransaction);
functionsRouter.post('/syncPaymentStatus', requireAuth, fns.syncPaymentStatus);
functionsRouter.post('/onAppointmentCompleted', requireAuth, fns.onAppointmentCompleted);
functionsRouter.post('/onAppointmentConfirmed', requireAuth, fns.onAppointmentConfirmed);
functionsRouter.post('/onPaymentConfirmed', requireAuth, fns.onPaymentConfirmed);
// Mais restritiva que o original (que não exigia nenhuma auth) — corrigimos
// isso aqui, ver comentário em functions/resetAttendantMode.js.
functionsRouter.post('/resetAttendantMode', requireAuth, fns.resetAttendantMode);
functionsRouter.post('/sendProfessionalAbsenceNotification', requireAuth, fns.sendProfessionalAbsenceNotification);

// Admin-only — mesma exigência do base44 original (user.role === 'admin').
const adminOnly = [requireAuth, loadPermissions, requireAdmin];
functionsRouter.post('/closeMonthlyCommissions', ...adminOnly, fns.closeMonthlyCommissions);
functionsRouter.post('/updateCommissionPayment', ...adminOnly, fns.updateCommissionPayment);
functionsRouter.post('/notifyProfessionalStatus', ...adminOnly, fns.notifyProfessionalStatus);
functionsRouter.post('/sendInviteEmail', ...adminOnly, fns.sendInviteEmail);
functionsRouter.post('/createHolidayBlocks', ...adminOnly, fns.createHolidayBlocks);
functionsRouter.post('/dailyNotifications', ...adminOnly, fns.dailyNotifications);
functionsRouter.post('/dailyReminders', ...adminOnly, fns.dailyReminders);
functionsRouter.post('/generateRecurringExpenses', ...adminOnly, fns.generateRecurringExpenses);
functionsRouter.post('/listWhatsAppMessageTemplates', ...adminOnly, fns.listWhatsAppMessageTemplates);
functionsRouter.post('/saveWhatsAppMessageTemplate', ...adminOnly, fns.saveWhatsAppMessageTemplate);
functionsRouter.post('/appointmentReminders1h', ...adminOnly, fns.appointmentReminders1h);
functionsRouter.post('/backfillTodayCompletedBilling', ...adminOnly, fns.backfillTodayCompletedBilling);
