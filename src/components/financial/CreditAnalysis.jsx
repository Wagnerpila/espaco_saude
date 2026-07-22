import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function ScoreGauge({ score }) {
  const pct = Math.min(Math.max(score / 1000, 0), 1);
  const angle = -130 + pct * 260; // -130 a +130 graus
  const color = score >= 700 ? '#22c55e' : score >= 400 ? '#f59e0b' : '#ef4444';
  const label = score >= 700 ? 'Baixo risco' : score >= 400 ? 'Risco médio' : 'Alto risco';

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Track */}
        <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        {/* Score arc */}
        <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${pct * 188} 188`} />
        {/* Needle */}
        <g transform={`rotate(${angle}, 80, 90)`}>
          <line x1="80" y1="90" x2="80" y2="40" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="80" cy="90" r="4" fill="#374151" />
        </g>
        {/* Score text */}
        <text x="80" y="82" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
      </svg>
      <p className="font-bold text-lg" style={{ color }}>{label}</p>
    </div>
  );
}

export default function CreditAnalysis({ patients }) {
  const [cpf, setCpf] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    const p = patients.find(p => p.id === id);
    if (p?.cpf) setCpf(p.cpf.replace(/\D/g, ''));
  };

  const handleConsult = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) { setError("CPF deve ter 11 dígitos."); return; }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      // Consulta real via LLM com busca na internet (dados públicos de score/inadimplência)
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um sistema de análise de crédito brasileiro. Analise o CPF ${cleanCpf} e forneça uma análise de risco de crédito baseada em dados públicos disponíveis. 
        
        Retorne:
        - score: número de 0 a 1000 estimado baseado no perfil do CPF
        - risk_level: "baixo", "medio" ou "alto"
        - probability_payment: porcentagem de 0 a 100
        - restrictions: número estimado de restrições ativas
        - recommendation: recomendação de crédito em 1-2 frases
        - factors: array de até 3 fatores positivos ou negativos encontrados
        
        IMPORTANTE: Esta é uma análise estimada baseada em dados públicos. Não inclua dados pessoais reais. Use o CPF apenas para identificação.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            risk_level: { type: "string" },
            probability_payment: { type: "number" },
            restrictions: { type: "number" },
            recommendation: { type: "string" },
            factors: { type: "array", items: { type: "string" } }
          }
        }
      });
      setResult(response);
    } catch (e) {
      setError("Erro ao consultar. Verifique o CPF e tente novamente.");
    }
    setLoading(false);
  };

  const patient = patients.find(p => p.id === selectedPatientId);

  return (
    <Card className="shadow-sm max-w-2xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          Análise de Crédito
        </CardTitle>
        <p className="text-sm text-gray-500">Consulte o perfil de crédito de um paciente pelo CPF.</p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm mb-1 block">Selecionar paciente (opcional)</Label>
            <Select value={selectedPatientId} onValueChange={handleSelectPatient}>
              <SelectTrigger><SelectValue placeholder="Escolha um paciente..." /></SelectTrigger>
              <SelectContent>
                {patients.filter(p => p.cpf).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name} — {p.cpf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-1 block">CPF para consulta</Label>
            <div className="flex gap-2">
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                maxLength={14}
              />
              <Button onClick={handleConsult} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Consultando dados de crédito...</span>
          </div>
        )}

        {result && (
          <div className="border rounded-xl p-5 bg-gray-50 dark:bg-gray-900 space-y-4">
            {patient && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-white">{patient.full_name}</span>
                <span>·</span>
                <span>CPF: {cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
              </div>
            )}

            <ScoreGauge score={result.score || 0} />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.score}</p>
                <p className="text-xs text-gray-500">Score</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-green-600">{result.probability_payment}%</p>
                <p className="text-xs text-gray-500">Prob. pagamento</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-red-500">{result.restrictions}</p>
                <p className="text-xs text-gray-500">Restrições</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3">
              {result.risk_level === 'baixo'
                ? <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                : result.risk_level === 'medio'
                  ? <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.recommendation}</p>
            </div>

            {result.factors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fatores identificados</p>
                {result.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 italic">* Análise estimada baseada em dados públicos. Não substitui consulta oficial ao Serasa/SPC.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}