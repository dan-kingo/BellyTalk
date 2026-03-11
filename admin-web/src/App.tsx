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
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProviderApprovalsPage from "./pages/ProviderApprovalsPage";
import UsersPage from "./pages/UsersPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ContentPage from "./pages/ContentPage";
import HospitalsPage from "./pages/HospitalsPage";
import BookingsQueuePage from "./pages/BookingsQueuePage";

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <UsersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/providers"
              element={
                <PrivateRoute>
                  <ProviderApprovalsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/contents"
              element={
                <PrivateRoute>
                  <ContentPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/hospitals"
              element={
                <PrivateRoute>
                  <HospitalsPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/bookings-queue"
              element={
                <PrivateRoute>
                  <BookingsQueuePage />
                </PrivateRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
