import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, LayoutDashboard, Users, UserCheck, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import MobileMoreMenu from "./MobileMoreMenu";

const BOTTOM_NAV_ADMIN = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Agenda", url: createPageUrl("Schedule"), icon: Calendar },
  { title: "Pacientes", url: createPageUrl("Patients"), icon: Users },
  { title: "Profissionais", url: createPageUrl("Professionals"), icon: UserCheck },
];

const BOTTOM_NAV_PROFESSIONAL = [
  { title: "Agenda", url: createPageUrl("Schedule"), icon: Calendar },
  { title: "Pacientes", url: createPageUrl("MyPatients"), icon: Users },
  { title: "Profissionais", url: createPageUrl("Professionals"), icon: UserCheck },
];

export default function BottomNav({ userType, allItems, currentUser, onLogout }) {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const mainItems = userType === 'professional' ? BOTTOM_NAV_PROFESSIONAL : BOTTOM_NAV_ADMIN;

  const isActive = (url) => location.pathname === url;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 bottom-nav md:hidden">
        <div className="flex items-center justify-around h-16">
          {mainItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors
                ${isActive(item.url) ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-gray-500"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <MobileMoreMenu
          items={allItems}
          currentUser={currentUser}
          userType={userType}
          onClose={() => setShowMore(false)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}