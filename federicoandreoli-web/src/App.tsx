import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { GuestOnlyRoute } from './auth/GuestOnlyRoute'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { CookieConsentBanner } from './components/CookieConsentBanner'
import { CookieSettingsTrigger } from './components/CookieSettingsTrigger'
import { ScrollToTop } from './components/ScrollToTop'
import { CookieConsentProvider, useCookieConsent } from './context/CookieConsentContext'
import { ItaliaGeoProvider } from './context/ItaliaGeoProvider'
import { loadGoogleFonts } from './lib/loadGoogleFonts'
import { HomePage } from './pages/HomePage'
import { RegisterWizardProvider } from './pages/auth/RegisterWizardContext'

const ComeFunzionaPage = lazy(() =>
  import('./pages/ComeFunzionaPage').then((m) => ({ default: m.ComeFunzionaPage })),
)
const ContattiPage = lazy(() =>
  import('./pages/ContattiPage').then((m) => ({ default: m.ContattiPage })),
)
const ProfilesDirectoryPage = lazy(() =>
  import('./pages/ProfilesDirectoryPage').then((m) => ({ default: m.ProfilesDirectoryPage })),
)
const ProfileDetailPage = lazy(() =>
  import('./pages/ProfileDetailPage').then((m) => ({ default: m.ProfileDetailPage })),
)
const StructureDetailPage = lazy(() =>
  import('./pages/StructureDetailPage').then((m) => ({ default: m.StructureDetailPage })),
)
const IscrizioneLandingPage = lazy(() =>
  import('./pages/IscrizioneLandingPage').then((m) => ({ default: m.IscrizioneLandingPage })),
)
const OpenPositionDetailPage = lazy(() =>
  import('./pages/OpenPositionDetailPage').then((m) => ({ default: m.OpenPositionDetailPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const RegisterIntentWizardPage = lazy(() =>
  import('./pages/auth/RegisterIntentWizardPage').then((m) => ({
    default: m.RegisterIntentWizardPage,
  })),
)
const RegisterFinePage = lazy(() =>
  import('./pages/auth/RegisterFinePage').then((m) => ({ default: m.RegisterFinePage })),
)
const OfferWizardPage = lazy(() =>
  import('./pages/auth/wizard/OfferWizardPage').then((m) => ({ default: m.OfferWizardPage })),
)
const SeekerWizardPage = lazy(() =>
  import('./pages/auth/wizard/SeekerWizardPage').then((m) => ({ default: m.SeekerWizardPage })),
)
const TerminiPage = lazy(() =>
  import('./pages/legal/TerminiPage').then((m) => ({ default: m.TerminiPage })),
)
const PrivacyPolicyPage = lazy(() =>
  import('./pages/legal/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })),
)
const CookiePolicyPage = lazy(() =>
  import('./pages/legal/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage })),
)
const DashboardGatePage = lazy(() =>
  import('./pages/dashboard/DashboardGatePage').then((m) => ({ default: m.DashboardGatePage })),
)
const ProfessionalDashboard = lazy(() =>
  import('./pages/dashboard/professional/ProfessionalDashboard').then((m) => ({
    default: m.ProfessionalDashboard,
  })),
)
const FamilyDashboard = lazy(() =>
  import('./pages/dashboard/family/FamilyDashboard').then((m) => ({ default: m.FamilyDashboard })),
)
const AgencyDashboard = lazy(() =>
  import('./pages/dashboard/agency/AgencyDashboard').then((m) => ({ default: m.AgencyDashboard })),
)
const StructureDashboard = lazy(() =>
  import('./pages/dashboard/structure/StructureDashboard').then((m) => ({
    default: m.StructureDashboard,
  })),
)
const AdminDashboard = lazy(() =>
  import('./pages/dashboard/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const BillingCheckoutReturnPage = lazy(() =>
  import('./pages/dashboard/billing/BillingCheckoutReturnPage').then((m) => ({
    default: m.BillingCheckoutReturnPage,
  })),
)
const BillingMockCheckoutPage = lazy(() =>
  import('./pages/dashboard/billing/BillingMockCheckoutPage').then((m) => ({
    default: m.BillingMockCheckoutPage,
  })),
)

function RegisterWizardRoot() {
  return (
    <RegisterWizardProvider>
      <Outlet />
    </RegisterWizardProvider>
  )
}

function GoogleFontsLoader() {
  const { consent } = useCookieConsent()

  useEffect(() => {
    if (consent?.functional) {
      loadGoogleFonts()
    }
  }, [consent?.functional])

  return null
}

function RouteFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted, #7A7268)' }}>
      Caricamento…
    </div>
  )
}

export default function App() {
  return (
    <CookieConsentProvider>
      <BrowserRouter>
        <ScrollToTop />
        <GoogleFontsLoader />
        <ItaliaGeoProvider>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/come-funziona" element={<ComeFunzionaPage />} />
                <Route path="/contatti" element={<ContattiPage />} />
                <Route path="/profili" element={<ProfilesDirectoryPage />} />
                <Route path="/profili/:id" element={<ProfileDetailPage />} />
                <Route path="/strutture/:id" element={<StructureDetailPage />} />
                <Route path="/iscriviti" element={<IscrizioneLandingPage />} />
                <Route path="/posizioni/:id" element={<OpenPositionDetailPage />} />
                <Route
                  path="/accedi"
                  element={
                    <GuestOnlyRoute>
                      <LoginPage />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/password-dimenticata"
                  element={
                    <GuestOnlyRoute>
                      <ForgotPasswordPage />
                    </GuestOnlyRoute>
                  }
                />
                <Route
                  path="/reimposta-password"
                  element={
                    <GuestOnlyRoute>
                      <ResetPasswordPage />
                    </GuestOnlyRoute>
                  }
                />
                <Route path="/termini" element={<TerminiPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/cookie" element={<CookiePolicyPage />} />
                {import.meta.env.DEV && (
                  <Route path="/dashboard" element={<DashboardGatePage />} />
                )}
                <Route
                  path="/dashboard/professionale"
                  element={
                    <ProtectedRoute allowedRoles={['professional']}>
                      <ProfessionalDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/professionale/piano/checkout"
                  element={
                    <ProtectedRoute allowedRoles={['professional']}>
                      <BillingMockCheckoutPage
                        audience="professional"
                        dashboardPath="/dashboard/professionale"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/professionale/piano/esito"
                  element={
                    <ProtectedRoute allowedRoles={['professional']}>
                      <BillingCheckoutReturnPage
                        audience="professional"
                        dashboardPath="/dashboard/professionale"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/famiglia"
                  element={
                    <ProtectedRoute allowedRoles={['public_user']}>
                      <FamilyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/agenzia"
                  element={
                    <ProtectedRoute allowedRoles={['agency']}>
                      <AgencyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/agenzia/piano/checkout"
                  element={
                    <ProtectedRoute allowedRoles={['agency']}>
                      <BillingMockCheckoutPage
                        audience="agency"
                        dashboardPath="/dashboard/agenzia"
                        successSection="abbonamento"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/agenzia/piano/esito"
                  element={
                    <ProtectedRoute allowedRoles={['agency']}>
                      <BillingCheckoutReturnPage
                        audience="agency"
                        dashboardPath="/dashboard/agenzia"
                        planSection="abbonamento"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/struttura"
                  element={
                    <ProtectedRoute allowedRoles={['structure']}>
                      <StructureDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/struttura/piano/checkout"
                  element={
                    <ProtectedRoute allowedRoles={['structure']}>
                      <BillingMockCheckoutPage
                        audience="structure"
                        dashboardPath="/dashboard/struttura"
                        successSection="abbonamento"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/struttura/piano/esito"
                  element={
                    <ProtectedRoute allowedRoles={['structure']}>
                      <BillingCheckoutReturnPage
                        audience="structure"
                        dashboardPath="/dashboard/struttura"
                        planSection="abbonamento"
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRoles={['platform_admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/registrazione"
                  element={
                    <GuestOnlyRoute>
                      <RegisterWizardRoot />
                    </GuestOnlyRoute>
                  }
                >
                  <Route index element={<Navigate to="intent" replace />} />
                  <Route path="intent" element={<RegisterIntentWizardPage />} />
                  <Route path="offro/:stepId" element={<OfferWizardPage />} />
                  <Route path="cerco/:stepId" element={<SeekerWizardPage />} />
                  <Route path="fine" element={<RegisterFinePage />} />
                  <Route path="*" element={<Navigate to="intent" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ItaliaGeoProvider>
        <CookieConsentBanner />
        <CookieSettingsTrigger />
      </BrowserRouter>
    </CookieConsentProvider>
  )
}
