import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, User, Eye } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800"
};

const statusLabels = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
  completed: "Concluído"
};

const typeLabels = {
  recurring: "Serviço Recorrente",
  fixed: "Pacote Fixo",
  personalized: "Pacote Personalizado",
  single: "Atendimento Avulso"
};

export default function PackageList({ packages, onSelectPackage }) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum pacote cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => (
        <Card key={pkg.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{pkg.plan_name}</h4>
                  <Badge className={statusColors[pkg.status]}>
                    {statusLabels[pkg.status]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[pkg.package_type]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Início: {format(new Date(pkg.start_date), 'dd/MM/yyyy')}</span>
                  </div>
                  
                  {pkg.end_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Fim: {format(new Date(pkg.end_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}

                  {pkg.sessions_per_cycle && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {pkg.sessions_used || 0} / {pkg.sessions_per_cycle || pkg.max_sessions} sessões
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-semibold text-green-600">
                      {pkg.is_free ? "Gratuito" : `R$ ${pkg.final_value?.toFixed(2) || '0.00'}`}
                    </span>
                  </div>
                </div>

                {pkg.notes && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-1">{pkg.notes}</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectPackage && onSelectPackage(pkg)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}