import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar, Users, DollarSign, FileText, Settings, LayoutDashboard,
  UserPlus, Bot, Shield, Package, Stethoscope, Moon, Sun, LogOut, ChevronRight, MessageCircle, Menu
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { User } from "@/entities/User";
import { Patient, Professional } from "@/entities/all";
import { usePendingBillingConfirmations } from "@/hooks/usePendingBillingConfirmations";
import NotificationSystem from "./components/notifications/NotificationSystem";
import AppDrawer from "./components/layout/AppDrawer";
import PageTransition from "./components/layout/PageTransition";
import UserProfileModal from "./components/layout/UserProfileModal";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b73e93560562b92900ccee/37d55f318_espaosade1.png";

// Título mostrado no topo do celular. O Dashboard mostra o nome do usuário,
// como no Master UP; páginas fora da lista caem no nome da clínica.
const PAGE_TITLES = {
  Schedule: "Agenda",
  Patients: "Pacientes",
  MyPatients: "Meus Pacientes",
  PackageServices: "Atendimentos e Serviços",
  MedicalRecords: "Prontuários",
  Professionals: "Profissionais",
  ClinicalRegistration: "Cadastros Clínicos",
  Financial: "Financeiro",
  ProfessionalFinancial: "Financeiro",
  Commissions: "Comissionamento",
  AdminPanel: "Configurações",
  UserManagement: "Usuários",
  UserPermissions: "Permissões",
  ChatAssistant: "Assistente IA",
  WhatsAppConversations: "WhatsApp Sofia",
  ServiceConfiguration: "Configuração de Serviços",
};

// ── Categories ──────────────────────────────────────────────
const ADMIN_NAV = [
  {
    category: "Principal",
    items: [
      { title: "Dashboard",  url: createPageUrl("Dashboard"),  icon: LayoutDashboard },
      { title: "Agenda",     url: createPageUrl("Schedule"),   icon: Calendar },
      { title: "Pacientes",  url: createPageUrl("Patients"),   icon: Users },
    ]
  },
  {
    category: "Clínica",
    items: [
      { title: "Atend. e Serviços", url: createPageUrl("PackageServices"),     icon: Package },
      { title: "Prontuários",       url: createPageUrl("MedicalRecords"),       icon: FileText },
      { title: "Profissionais",     url: createPageUrl("Professionals"),        icon: UserPlus },
      { title: "Cadastros Clínicos",url: createPageUrl("ClinicalRegistration"), icon: Stethoscope },
    ]
  },
  {
    category: "Financeiro",
    items: [
      { title: "Financeiro",      url: createPageUrl("Financial"),   icon: DollarSign },
      { title: "Comissionamento", url: createPageUrl("Commissions"), icon: DollarSign },
    ]
  },
  {
    category: "Administração",
    items: [
      { title: "Configurações",      url: createPageUrl("AdminPanel"),       icon: Settings },
      { title: "Usuários",           url: createPageUrl("UserManagement"),   icon: Users },
      { title: "Permissões",         url: createPageUrl("UserPermissions"),  icon: Shield },
      { title: "Assistente IA",      url: createPageUrl("ChatAssistant"),    icon: Bot },
      { title: "WhatsApp Sofia",     url: createPageUrl("WhatsAppConversations"), icon: MessageCircle },
    ]
  }
];

const PROFESSIONAL_NAV = [
  {
    category: "Meu Painel",
    items: [
      { title: "Minha Agenda",    url: createPageUrl("Schedule"),             icon: Calendar },
      { title: "Meus Pacientes",  url: createPageUrl("MyPatients"),           icon: Users },
      { title: "Prontuários",     url: createPageUrl("MedicalRecords"),       icon: FileText },
      { title: "Financeiro",      url: createPageUrl("ProfessionalFinancial"),icon: DollarSign },
    ]
  }
];

const getNavigationItems = async (userType, userEmail) => {
  let userPermissions = null;
  try {
    const { UserPermission } = await import("@/entities/all");
    const permissions = await UserPermission.filter({ user_email: userEmail });
    userPermissions = permissions[0];
  } catch (_) {}

  if (userType === 'professional') return PROFESSIONAL_NAV;
  if (!userPermissions) return ADMIN_NAV;

  // Build filtered categories from permissions
  const p = userPermissions.permissions;
  const filtered = [];

  const mainItems = [];
  if (p.dashboard) mainItems.push({ title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard });
  if (p.schedule)   mainItems.push({ title: "Agenda",   url: createPageUrl("Schedule"),  icon: Calendar });
  if (p.patients)   mainItems.push({ title: "Pacientes",url: createPageUrl("Patients"),  icon: Users });
  if (mainItems.length) filtered.push({ category: "Principal", items: mainItems });

  const clinicItems = [];
  if (p.package_services)      clinicItems.push({ title: "Atend. e Serviços",  url: createPageUrl("PackageServices"),      icon: Package });
  if (p.medical_records)       clinicItems.push({ title: "Prontuários",        url: createPageUrl("MedicalRecords"),       icon: FileText });
  if (p.professionals)         clinicItems.push({ title: "Profissionais",      url: createPageUrl("Professionals"),        icon: UserPlus });
  if (p.clinical_registration) clinicItems.push({ title: "Cadastros Clínicos",url: createPageUrl("ClinicalRegistration"), icon: Stethoscope });
  if (clinicItems.length) filtered.push({ category: "Clínica", items: clinicItems });

  const finItems = [];
  if (p.financial)    finItems.push({ title: "Financeiro",      url: createPageUrl("Financial"),   icon: DollarSign });
  if (p.commissions)  finItems.push({ title: "Comissionamento", url: createPageUrl("Commissions"), icon: DollarSign });
  if (finItems.length) filtered.push({ category: "Financeiro", items: finItems });

  const adminItems = [];
  if (p.admin_panel)      adminItems.push({ title: "Configurações",      url: createPageUrl("AdminPanel"),            icon: Settings });
  if (p.user_management)  adminItems.push({ title: "Usuários",           url: createPageUrl("UserManagement"),        icon: Users });
  if (p.user_management)  adminItems.push({ title: "Permissões",         url: createPageUrl("UserPermissions"),       icon: Shield });
  if (p.chat_assistant)   adminItems.push({ title: "Assistente IA",      url: createPageUrl("ChatAssistant"),         icon: Bot });
  if (p.whatsapp_sofia)   adminItems.push({ title: "WhatsApp Sofia",     url: createPageUrl("WhatsAppConversations"), icon: MessageCircle });
  if (adminItems.length) filtered.push({ category: "Administração", items: adminItems });

  if (userType === 'professional') {
    const profItems = [];
    if (p.my_patients)          profItems.push({ title: "Meus Pacientes", url: createPageUrl("MyPatients"),            icon: Users });
    if (p.professional_financial) profItems.push({ title: "Financeiro",   url: createPageUrl("ProfessionalFinancial"), icon: DollarSign });
    if (profItems.length) filtered.push({ category: "Meu Painel", items: profItems });
  }

  return filtered.length ? filtered : ADMIN_NAV;
};

// ── Dark Mode Hook ───────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = React.useState(() => {
    const stored = localStorage.getItem("darkMode");
    return stored === "true";
  });

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  return [dark, setDark];
}

// ── Layout ───────────────────────────────────────────────────
export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userType, setUserType] = React.useState('admin');
  const [isLoading, setIsLoading] = React.useState(true);
  const [navigationCategories, setNavigationCategories] = React.useState([]);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [dark, setDark] = useDarkMode();
  // Badge no menu lateral avisando cobrança(s) vencida(s) aguardando
  // confirmação do admin antes de liberar o envio por WhatsApp (ver
  // pop-up equivalente na página Financeiro).
  const { count: pendingBillingCount } = usePendingBillingConfirmations(userType === 'admin' && !isLoading);

  const navBadges = React.useMemo(
    () => ({ [createPageUrl("Financial")]: pendingBillingCount }),
    [pendingBillingCount]
  );
  const handleLogout = async () => { await User.logout(); window.location.href = '/'; };

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (currentPageName === 'PublicChat' || currentPageName === 'ConfirmAppointment') {
          setUserType('patient');
          setIsLoading(false);
          return;
        }

        // Skip profile check if already on registration page
        if (currentPageName === 'RegisterProfile') {
          setIsLoading(false);
          return;
        }

        // Se o role do usuário no Base44 já é 'admin', trata como admin imediatamente
        if (user.role === 'admin') {
          setUserType('admin');
          const cats = await getNavigationItems('admin', user.email);
          setNavigationCategories(cats);
          setIsLoading(false);
          return;
        }

        let isAdminFromPermissions = false;
        try {
          const { UserPermission } = await import("@/entities/all");
          const permissions = await UserPermission.filter({ user_email: user.email });
          if (permissions.length > 0) isAdminFromPermissions = permissions[0].is_admin;
        } catch (_) {}

        if (isAdminFromPermissions) {
          setUserType('admin');
          const cats = await getNavigationItems('admin', user.email);
          setNavigationCategories(cats);
        } else {
          // Check if user is a patient — patients cannot access the app
          const { Patient: PatientEntity } = await import("@/entities/all");
          const patients = await PatientEntity.list();
          const isPatient = patients.some(p => p.email === user.email);
          if (isPatient) {
            // Patients are not allowed in the app
            setIsLoading(false);
            navigate("/AccessDenied");
            return;
          }

          // Check if user is a professional
          const professionals = await Professional.list();
          const professional = professionals.find(p => p.email === user.email);
          if (professional) {
            if (!professional.active) {
              // Professional pending approval — redirect to registration status page
              navigate("/RegisterProfile");
              setIsLoading(false);
              return;
            }
            setUserType('professional');
            const cats = await getNavigationItems('professional', user.email);
            setNavigationCategories(cats);
          } else {
            // Unknown user — redirect to registration
            navigate("/RegisterProfile");
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        // If user is not authenticated, redirect to login
        // Otherwise redirect to registration form
        try {
          await User.me();
          navigate("/RegisterProfile");
        } catch (_) {
          window.location.href = '/';
        }
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    };
    loadUser();
  }, [location.pathname, currentPageName]);

  const shouldRenderPublicLayout = userType === 'patient' ||
    currentPageName === 'PatientDashboard' || currentPageName === 'PublicChat' ||
    currentPageName === 'ConfirmAppointment';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (shouldRenderPublicLayout) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-blue-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-blue-200 dark:border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white overflow-hidden">
              <img src={LOGO_URL} alt="Clínica Espaço Saúde" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Clínica Espaço Saúde</h1>
              <p className="text-sm text-gray-500">💙 Estética • Fisioterapia • Pilates</p>
            </div>
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
        <NotificationSystem />
      </div>
    );
  }

  const avatarUrl = currentUser?.avatar_url;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-app">
        {/* ── Sidebar ── */}
        <Sidebar className="border-r border-gray-200 dark:border-gray-800 hidden md:flex dark:bg-gray-900">
          <SidebarHeader className="bg-brand-gradient p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-sm leading-tight">Clínica Espaço Saúde</h2>
                <p className="text-[10px] text-white/80">
                  {userType === 'professional' ? 'Painel Profissional' : 'Painel Administrativo'}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2 overflow-y-auto">
            {navigationCategories.map((group) => (
              <SidebarGroup key={group.category}>
                <SidebarGroupLabel className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 py-1">
                  {group.category}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      const showBillingBadge = item.url === createPageUrl("Financial") && pendingBillingCount > 0;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className={`rounded-lg mb-0.5 transition-colors duration-150 ${
                            isActive
                              ? 'bg-pink-50 dark:bg-pink-900/30 text-brand font-semibold'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            <Link to={item.url} className="flex items-center gap-2.5 px-3 py-1.5">
                              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand' : 'text-gray-500 dark:text-gray-400'}`} />
                              <span className="text-sm font-medium flex-1">{item.title}</span>
                              {showBillingBadge && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                                  {pendingBillingCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-200 dark:border-gray-800 p-3">
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                {dark ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
                <span className="text-xs text-gray-500 dark:text-gray-400">{dark ? 'Modo Escuro' : 'Modo Claro'}</span>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => setDark(!dark)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${dark ? 'bg-brand' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${dark ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* User profile */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-brand-gradient flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-semibold text-sm">{currentUser?.full_name?.[0] || 'U'}</span>
                }
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  {currentUser?.full_name || 'Usuário'}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {userType === 'admin' ? 'Administrador' : userType === 'professional' ? 'Profissional' : 'Paciente'}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={handleLogout}
              className="mt-1 w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 hidden md:flex items-center gap-4"
            style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}>
            <SidebarTrigger className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{PAGE_TITLES[currentPageName] || "Clínica Espaço Saúde"}</h1>
          </header>

          {/* Topo no celular (estilo Master UP): logo, título centralizado e menu */}
          <header className="sticky top-0 z-40 bg-brand-gradient text-white px-4 flex items-center gap-3 md:hidden shadow-sm"
            style={{ paddingTop: `calc(0.6rem + env(safe-area-inset-top))`, paddingBottom: "0.6rem" }}>
            <button onClick={() => setShowProfileModal(true)} className="w-10 h-10 rounded-full bg-white overflow-hidden flex-shrink-0" aria-label="Meu perfil">
              <img src={LOGO_URL} alt="" className="w-full h-full object-contain" />
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold truncate">
              {currentPageName === "Dashboard" ? (currentUser?.full_name || "Clínica Espaço Saúde") : (PAGE_TITLES[currentPageName] || "Clínica Espaço Saúde")}
            </h1>
            <button onClick={() => setShowDrawer(true)} className="relative w-10 h-10 flex items-center justify-center -mr-1" aria-label="Abrir menu">
              <Menu className="w-7 h-7" />
              {pendingBillingCount > 0 && (
                <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center">
                  {pendingBillingCount}
                </span>
              )}
            </button>
          </header>

          <PageTransition>
            <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              {children}
            </div>
          </PageTransition>
        </main>

        <AppDrawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          categories={navigationCategories}
          badges={navBadges}
          currentUser={currentUser}
          userType={userType}
          dark={dark}
          onToggleDark={() => setDark(!dark)}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
        />
        <NotificationSystem />

        {showProfileModal && (
          <UserProfileModal
            user={currentUser}
            onClose={() => setShowProfileModal(false)}
            onSaved={(updated) => setCurrentUser(updated)}
          />
        )}
      </div>
    </SidebarProvider>
  );
}