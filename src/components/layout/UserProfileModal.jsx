import React, { useState, useRef } from "react";
import { X, Camera, User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

export default function UserProfileModal({ user, onClose, onSaved }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone, avatar_url: avatarUrl });
    setSaving(false);
    onSaved?.({ ...user, phone, avatar_url: avatarUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Perfil</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">{fullName?.[0] || "U"}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {uploading && <span className="text-xs text-blue-500 animate-pulse">Enviando foto...</span>}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome completo</Label>
              <Input value={fullName} disabled className="mt-1 bg-gray-50 dark:bg-gray-800 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">O nome não pode ser alterado aqui.</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</Label>
              <Input value={user?.email || ""} disabled className="mt-1 bg-gray-50 dark:bg-gray-800 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="flex-1 dark:border-gray-700 dark:text-gray-300">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}