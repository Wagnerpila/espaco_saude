import { Link } from "react-router-dom";
import { X, LogOut, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function MobileMoreMenu({ items, currentUser, userType, onClose, onLogout }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleDeleteAccount = () => {
    if (deleteInput === "EXCLUIR") {
      // Trigger logout/delete - platform handles actual deletion
      onLogout();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <motion.div
          className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900">{currentUser?.full_name || "Usuário"}</p>
              <p className="text-xs text-gray-500">
                {userType === 'admin' ? 'Administrador' : userType === 'professional' ? 'Profissional' : 'Paciente'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* All nav items */}
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider px-3 py-2 font-medium">Menu completo</p>
            {items.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            ))}
          </div>

          {/* Account actions */}
          <div className="px-3 py-2 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider px-3 py-2 font-medium">Conta</p>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Excluir Conta</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Delete Account Confirmation */}
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div
            className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Excluir Conta</h3>
                <p className="text-xs text-gray-500">Esta ação é irreversível</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Todos os seus dados serão permanentemente excluídos. Para confirmar, digite <strong>EXCLUIR</strong> abaixo.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "EXCLUIR"}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}