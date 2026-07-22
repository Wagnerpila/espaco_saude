import React, { useState, useEffect } from "react";
import { ServicePackage, Patient, Professional, FinancialRecord, ServicePlan, Room } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package as PackageIcon } from "lucide-react";
import PackageServicesMenu from "../components/packages/PackageServicesMenu";
import RecurringServiceForm from "../components/packages/RecurringServiceForm";
import FixedPackageForm from "../components/packages/FixedPackageForm";
import PersonalizedPackageForm from "../components/packages/PersonalizedPackageForm";
import SingleServiceForm from "../components/packages/SingleServiceForm";
import PackageList from "../components/packages/PackageList";
import { toast } from "sonner";

export default function PackageServicesPage() {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [packages, setPackages] = useState([]);
  const [servicePlans, setServicePlans] = useState([]);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsData, profsData, packagesData, plansData, roomsData] = await Promise.all([
        Patient.list(),
        Professional.list(),
        ServicePackage.list(),
        ServicePlan.list(),
        Room.filter({ active: true })
      ]);
      setPatients(patientsData);
      setProfessionals(profsData);
      setPackages(packagesData);
      setServicePlans(plansData);
      setRooms(roomsData);
      console.log("Total de pacotes carregados:", packagesData.length);
      console.log("Total de planos cadastrados:", plansData.length);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const getPackagesByType = (type) => {
    return packages.filter(p => p.package_type === type && p.status === 'active');
  };

  const handleSelectType = (type) => {
    setSelectedType(type);
    if (patients.length > 0) {
      setSelectedPatient(patients[0]);
      setShowForm(true);
    } else {
      toast.error("Nenhum paciente cadastrado");
    }
  };

  const handleDeletePackage = async (pkg) => {
    if (!confirm(`Excluir o pacote "${pkg.plan_name}"?`)) return;
    try {
      await ServicePackage.delete(pkg.id);
      toast.success("Pacote excluído com sucesso!");
      await loadData();
    } catch (error) {
      toast.error("Erro ao excluir pacote: " + error.message);
    }
  };

  const handleSubmitPackage = async (packageData) => {
    try {
      const newPackage = await ServicePackage.create(packageData);
      
      // Criar fatura automática no financeiro se não for gratuito
      if (!packageData.is_free && packageData.final_value > 0) {
        await FinancialRecord.create({
          type: "income",
          patient_id: packageData.patient_id,
          professional_id: packageData.professional_id,
          description: `${packageData.plan_name} - ${selectedPatient.full_name}`,
          amount: packageData.final_value,
          payment_method: "pending",
          payment_status: "pending",
          transaction_date: packageData.start_date,
          notes: `Fatura gerada automaticamente pelo pacote de serviço`
        });
      }
      
      toast.success("Pacote criado com sucesso!");
      await loadData();

      // Para recorrente/fixo com dias fixos, não fecha imediatamente (o form mostrará a confirmação)
      // Para outros tipos, fecha normalmente
      if (selectedType !== "recurring" && selectedType !== "fixed") {
        setShowForm(false);
        setSelectedType(null);
        setSelectedPatient(null);
      }

      // Retorna o pacote para o form poder gerar agendamentos automáticos
      return newPackage;
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      toast.error("Erro ao criar pacote: " + error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto">
        {!selectedType && !showForm && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageIcon className="w-6 h-6" />
                  Atendimentos e Serviços
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PackageServicesMenu 
                  onSelectType={handleSelectType}
                  packages={packages}
                  onDelete={handleDeletePackage}
                />
              </CardContent>
            </Card>

            {packages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Todos os Pacotes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackageList packages={packages.filter(p => p.status === 'active')} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {selectedType === "recurring" && showForm && (
          <RecurringServiceForm
            patient={selectedPatient}
            professionals={professionals}
            servicePlans={servicePlans}
            rooms={rooms}
            onSubmit={handleSubmitPackage}
            onCancel={() => {
              setShowForm(false);
              setSelectedType(null);
              setSelectedPatient(null);
            }}
          />
        )}

        {selectedType === "fixed" && showForm && (
          <FixedPackageForm
            patient={selectedPatient}
            professionals={professionals}
            servicePlans={servicePlans}
            rooms={rooms}
            onSubmit={handleSubmitPackage}
            onCancel={() => {
              setShowForm(false);
              setSelectedType(null);
              setSelectedPatient(null);
            }}
          />
        )}

        {selectedType === "personalized" && showForm && (
          <PersonalizedPackageForm
            patient={selectedPatient}
            professionals={professionals}
            servicePlans={servicePlans}
            onSubmit={handleSubmitPackage}
            onCancel={() => {
              setShowForm(false);
              setSelectedType(null);
              setSelectedPatient(null);
            }}
          />
        )}

        {selectedType === "single" && showForm && (
          <SingleServiceForm
            patient={selectedPatient}
            professionals={professionals}
            servicePlans={servicePlans}
            onSubmit={handleSubmitPackage}
            onCancel={() => {
              setShowForm(false);
              setSelectedType(null);
              setSelectedPatient(null);
            }}
          />
        )}
      </div>
    </div>
  );
}