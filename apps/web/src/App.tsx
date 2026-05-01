import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import OnboardingAssociadoPage from "./pages/onboarding/OnboardingAssociadoPage";
import OnboardingADMPage from "./pages/onboarding/OnboardingADMPage";
import AppPage from "./pages/app/AppPage";
import AssociadosPage from "./pages/app/AssociadosPage";
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
            <Route path="/onboarding/associado" element={<OnboardingAssociadoPage />} />
            <Route path="/onboarding/adm" element={<OnboardingADMPage />} />
            <Route path="/solicitacoes" element={<SolicitacoesPage />} />
            <Route path="/app" element={<AppPage />} />
            <Route path="/app/associados" element={<AssociadosPage />} />
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


