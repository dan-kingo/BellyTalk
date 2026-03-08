import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/layout/Navbar";
import hero from "../assets/hero.png";
const HomePage: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const featureCards = [
    {
      title: "Mother-Focused Journey",
      description:
        "Track milestones, learn week-by-week, and get practical support tailored to your stage.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      ),
    },
    {
      title: "Real-Time Counseling",
      description:
        "Secure chat and video sessions help counselors guide families with empathy and speed.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      ),
    },
    {
      title: "Clinician Dashboard",
      description:
        "Doctors can review updates, manage consultations, and provide safe, consistent care remotely.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
    },
  ];

  const testimonials = [
    {
      quote:
        "BellyTalk gave me peace of mind during my third trimester. The counselor response time is amazing.",
      name: "Nadia M.",
      role: "Mother, 31 weeks",
    },
    {
      quote:
        "As a clinician, I finally have one place to monitor patient updates and follow-ups without friction.",
      name: "Dr. T. Mensah",
      role: "Obstetrician",
    },
    {
      quote:
        "We support more families now with better continuity of care and fewer missed check-ins.",
      name: "Lina K.",
      role: "Perinatal Counselor",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffe6ef_0%,#fff7f9_45%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_right,#3f1d27_0%,#1f2937_45%,#111827_100%)] transition-colors duration-300 flex flex-col">
      <Navbar onMenuClick={() => undefined} />

      {/* Main Content */}
      <main className="grow pt-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 min-h-[calc(100vh-8rem)] flex items-center">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="stagger-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-800 bg-white/80 dark:bg-gray-800/80 px-4 py-2 text-sm font-semibold text-primary-700 dark:text-primary-300 backdrop-blur-sm">
                Trusted by care teams in 12+ cities
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-black text-gray-900 dark:text-white leading-tight">
                Support Every
                <span className="block text-primary-600 dark:text-primary-400">
                  Mother&apos;s Journey
                </span>
                <span className="block">With Better Care</span>
              </h1>

              <p className="mt-5 max-w-xl text-gray-600 dark:text-gray-300 text-lg sm:text-xl">
                BellyTalk connects mothers, counselors, and doctors in one
                secure space for prenatal and postnatal care that feels
                personal, responsive, and reliable.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3 rounded-xl text-base sm:text-lg font-semibold shadow-lg shadow-primary-200/60 dark:shadow-primary-900/40 transition-transform hover:-translate-y-0.5"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3 rounded-xl text-base sm:text-lg font-semibold shadow-lg shadow-primary-200/60 dark:shadow-primary-900/40 transition-transform hover:-translate-y-0.5"
                    >
                      Get Started Free
                    </Link>
                    <Link
                      to="/login"
                      className="bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-primary-700/10 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 px-7 py-3 rounded-xl text-base sm:text-lg font-semibold transition-transform hover:-translate-y-0.5"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: "3K+", label: "Active users" },
                  { value: "98%", label: "Positive feedback" },
                  { value: "24/7", label: "Care availability" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/70 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4"
                  >
                    <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                      {item.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative isolate">
              <div className="absolute z-20 -top-6 -left-5 md:-left-10 rounded-2xl bg-primary-600 text-white px-4 py-2 shadow-xl animate-badge-bounce">
                Over 3K active users
              </div>
              <div className="absolute z-20 -bottom-6 -right-2 md:-right-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-xl animate-badge-bounce-delay">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Average session rating
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  4.9/5.0
                </div>
              </div>

              <div className="relative z-10 overflow-hidden">
                <img
                  src={hero}
                  alt="Healthcare professional supporting an expecting mother"
                  className="w-full h-[420px] sm:h-[520px] object-ce"
                />
                <div className="absolute inset-x-0 bottom-0 p-6 ">
                  <p className="text-white text-sm uppercase tracking-[0.2em]">
                    Compassionate and secure
                  </p>
                  <p className="text-white text-xl font-semibold mt-1">
                    Virtual and in-person care coordination
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Built For Every Part of Care
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              A single platform where mothers, counselors, and doctors
              collaborate with clear communication and confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureCards.map(({ title, description, icon }) => (
              <div
                key={title}
                className="group bg-white/85 dark:bg-gray-800/85 p-8 rounded-2xl border border-white/70 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <svg
                    className="w-7 h-7 text-primary-600 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {icon}
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-3xl border border-primary-100 dark:border-gray-700 bg-linear-to-br from-white via-primary-50/40 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-8 sm:p-10 lg:p-12 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-primary-600 dark:text-primary-300 font-semibold uppercase tracking-[0.15em] text-sm">
                  Feedback
                </p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white max-w-2xl">
                  Families and care professionals trust BellyTalk daily
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 max-w-lg">
                Real outcomes from real users who need fast support, clear
                communication, and continuity of care.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((item, index) => (
                <article
                  key={item.name}
                  className="bg-white/90 dark:bg-gray-900/70 border border-primary-100 dark:border-gray-700 rounded-2xl p-6 text-gray-900 dark:text-white shadow-sm dark:shadow-none animate-rise-in"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <p className="text-gray-700 dark:text-gray-100 leading-relaxed">
                    &quot;{item.quote}&quot;
                  </p>
                  <p className="mt-5 font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-300">
                    {item.role}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-3xl border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/20 p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                Ready to modernize maternal care?
              </h2>
              <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-2xl">
                Launch faster communication, better follow-up, and connected
                care experiences for every mother.
              </p>
            </div>

            {user ? (
              <Link
                to="/dashboard"
                className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3 rounded-xl text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5"
              >
                Continue to Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-7 py-3 rounded-xl text-base font-semibold shadow-md transition-transform hover:-translate-y-0.5"
              >
                Create Your Account
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-primary-100 dark:border-gray-800 bg-linear-to-b from-white/85 via-primary-50/30 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-800 dark:text-gray-100">
        <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.09)_0%,transparent_42%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-1">
              <h3 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                BellyTalk
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Connecting mothers with healthcare professionals for
                comprehensive prenatal and postnatal care support.
              </p>
              <div className="flex space-x-4">
                <a
                  key="mail"
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                  aria-label="mail"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8.5v7A2.5 2.5 0 005.5 18h13a2.5 2.5 0 002.5-2.5v-7"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 8.5L12 13 3 8.5"
                    />
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="12"
                      rx="2"
                      stroke="none"
                      fill="none"
                    />
                  </svg>
                </a>

                <a
                  key="twitter"
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                  aria-label="twitter"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 7v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>

                <a
                  key="instagram"
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                  aria-label="instagram"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.5 6.5h.01"
                    />
                  </svg>
                </a>

                <a
                  key="linkedin"
                  href="#"
                  className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                  aria-label="linkedin"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11v5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 8v.01"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 16v-4a2 2 0 012-2c1.2 0 2 1 2 2v4"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Quick Links
              </h4>
              <ul className="space-y-2">
                {["Home", "About", "Services", "Contact", "Blog"].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        to={`/${item.toLowerCase() === "home" ? "" : item.toLowerCase()}`}
                        className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                      >
                        {item}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Resources
              </h4>
              <ul className="space-y-2">
                {[
                  "Help Center",
                  "Community",
                  "Privacy Policy",
                  "Terms of Service",
                  "FAQ",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Contact Us
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  123 Healthcare St, Medical City
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  +1 (555) 123-4567
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  support@bellytalk.com
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-primary-100 dark:border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center md:text-left">
              © {currentYear} BellyTalk. All rights reserved.
              <span className="text-primary-600 dark:text-primary-300 ml-1">
                Empowering mothers through every step of their journey.
              </span>
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a
                href="#"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 text-sm transition-colors duration-300"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 text-sm transition-colors duration-300"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 text-sm transition-colors duration-300"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
