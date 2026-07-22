import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Package, Sparkles, Calendar, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

const serviceTypes = [
  {
    id: "recurring",
    title: "Serviços recorrentes",
    description: "Recomendados para clientes que pagam mensalmente.",
    icon: Repeat,
    iconBg: "bg-purple-500"
  },
  {
    id: "fixed",
    title: "Pacotes fixos",
    description: "Recomendados para planos longos cobrados integralmente à vista ou parcelados.",
    icon: Package,
    iconBg: "bg-green-500"
  },
  {
    id: "personalized",
    title: "Pacotes personalizados",
    description: "Recomendados para pacotes de sessões de fisioterapia e estética.",
    icon: Sparkles,
    iconBg: "bg-orange-500"
  },
  {
    id: "single",
    title: "Atendimento avulsos",
    description: "Recomendados para atendimentos unitários ou experimentais.",
    icon: Calendar,
    iconBg: "bg-cyan-500"
  }
];

export default function PackageServicesMenu({ onSelectType, packages = [], onDelete, onEdit }) {
  const [expandedType, setExpandedType] = useState(null);

  const getPackagesByType = (type) => packages.filter(p => p.package_type === type && p.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
          Atend. e Serviços
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Gerenciamento de pacotes e serviços</p>
      </div>

      <div className="grid gap-4">
        {serviceTypes.map((service) => {
          const servicePackages = getPackagesByType(service.id);
          const isExpanded = expandedType === service.id;

          return (
            <div key={service.id} className="space-y-2">
              <Card className={`border-2 transition-all dark:bg-gray-900 dark:border-gray-700 ${isExpanded ? 'border-purple-300 shadow-md dark:border-purple-700' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl ${service.iconBg} flex items-center justify-center shrink-0`}>
                        <service.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-base">{service.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Ativos: <span className="font-semibold">{servicePackages.length || 'nenhum'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedType(isExpanded ? null : service.id)}
                      >
                        {isExpanded ? 'Fechar' : 'Ver'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => onSelectType(service.id)}
                      >
                        + Novo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isExpanded && (
                <div className="ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
                  {servicePackages.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2">Nenhum plano ativo para este tipo.</p>
                  ) : (
                    servicePackages.map((pkg) => (
                      <Card key={pkg.id} className="bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{pkg.plan_name}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                                <span>Início: {format(new Date(pkg.start_date), 'dd/MM/yyyy')}</span>
                                {pkg.sessions_per_cycle && (
                                  <span>{pkg.sessions_used || 0}/{pkg.sessions_per_cycle} sessões</span>
                                )}
                                <span className="font-semibold text-green-600">
                                  {pkg.is_free ? "Gratuito" : `R$ ${pkg.final_value?.toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Ativo</Badge>
                              {onEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700" onClick={() => onEdit(pkg)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {onDelete && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => onDelete(pkg)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}