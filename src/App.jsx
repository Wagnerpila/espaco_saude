import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PackageServices from './pages/PackageServices';
import ServiceConfiguration from './pages/ServiceConfiguration';
import Commissions from './pages/Commissions';
import ClinicalRegistration from './pages/ClinicalRegistration';
import WebhookDocs from './pages/WebhookDocs';
import N8nTutorial from './pages/N8nTutorial';
import WhatsAppConversations from './pages/WhatsAppConversations';
import RegisterProfile from './pages/RegisterProfile';
import AccessDenied from './pages/AccessDenied';
import PublicChat from './pages/PublicChat';
import ConfirmAppointment from './pages/ConfirmAppointment';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Páginas alcançáveis sem login: PublicChat é o widget de chat público, e
// ConfirmAppointment é o link de confirmação enviado por WhatsApp/email —
// o paciente pode clicar nele sem ter uma conta no painel.
const PUBLIC_PAGE_NAMES = new Set(['PublicChat', 'ConfirmAppointment']);

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />

      <Route path="/PublicChat" element={
        <LayoutWrapper currentPageName="PublicChat"><PublicChat /></LayoutWrapper>
      } />
      <Route path="/ConfirmAppointment" element={
        <LayoutWrapper currentPageName="ConfirmAppointment"><ConfirmAppointment /></LayoutWrapper>
      } />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).filter(([path]) => !PUBLIC_PAGE_NAMES.has(path)).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/PackageServices" element={
          <LayoutWrapper currentPageName="PackageServices">
            <PackageServices />
          </LayoutWrapper>
        } />
        <Route path="/ServiceConfiguration" element={
          <LayoutWrapper currentPageName="ServiceConfiguration">
            <ServiceConfiguration />
          </LayoutWrapper>
        } />
        <Route path="/Commissions" element={
          <LayoutWrapper currentPageName="Commissions">
            <Commissions />
          </LayoutWrapper>
        } />
        <Route path="/ClinicalRegistration" element={
          <LayoutWrapper currentPageName="ClinicalRegistration">
            <ClinicalRegistration />
          </LayoutWrapper>
        } />
        <Route path="/WebhookDocs" element={
          <LayoutWrapper currentPageName="WebhookDocs">
            <WebhookDocs />
          </LayoutWrapper>
        } />
        <Route path="/N8nTutorial" element={
          <LayoutWrapper currentPageName="N8nTutorial">
            <N8nTutorial />
          </LayoutWrapper>
        } />
        <Route path="/WhatsAppConversations" element={
          <LayoutWrapper currentPageName="WhatsAppConversations">
            <WhatsAppConversations />
          </LayoutWrapper>
        } />
        <Route path="/RegisterProfile" element={<RegisterProfile />} />
        <Route path="/AccessDenied" element={<AccessDenied />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App