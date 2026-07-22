import { apiClient } from '@/api/apiClient';

// Endpoint público novo (não existia como função base44) que substitui os
// antigos Appointment.list()/Patient.list()/Professional.list() que a
// ConfirmAppointment.jsx fazia para montar a tela — aqueles exigiam listar
// a tabela inteira e não fazem sentido atrás de autenticação numa página
// que um paciente pode abrir sem estar logado.
export async function getAppointmentPublicDetails(appointmentId) {
  const { data } = await apiClient.get(`/functions/appointment-public/${appointmentId}`);
  return data;
}
