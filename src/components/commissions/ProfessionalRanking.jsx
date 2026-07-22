import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, DollarSign, Calendar } from "lucide-react";

export default function ProfessionalRanking({ commissions, professionals, startDate, endDate }) {
  const ranking = useMemo(() => {
    const profStats = {};

    commissions.forEach(commission => {
      const profId = commission.professional_id;
      
      if (!profStats[profId]) {
        profStats[profId] = {
          professional_id: profId,
          total_appointments: 0,
          total_revenue: 0,
          total_commission: 0
        };
      }

      profStats[profId].total_appointments += 1;
      profStats[profId].total_revenue += commission.service_value || 0;
      profStats[profId].total_commission += commission.commission_value || 0;
    });

    return Object.values(profStats)
      .map(stat => ({
        ...stat,
        professional: professionals.find(p => p.id === stat.professional_id)
      }))
      .sort((a, b) => b.total_commission - a.total_commission);
  }, [commissions, professionals]);

  const getRankBadge = (index) => {
    const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];
    const labels = ['🥇 1º', '🥈 2º', '🥉 3º'];
    
    if (index < 3) {
      return (
        <Badge className={`${colors[index]} text-white`}>
          {labels[index]}
        </Badge>
      );
    }
    return <Badge variant="outline">{index + 1}º</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking de Profissionais
          </CardTitle>
          <p className="text-sm text-gray-600">
            Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
          </p>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum dado encontrado para o período selecionado</p>
          ) : (
            <div className="space-y-4">
              {ranking.map((stat, index) => (
                <Card key={stat.professional_id} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getRankBadge(index)}
                        <div>
                          <h3 className="font-bold text-lg">{stat.professional?.full_name || 'N/A'}</h3>
                          <p className="text-sm text-gray-600">{stat.professional?.specialty || ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Atendimentos</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{stat.total_appointments}</p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-gray-600">Faturamento</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                          R$ {stat.total_revenue.toFixed(2)}
                        </p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600">Comissão</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">
                          R$ {stat.total_commission.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}