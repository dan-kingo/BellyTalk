import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profile = await login(email, password);
      toast.success("Logged in successfully.");

      if (profile?.role === "doctor" && profile.role_status !== "approved") {
        const hasDoctorSubmission =
          Boolean(profile.extra?.doctor_profile) ||
          Boolean(profile.extra?.completion_submitted_at) ||
          (Array.isArray(profile.extra?.verification_documents) &&
            profile.extra.verification_documents.length > 0);

        navigate(
          hasDoctorSubmission
            ? "/doctor/pending-approval"
            : "/doctor/complete-profile",
        );
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        "Failed to login. Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-transparent focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer py-2 px-4 rounded-xl text-white font-semibold bg-primary-600 hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            <Link
              to="/forgot-password"
              className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
