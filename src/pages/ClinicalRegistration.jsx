import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Save, X, FileText, Dumbbell, Activity, DoorOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";

const { MedicalRecordTemplate, Equipment, ExerciseItem, Room } = base44.entities;

const CATEGORIES = ["pilates", "fisioterapia", "estetica", "psicologia", "medico", "outros"];

// ─── Template Form ────────────────────────────────────────────
function TemplateForm({ onSave, onCancel, initial = {} }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || "pilates");
  const [fields, setFields] = useState(initial.checkbox_fields || []);
  const [newField, setNewField] = useState("");

  const addField = () => {
    const f = newField.trim();
    if (f && !fields.includes(f)) { setFields([...fields, f]); setNewField(""); }
  };

  const removeField = (i) => setFields(fields.filter((_, idx) => idx !== i));

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome do modelo *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Evolução Pilates" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Categoria *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Campos Checkbox (itens do prontuário)</Label>
        <div className="flex gap-2 mt-1">
          <Input value={newField} onChange={e => setNewField(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())} placeholder="ex: alongamento, fortalecimento..." className="h-9 flex-1" />
          <Button type="button" size="sm" onClick={addField} className="h-9 bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {fields.map((f, i) => (
              <Badge key={i} className="bg-purple-100 text-purple-800 gap-1 pr-1">
                {f}
                <button onClick={() => removeField(i)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => name && category && onSave({ name, category, checkbox_fields: fields, active: true })}>
          <Save className="w-4 h-4 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// ─── Equipment Form ────────────────────────────────────────────
function EquipmentForm({ onSave, onCancel, initial = {} }) {
  const [name, setName] = useState(initial.name || "");
  const [abbreviation, setAbbreviation] = useState(initial.abbreviation || "");
  const [category, setCategory] = useState(initial.category || "pilates");

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nome do aparelho *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Reformer" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Abreviação</Label>
          <Input value={abbreviation} onChange={e => setAbbreviation(e.target.value.toUpperCase().substring(0, 3))} placeholder="ex: RE" className="mt-1 h-9" maxLength={3} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Categoria *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => name && category && onSave({ name, abbreviation, category, active: true })}>
          <Save className="w-4 h-4 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// ─── Exercise Form ────────────────────────────────────────────
function ExerciseForm({ onSave, onCancel, equipments = [], initial = {} }) {
  const [name, setName] = useState(initial.name || "");
  const [category, setCategory] = useState(initial.category || "pilates");
  const [equipmentId, setEquipmentId] = useState(initial.equipment_id || "");

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome do exercício *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Footwork" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Categoria *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Aparelho associado (opcional)</Label>
        <Select value={equipmentId} onValueChange={setEquipmentId}>
          <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Nenhum</SelectItem>
            {equipments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => name && category && onSave({ name, category, equipment_id: equipmentId || null, active: true })}>
          <Save className="w-4 h-4 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// ─── Room Form ────────────────────────────────────────────────
const ROOM_TYPES = ["pilates", "fisioterapia", "estetica", "consultorio", "multifuncional"];

function RoomForm({ onSave, onCancel, initial = {} }) {
  const [name, setName] = useState(initial.room_name || "");
  const [type, setType] = useState(initial.room_type || "consultorio");
  const [capacity, setCapacity] = useState(initial.capacity || 1);

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome da sala *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Sala 1, Sala Pilates..." className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Tipo *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Capacidade simultânea</Label>
        <Input type="number" min={1} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} className="mt-1 h-9 w-24" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => name && type && onSave({ room_name: name, room_type: type, capacity, active: true })}>
          <Save className="w-4 h-4 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ClinicalRegistration() {
  const [templates, setTemplates] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [t, e, ex, r] = await Promise.all([
      MedicalRecordTemplate.list(),
      Equipment.list(),
      ExerciseItem.list(),
      Room.list()
    ]);
    setTemplates(t);
    setEquipments(e);
    setExercises(ex);
    setRooms(r);
  };

  const saveTemplate = async (data) => {
    if (editingTemplate) { await MedicalRecordTemplate.update(editingTemplate.id, data); setEditingTemplate(null); }
    else { await MedicalRecordTemplate.create(data); setShowTemplateForm(false); }
    load();
  };

  const saveEquipment = async (data) => {
    if (editingEquipment) { await Equipment.update(editingEquipment.id, data); setEditingEquipment(null); }
    else { await Equipment.create(data); setShowEquipmentForm(false); }
    load();
  };

  const saveExercise = async (data) => {
    if (editingExercise) { await ExerciseItem.update(editingExercise.id, data); setEditingExercise(null); }
    else { await ExerciseItem.create(data); setShowExerciseForm(false); }
    load();
  };

  const saveRoom = async (data) => {
    if (editingRoom) { await Room.update(editingRoom.id, data); setEditingRoom(null); }
    else { await Room.create(data); setShowRoomForm(false); }
    load();
  };

  const deleteTemplate = async (id) => { await MedicalRecordTemplate.delete(id); load(); };
  const deleteEquipment = async (id) => { await Equipment.delete(id); load(); };
  const deleteExercise = async (id) => { await ExerciseItem.delete(id); load(); };
  const deleteRoom = async (id) => { await Room.delete(id); load(); };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cadastros Clínicos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Modelos de prontuário, aparelhos e exercícios</p>
          </div>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="mb-4 flex w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
            <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-1" /> Prontuários Clicáveis</TabsTrigger>
            <TabsTrigger value="equipments"><Dumbbell className="w-4 h-4 mr-1" /> Aparelhos</TabsTrigger>
            <TabsTrigger value="exercises"><Activity className="w-4 h-4 mr-1" /> Exercícios</TabsTrigger>
            <TabsTrigger value="rooms"><DoorOpen className="w-4 h-4 mr-1" /> Salas</TabsTrigger>
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Modelos de Prontuário</CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowTemplateForm(true); setEditingTemplate(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Modelo
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(showTemplateForm && !editingTemplate) && (
                  <TemplateForm onSave={saveTemplate} onCancel={() => setShowTemplateForm(false)} />
                )}
                {templates.length === 0 && !showTemplateForm && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum modelo cadastrado.</p>
                )}
                {templates.map(t => (
                  editingTemplate?.id === t.id ? (
                    <TemplateForm key={t.id} initial={t} onSave={saveTemplate} onCancel={() => setEditingTemplate(null)} />
                  ) : (
                    <div key={t.id} className="flex items-start justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors">
                      <div>
                        <p className="font-medium text-sm dark:text-white">{t.name}</p>
                        <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">{t.category}</Badge>
                        {t.checkbox_fields?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.checkbox_fields.map((f, i) => <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTemplate(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteTemplate(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  )
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipments */}
          <TabsContent value="equipments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Aparelhos</CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowEquipmentForm(true); setEditingEquipment(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Aparelho
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(showEquipmentForm && !editingEquipment) && (
                  <EquipmentForm onSave={saveEquipment} onCancel={() => setShowEquipmentForm(false)} />
                )}
                {equipments.length === 0 && !showEquipmentForm && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum aparelho cadastrado.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {equipments.map(eq => (
                    editingEquipment?.id === eq.id ? (
                      <EquipmentForm key={eq.id} initial={eq} onSave={saveEquipment} onCancel={() => setEditingEquipment(null)} />
                    ) : (
                      <div key={eq.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(eq.abbreviation || eq.name.substring(0,2)).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm dark:text-white">{eq.name}</p>
                            <Badge className="bg-gray-100 text-gray-600 text-xs">{eq.category}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingEquipment(eq)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteEquipment(eq.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercises */}
          <TabsContent value="exercises">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Exercícios</CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowExerciseForm(true); setEditingExercise(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Exercício
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(showExerciseForm && !editingExercise) && (
                  <ExerciseForm equipments={equipments} onSave={saveExercise} onCancel={() => setShowExerciseForm(false)} />
                )}
                {exercises.length === 0 && !showExerciseForm && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum exercício cadastrado.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exercises.map(ex => (
                    editingExercise?.id === ex.id ? (
                      <ExerciseForm key={ex.id} initial={ex} equipments={equipments} onSave={saveExercise} onCancel={() => setEditingExercise(null)} />
                    ) : (
                      <div key={ex.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div>
                          <p className="font-medium text-sm dark:text-white">{ex.name}</p>
                          <Badge className="bg-gray-100 text-gray-600 text-xs">{ex.category}</Badge>
                          {ex.equipment_id && (
                            <span className="ml-1 text-xs text-purple-600">{equipments.find(e => e.id === ex.equipment_id)?.name}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingExercise(ex)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteExercise(ex.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Rooms */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Salas de Consulta</CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowRoomForm(true); setEditingRoom(null); }}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Sala
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(showRoomForm && !editingRoom) && (
                  <RoomForm onSave={saveRoom} onCancel={() => setShowRoomForm(false)} />
                )}
                {rooms.length === 0 && !showRoomForm && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhuma sala cadastrada.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rooms.map(room => (
                    editingRoom?.id === room.id ? (
                      <RoomForm key={room.id} initial={room} onSave={saveRoom} onCancel={() => setEditingRoom(null)} />
                    ) : (
                      <div key={room.id} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <DoorOpen className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm dark:text-white">{room.room_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="bg-blue-100 text-blue-700 text-xs">{room.room_type}</Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Cap: {room.capacity}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRoom(room)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteRoom(room.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}