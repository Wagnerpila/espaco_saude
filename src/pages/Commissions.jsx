import React, { useState, useEffect } from "react";
import { Commission, Professional, Patient, MonthlyClosing } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock,
  Filter,
  Download,
  Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import CommissionReportTable from "../components/commissions/CommissionReportTable";
import MonthlyClosingList from "../components/commissions/MonthlyClosingList";
import PaymentControlTable from "../components/commissions/PaymentControlTable";
import ProfessionalRanking from "../components/commissions/ProfessionalRanking";

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filters, setFilters] = useState({
    professional_id: '',
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    payment_status: ''
  });

  // Estatísticas
  const [stats, setStats] = useState({
    total_appointments: 0,
    total_revenue: 0,
    total_commission: 0,
    total_paid: 0,
    total_pending: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [commissionsData, profsData, patientsData, closingsData] = await Promise.all([
        Commission.list(),
        Professional.list(),
        Patient.list(),
        MonthlyClosing.list()
      ]);

      setCommissions(commissionsData);
      setProfessionals(profsData);
      setPatients(patientsData);
      setClosings(closingsData);
      calculateStats(commissionsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const filtered = filterCommissions(data);
    
    const stats = {
      total_appointments: filtered.length,
      total_revenue: filtered.reduce((sum, c) => sum + (c.service_value || 0), 0),
      total_commission: filtered.reduce((sum, c) => sum + (c.commission_value || 0), 0),
      total_paid: filtered.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (c.commission_value || 0), 0),
      total_pending: filtered.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (c.commission_value || 0), 0)
    };

    setStats(stats);
  };

  const filterCommissions = (data = commissions) => {
    return data.filter(commission => {
      const matchesProfessional = !filters.professional_id || commission.professional_id === filters.professional_id;
      const matchesPaymentStatus = !filters.payment_status || commission.payment_status === filters.payment_status;
      
      const serviceDate = new Date(commission.service_date);
      const startDate = new Date(filters.start_date);
      const endDate = new Date(filters.end_date);
      const matchesDate = serviceDate >= startDate && serviceDate <= endDate;

      return matchesProfessional && matchesPaymentStatus && matchesDate;
    });
  };

  const handleFilter = () => {
    calculateStats(commissions);
    toast.success("Filtros aplicados");
  };

  const handleExportPDF = () => {
    toast.info("Funcionalidade de exportação em desenvolvimento");
  };

  const handlePaymentUpdate = async (commissionIds, status) => {
    try {
      const { updateCommissionPayment } = await import("@/functions/updateCommissionPayment");
      await updateCommissionPayment({
        commission_ids: commissionIds,
        payment_status: status
      });
      
      await loadData();
      toast.success("Pagamento atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      toast.error("Erro ao atualizar pagamento");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comissionamento</h1>
            <p className="text-gray-600">Gestão completa de comissões dos profissionais</p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Profissional</Label>
                <Select
                  value={filters.professional_id}
                  onValueChange={(value) => setFilters({ ...filters, professional_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    {professionals.map(prof => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Status Pagamento</Label>
                <Select
                  value={filters.payment_status}
                  onValueChange={(value) => setFilters({ ...filters, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-700">
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Atendimentos</p>
                  <p className="text-2xl font-bold">{stats.total_appointments}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Faturamento</p>
                  <p className="text-2xl font-bold">R$ {stats.total_revenue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Comissões</p>
                  <p className="text-2xl font-bold">R$ {stats.total_commission.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pago</p>
                  <p className="text-2xl font-bold text-green-600">R$ {stats.total_paid.toFixed(2)}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">R$ {stats.total_pending.toFixed(2)}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="report" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="report" className="text-[10px] sm:text-sm px-1">
              <span className="hidden sm:inline">Relatório Detalhado</span>
              <span className="sm:hidden">Relatório</span>
            </TabsTrigger>
            <TabsTrigger value="closing" className="text-[10px] sm:text-sm px-1">
              <span className="hidden sm:inline">Fechamento Mensal</span>
              <span className="sm:hidden">Fechamento</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-[10px] sm:text-sm px-1">
              <span className="hidden sm:inline">Controle de Pagamentos</span>
              <span className="sm:hidden">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-[10px] sm:text-sm px-1">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <CommissionReportTable
              commissions={filterCommissions()}
              professionals={professionals}
              patients={patients}
            />
          </TabsContent>

          <TabsContent value="closing">
            <MonthlyClosingList
              closings={closings}
              professionals={professionals}
              onReload={loadData}
            />
          </TabsContent>

          <TabsContent value="payment">
            <PaymentControlTable
              commissions={commissions.filter(c => c.payment_status === 'pending')}
              professionals={professionals}
              patients={patients}
              onPaymentUpdate={handlePaymentUpdate}
              onReload={loadData}
            />
          </TabsContent>

          <TabsContent value="ranking">
            <ProfessionalRanking
              commissions={filterCommissions()}
              professionals={professionals}
              startDate={filters.start_date}
              endDate={filters.end_date}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}