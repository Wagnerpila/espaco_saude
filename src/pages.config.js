/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Schedule from './pages/Schedule';
import Financial from './pages/Financial';
import Professionals from './pages/Professionals';
import MedicalRecords from './pages/MedicalRecords';
import ConfirmAppointment from './pages/ConfirmAppointment';
import ChatAssistant from './pages/ChatAssistant';
import PublicChat from './pages/PublicChat';
import PatientDashboard from './pages/PatientDashboard';
import MyPatients from './pages/MyPatients';
import AdminPanel from './pages/AdminPanel';
import UserManagement from './pages/UserManagement';
import UserPermissions from './pages/UserPermissions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Patients": Patients,
    "Schedule": Schedule,
    "Financial": Financial,
    "Professionals": Professionals,
    "MedicalRecords": MedicalRecords,
    "ConfirmAppointment": ConfirmAppointment,
    "ChatAssistant": ChatAssistant,
    "PublicChat": PublicChat,
    "PatientDashboard": PatientDashboard,
    "MyPatients": MyPatients,
    "AdminPanel": AdminPanel,
    "UserManagement": UserManagement,
    "UserPermissions": UserPermissions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};