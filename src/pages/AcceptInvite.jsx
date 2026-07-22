import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";

const roleLabels = { patient: "Paciente", professional: "Profissional" };

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const [invite, setInvite] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const { data } = await apiClient.get(`/auth/invite/${token}`);
        setInvite(data);
      } catch (_err) {
        setInvalid(true);
      }
      setIsLoading(false);
    };
    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/auth/invite/${token}/accept`, { full_name: fullName, password });
      await checkUserAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Não foi possível concluir o cadastro.");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="text-center space-y-4 pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Convite inválido ou expirado</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Peça ao administrador para gerar um novo link de convite.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>Ir para o login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-white overflow-hidden shadow">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b73e93560562b92900ccee/37d55f318_espaosade1.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-xl">Clínica Espaço Saúde</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Convite para <span className="font-medium">{invite.email}</span> ({roleLabels[invite.role] || invite.role})
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Nome completo
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
                autoFocus
                className="dark:bg-gray-800"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Senha
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="dark:bg-gray-800"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Confirmar senha
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="dark:bg-gray-800"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Concluindo cadastro...
                </>
              ) : (
                "Criar minha conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
