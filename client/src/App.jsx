import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// 301-style redirect: /workers/:id → /pro/:id
function WorkerProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/pro/${id}`} replace />;
}
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Landing from './pages/Landing';
import Workers from './pages/Workers';
import WorkerProfile from './pages/WorkerProfile';
import BusinessProfilePage from './pages/BusinessProfile';
import BusinessesPage from './pages/Businesses';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/client/Dashboard';
import WorkerDashboard from './pages/worker/Dashboard';
import ProfileSettings from './pages/worker/ProfileSettings';
import WorkerSubscription from './pages/worker/Subscription';
import WorkerOnboarding from './pages/worker/Onboarding';
import BusinessDashboard from './pages/business/Dashboard';
import BusinessOnboarding from './pages/business/Onboarding';
import AdminPanel from './pages/admin/Panel';
import Browse from './pages/Browse';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import WorkerConsultations from './pages/worker/Consultations';
import WorkerLiveClasses from './pages/worker/LiveClasses';
import MyLiveClasses from './pages/client/MyLiveClasses';
import LiveClassBrowse from './pages/LiveClassBrowse';
import LiveClassDetail from './pages/LiveClassDetail';
import LiveClassRoom   from './pages/LiveClassRoom';
import ShopBrowse      from './pages/ShopBrowse';
import ShopItemDetail  from './pages/ShopItemDetail';
import WorkerShopPage  from './pages/worker/Shop';
import BookConsultation from './pages/BookConsultation';
import Bookings from './pages/Bookings';
import ConsultationRoom from './pages/ConsultationRoom';

function ProtectedRoute({ children, role }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <ScrollToTop />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/browse"    element={<Navigate to="/services" replace />} />
          <Route path="/services"  element={<Browse />} />
          <Route path="/workers"     element={<Navigate to="/professionals" replace />} />
          <Route path="/workers/:id" element={<WorkerProfileRedirect />} />
          <Route path="/professionals" element={<Workers />} />
          <Route path="/pro/:id"       element={<WorkerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute role="client">
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker"
            element={
              <ProtectedRoute role="worker">
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker/profile"
            element={
              <ProtectedRoute role="worker">
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker/onboarding"
            element={
              <ProtectedRoute role="worker">
                <WorkerOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker/subscription"
            element={
              <ProtectedRoute role="worker">
                <WorkerSubscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker/consultations"
            element={
              <ProtectedRoute role="worker">
                <WorkerConsultations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/worker/live-classes"
            element={
              <ProtectedRoute role="worker">
                <WorkerLiveClasses />
              </ProtectedRoute>
            }
          />
          {/* ── Client: enrolled live classes ── */}
          <Route
            path="/dashboard/my-classes"
            element={
              <ProtectedRoute>
                <MyLiveClasses />
              </ProtectedRoute>
            }
          />

          {/* ── Live Classes ── */}
          <Route path="/live-classes"       element={<LiveClassBrowse />} />
          <Route path="/live-classes/:id"   element={<LiveClassDetail />} />

          {/* ── Art & Craft Shop ── */}
          <Route path="/shop"     element={<ShopBrowse />} />
          <Route path="/shop/:id" element={<ShopItemDetail />} />
          <Route
            path="/dashboard/worker/shop"
            element={
              <ProtectedRoute role="worker">
                <WorkerShopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-classes/:id/room"
            element={
              <ProtectedRoute>
                <LiveClassRoom />
              </ProtectedRoute>
            }
          />

          <Route path="/consultations/book/:workerId/:offeringId" element={<BookConsultation />} />
          <Route
            path="/dashboard/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultations/:bookingId/room"
            element={
              <ProtectedRoute>
                <ConsultationRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/businesses"     element={<BusinessesPage />} />
          <Route path="/businesses/:id" element={<BusinessProfilePage />} />
          <Route
            path="/dashboard/business"
            element={
              <ProtectedRoute role="business">
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/business/onboarding"
            element={
              <ProtectedRoute role="business">
                <BusinessOnboarding />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password"      element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/terms"   element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
