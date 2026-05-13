import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import OnboardingAssociadoPage from "./pages/onboarding/OnboardingAssociadoPage";
import OnboardingADMPage from "./pages/onboarding/OnboardingADMPage";
import AppPage from "./pages/app/AppPage";
import AssociadosPage from "./pages/app/AssociadosPage";
import EditaisPage from "./pages/app/EditaisPage";
import EditalDetailPage from "./pages/app/EditalDetailPage";
import MensalidadesPage from "./pages/app/MensalidadesPage";
import RelatoriosPage from "./pages/app/RelatoriosPage";
import ConfiguracoesPage from "./pages/app/ConfiguracoesPage";
import DebugSyncPage from "./pages/app/DebugSyncPage";
import ColheitasPage from "./pages/app/ColheitasPage";
import FinanceiroEntradaPage from "./pages/app/FinanceiroEntradaPage";
import FinanceiroSaidaPage from "./pages/app/FinanceiroSaidaPage";
import FinanceiroResumoPage from "./pages/app/FinanceiroResumoPage";
import SolicitacoesPage from "./pages/SolicitacoesPage";
import AuthGuard from "./components/AuthGuard";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Requer auth */}
          <Route element={<AuthGuard />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route
              path="/onboarding/associado"
              element={<OnboardingAssociadoPage />}
            />
            <Route path="/onboarding/adm" element={<OnboardingADMPage />} />
            <Route path="/solicitacoes" element={<SolicitacoesPage />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/app/associados" element={<AssociadosPage />} />
            <Route
              path="/app/financeiro/entrada"
              element={<FinanceiroEntradaPage />}
            />
            <Route
              path="/app/financeiro/saida"
              element={<FinanceiroSaidaPage />}
            />
            <Route
              path="/app/financeiro/resumo"
              element={<FinanceiroResumoPage />}
            />
            <Route path="/app/editais" element={<EditaisPage />} />
            <Route
              path="/app/editais/:editalId"
              element={<EditalDetailPage />}
            />
            <Route path="/app/mensalidades" element={<MensalidadesPage />} />
            <Route path="/app/relatorios" element={<RelatoriosPage />} />
            <Route path="/app/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/debug/sync" element={<DebugSyncPage />} />
            <Route path="/app/colheitas" element={<ColheitasPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <PWAUpdatePrompt />
    </GoogleOAuthProvider>
  );
}

export default App;
