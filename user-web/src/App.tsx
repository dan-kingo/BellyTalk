import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import PrivateRoute from "./components/common/PrivateRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import HospitalsPage from "./pages/HospitalsPage";
import ContentPage from "./pages/ContentPage";
import ShopPage from "./pages/ShopPage";
import CartPage from "./pages/CartPage";
import ChatPage from "./pages/ChatPage";
import OrdersPage from "./pages/OrdersPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import GroupChatPage from "./pages/GroupChatPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DoctorProfileCompletionPage from "./pages/DoctorProfileCompletionPage";
import DoctorPendingApprovalPage from "./pages/DoctorPendingApprovalPage";
import DoctorsListPage from "./pages/DoctorsListPage";
import DoctorDetailsPage from "./pages/DoctorDetailsPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import MyServicesPage from "./pages/MyServicesPage";
import DoctorBookingsPage from "./pages/DoctorBookingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import AudioCallPage from "./pages/AudioCallPage";
import VideoCallPage from "./pages/VideoCallPage";
import ResourcesPage from "./pages/ResourcesPage";
import ErrorBoundary from "./components/common/ErrorBoundary";
import DoctorOnboardingGuard from "./components/common/DoctorOnboardingGuard";
import { AgoraProvider } from "./contexts/AgoraContext";
import { GlobalCallDialog } from "./components/audio/GlobalCallDialog";
import { ToastContainer } from "react-toastify";
import SeoManager from "./components/common/SeoManager";
import PresenceHeartbeat from "./components/common/PresenceHeartbeat";

const App: React.FC = () => {
  return (
    <Router>
      <SeoManager />
      <ThemeProvider>
        <AuthProvider>
          <PresenceHeartbeat />
          <AgoraProvider>
            {/* Global Incoming Call Dialog - Works on all pages */}
            <GlobalCallDialog />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              pauseOnFocusLoss={false}
            />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <DashboardPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <ProfilePage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/hospitals"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <HospitalsPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/content"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <ContentPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/resources"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <ResourcesPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/shop"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <ShopPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/cart"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <CartPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <OrdersPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/checkout"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <CheckoutPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <PrivateRoute allowedRoles={["mother", "doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <ErrorBoundary>
                        <ChatPage />
                      </ErrorBoundary>
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/manage/products"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <ProductManagementPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/manage/orders"
                element={
                  <PrivateRoute>
                    <DoctorOnboardingGuard>
                      <OrderManagementPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctor/complete-profile"
                element={
                  <PrivateRoute allowedRoles={["doctor"]}>
                    <DoctorOnboardingGuard>
                      <DoctorProfileCompletionPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctor/pending-approval"
                element={
                  <PrivateRoute allowedRoles={["doctor"]}>
                    <DoctorOnboardingGuard>
                      <DoctorPendingApprovalPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/group-chat"
                element={
                  <PrivateRoute allowedRoles={["mother"]}>
                    <DoctorOnboardingGuard>
                      <GroupChatPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctors"
                element={
                  <PrivateRoute allowedRoles={["mother"]}>
                    <DoctorOnboardingGuard>
                      <DoctorsListPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctors/:doctorId"
                element={
                  <PrivateRoute allowedRoles={["mother"]}>
                    <DoctorOnboardingGuard>
                      <DoctorDetailsPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/bookings"
                element={
                  <PrivateRoute allowedRoles={["mother"]}>
                    <DoctorOnboardingGuard>
                      <MyBookingsPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctor/services"
                element={
                  <PrivateRoute allowedRoles={["doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <MyServicesPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/doctor/bookings"
                element={
                  <PrivateRoute allowedRoles={["doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <DoctorBookingsPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <PrivateRoute allowedRoles={["mother", "doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <NotificationsPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/audio-call"
                element={
                  <PrivateRoute allowedRoles={["mother", "doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <AudioCallPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route
                path="/video-call"
                element={
                  <PrivateRoute allowedRoles={["mother", "doctor", "admin"]}>
                    <DoctorOnboardingGuard>
                      <VideoCallPage />
                    </DoctorOnboardingGuard>
                  </PrivateRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AgoraProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
