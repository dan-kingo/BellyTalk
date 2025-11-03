import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/common/PrivateRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import HospitalsPage from './pages/HospitalsPage';
import ContentPage from './pages/ContentPage';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import ChatPage from './pages/ChatPage';
import OrdersPage from './pages/OrdersPage';
import CheckoutPage from './pages/CheckoutPage';
import ProductManagementPage from './pages/ProductManagementPage';
import OrderManagementPage from './pages/OrderManagementPage';
import AudioCallPage from './pages/AudioCallPage';
import VideoCallPage from './pages/VideoCallPage';
import GroupChatPage from './pages/GroupChatPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AgoraProvider } from './contexts/AgoraContext';

const App: React.FC = () => {
  return (
    <Router>
     <AgoraProvider>
       <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
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
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
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
              path="/content"
              element={
                <PrivateRoute>
                  <ContentPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/shop"
              element={
                <PrivateRoute>
                  <ShopPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/cart"
              element={
                <PrivateRoute>
                  <CartPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <OrdersPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <PrivateRoute>
                  <CheckoutPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <ErrorBoundary>
                    <ChatPage />
                  </ErrorBoundary>
                </PrivateRoute>
              }
            />

            <Route
              path="/manage/products"
              element={
                <PrivateRoute>
                  <ProductManagementPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/manage/orders"
              element={
                <PrivateRoute>
                  <OrderManagementPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/audio-call"
              element={
                <PrivateRoute>
                  <AudioCallPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/video-call"
              element={
                <PrivateRoute>
                  <VideoCallPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/group-chat"
              element={
                <PrivateRoute>
                  <GroupChatPage />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
     </AgoraProvider>
    </Router>
  );
};

export default App;
