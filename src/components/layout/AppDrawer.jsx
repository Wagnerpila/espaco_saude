import { Link, useLocation } from "react-router-dom";
import { X, LogOut, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Menu principal no celular (estilo Master UP): painel em degradê que desliza
// da direita, uma linha por página, com contador vermelho quando há pendência.
// Recebe as mesmas categorias já filtradas por permissão do menu lateral.
export default function AppDrawer({ open, onClose, categories, badges = {}, currentUser, userType, dark, onToggleDark, onOpenProfile, onLogout }) {
  const location = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          <motion.aside
            className="absolute top-0 right-0 h-full w-[82%] max-w-sm bg-brand-gradient text-white flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/15">
              <button onClick={() => { onClose(); onOpenProfile(); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-11 h-11 rounded-full bg-white/25 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {currentUser?.avatar_url
                    ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="font-semibold text-lg">{currentUser?.full_name?.[0] || "U"}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{currentUser?.full_name || "Usuário"}</p>
                  <p className="text-xs text-white/75">
                    {userType === "admin" ? "Administrador" : userType === "professional" ? "Profissional" : "Paciente"}
                  </p>
                </div>
              </button>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/15" aria-label="Fechar menu">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {categories.map((group) => (
                <div key={group.category} className="py-1">
                  <p className="px-5 pt-2 pb-1 text-[11px] uppercase tracking-wider text-white/60 font-medium">{group.category}</p>
                  {group.items.map((item) => {
                    const active = location.pathname === item.url;
                    const badge = badges[item.url];
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={onClose}
                        className={`flex items-center gap-4 px-5 py-3 border-b border-white/10 transition-colors ${active ? "bg-white/20" : "hover:bg-white/10"}`}
                      >
                        <span className="relative">
                          <item.icon className="w-6 h-6" />
                          {badge > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center">
                              {badge}
                            </span>
                          )}
                        </span>
                        <span className="text-[15px] font-medium flex-1">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="border-t border-white/15 px-5 py-3 space-y-1">
              <button onClick={onToggleDark} className="w-full flex items-center gap-4 py-2 text-white/90">
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm">{dark ? "Modo claro" : "Modo escuro"}</span>
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-4 py-2 text-white/90">
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
