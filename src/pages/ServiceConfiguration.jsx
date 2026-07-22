import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Plus, 
  Package, 
  DoorOpen, 
  Edit, 
  Trash2,
  Save,
  X
} from "lucide-react";
import { ServicePlan, Room, Professional } from "@/entities/all";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function ServiceConfiguration() {
  const [plans, setPlans] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  const [planForm, setPlanForm] = useState({
    plan_name: "",
    service_type: "pilates",
    description: "",
    default_value: 0,
    sessions_per_cycle: 8,
    duration_minutes: 60,
    available_rooms: [],
    available_professionals: [],
    allow_discount: true,
    max_discount_percentage: 20,
    active: true,
    notes: ""
  });

  const [roomForm, setRoomForm] = useState({
    room_name: "",
    room_type: "multifuncional",
    capacity: 1,
    equipment: [],
    active: true,
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, roomsData, profsData] = await Promise.all([
        ServicePlan.list(),
        Room.list(),
        Professional.list()
      ]);
      setPlans(plansData);
      setRooms(roomsData);
      setProfessionals(profsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        await ServicePlan.update(editingPlan.id, planForm);
        toast.success("Plano atualizado com sucesso!");
      } else {
        await ServicePlan.create(planForm);
        toast.success("Plano criado com sucesso!");
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      resetPlanForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast.error("Erro ao salvar plano");
    }
  };

  const handleSaveRoom = async () => {
    try {
      if (editingRoom) {
        await Room.update(editingRoom.id, roomForm);
        toast.success("Sala atualizada com sucesso!");
      } else {
        await Room.create(roomForm);
        toast.success("Sala criada com sucesso!");
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      resetRoomForm();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar sala:", error);
      toast.error("Erro ao salvar sala");
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm(plan);
    setShowPlanForm(true);
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm(room);
    setShowRoomForm(true);
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este plano?")) return;
    try {
      await ServicePlan.delete(id);
      toast.success("Plano excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir plano:", error);
      toast.error("Erro ao excluir plano");
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta sala?")) return;
    try {
      await Room.delete(id);
      toast.success("Sala excluída com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir sala:", error);
      toast.error("Erro ao excluir sala");
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      plan_name: "",
      service_type: "pilates",
      description: "",
      default_value: 0,
      sessions_per_cycle: 8,
      duration_minutes: 60,
      available_rooms: [],
      available_professionals: [],
      allow_discount: true,
      max_discount_percentage: 20,
      active: true,
      notes: ""
    });
  };

  const resetRoomForm = () => {
    setRoomForm({
      room_name: "",
      room_type: "multifuncional",
      capacity: 1,
      equipment: [],
      active: true,
      notes: ""
    });
  };

  const serviceTypeLabels = {
    pilates: "Pilates",
    fisioterapia: "Fisioterapia",
    estetica: "Estética",
    outros: "Outros"
  };

  const roomTypeLabels = {
    pilates: "Pilates",
    fisioterapia: "Fisioterapia",
    estetica: "Estética",
    consultorio: "Consultório",
    multifuncional: "Multifuncional"
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuração de Serviços</h1>
              <p className="text-gray-600">Gerencie planos, valores e salas</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="plans" className="gap-2">
              <Package className="w-4 h-4" />
              Planos de Serviço
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-2">
              <DoorOpen className="w-4 h-4" />
              Salas
            </TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Planos Cadastrados</CardTitle>
                <Button onClick={() => setShowPlanForm(!showPlanForm)}>
                  {showPlanForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {showPlanForm ? "Cancelar" : "Novo Plano"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showPlanForm && (
                  <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">
                        {editingPlan ? "Editar Plano" : "Novo Plano"}
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome do Plano *</Label>
                          <Input
                            value={planForm.plan_name}
                            onChange={(e) => setPlanForm({...planForm, plan_name: e.target.value})}
                            placeholder="Ex: Pilates 2x semana"
                          />
                        </div>

                        <div>
                          <Label>Tipo de Serviço *</Label>
                          <Select
                            value={planForm.service_type}
                            onValueChange={(value) => setPlanForm({...planForm, service_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(serviceTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Valor Padrão (R$) *</Label>
                          <Input
                            type="number"
                            value={planForm.default_value}
                            onChange={(e) => setPlanForm({...planForm, default_value: parseFloat(e.target.value) || 0})}
                          />
                        </div>

                        <div>
                          <Label>Sessões por Ciclo *</Label>
                          <Input
                            type="number"
                            value={planForm.sessions_per_cycle}
                            onChange={(e) => setPlanForm({...planForm, sessions_per_cycle: parseInt(e.target.value) || 0})}
                          />
                        </div>

                        <div>
                          <Label>Duração (minutos)</Label>
                          <Input
                            type="number"
                            value={planForm.duration_minutes}
                            onChange={(e) => setPlanForm({...planForm, duration_minutes: parseInt(e.target.value) || 60})}
                          />
                        </div>

                        <div>
                          <Label>Desconto Máximo (%)</Label>
                          <Input
                            type="number"
                            value={planForm.max_discount_percentage}
                            onChange={(e) => setPlanForm({...planForm, max_discount_percentage: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={planForm.description}
                          onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                          placeholder="Descrição do plano..."
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={planForm.allow_discount}
                            onCheckedChange={(checked) => setPlanForm({...planForm, allow_discount: checked})}
                          />
                          <Label>Permitir Desconto</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={planForm.active}
                            onCheckedChange={(checked) => setPlanForm({...planForm, active: checked})}
                          />
                          <Label>Ativo</Label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSavePlan} className="bg-purple-600 hover:bg-purple-700">
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowPlanForm(false);
                            setEditingPlan(null);
                            resetPlanForm();
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Plans List */}
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{plan.plan_name}</h3>
                              <Badge variant={plan.active ? "default" : "secondary"}>
                                {plan.active ? "Ativo" : "Inativo"}
                              </Badge>
                              <Badge variant="outline">
                                {serviceTypeLabels[plan.service_type]}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Valor:</span> R$ {plan.default_value?.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Sessões:</span> {plan.sessions_per_cycle}
                              </div>
                              <div>
                                <span className="font-medium">Duração:</span> {plan.duration_minutes}min
                              </div>
                              <div>
                                <span className="font-medium">Desc. Máx:</span> {plan.max_discount_percentage}%
                              </div>
                            </div>
                            {plan.description && (
                              <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {plans.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum plano cadastrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Salas Cadastradas</CardTitle>
                <Button onClick={() => setShowRoomForm(!showRoomForm)}>
                  {showRoomForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {showRoomForm ? "Cancelar" : "Nova Sala"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showRoomForm && (
                  <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">
                        {editingRoom ? "Editar Sala" : "Nova Sala"}
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome da Sala *</Label>
                          <Input
                            value={roomForm.room_name}
                            onChange={(e) => setRoomForm({...roomForm, room_name: e.target.value})}
                            placeholder="Ex: Sala Pilates 1"
                          />
                        </div>

                        <div>
                          <Label>Tipo de Sala *</Label>
                          <Select
                            value={roomForm.room_type}
                            onValueChange={(value) => setRoomForm({...roomForm, room_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(roomTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Capacidade</Label>
                          <Input
                            type="number"
                            value={roomForm.capacity}
                            onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value) || 1})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Observações</Label>
                        <Textarea
                          value={roomForm.notes}
                          onChange={(e) => setRoomForm({...roomForm, notes: e.target.value})}
                          placeholder="Observações sobre a sala..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={roomForm.active}
                          onCheckedChange={(checked) => setRoomForm({...roomForm, active: checked})}
                        />
                        <Label>Ativa</Label>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSaveRoom} className="bg-blue-600 hover:bg-blue-700">
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowRoomForm(false);
                            setEditingRoom(null);
                            resetRoomForm();
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Rooms List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{room.room_name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant={room.active ? "default" : "secondary"}>
                                  {room.active ? "Ativa" : "Inativa"}
                                </Badge>
                                <Badge variant="outline">
                                  {roomTypeLabels[room.room_type]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Capacidade:</span> {room.capacity} pessoa(s)
                          </div>
                          {room.notes && (
                            <p className="text-sm text-gray-500">{room.notes}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRoom(room)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRoom(room.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {rooms.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <DoorOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhuma sala cadastrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}