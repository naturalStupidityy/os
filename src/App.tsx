import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { getDefaultRoute } from "@/lib/auth";

// Pages
import LoginPage from "@/app/login/page";
import DashboardPage from "@/app/dashboard/page";
import SessionsPage from "@/app/sessions/page";
import ScannerPage from "@/app/scanner/page";
import ExamPage from "@/app/exam/page";
import ExamDetailPage from "@/app/exam/[examId]/page";
import CertificatesPage from "@/app/certificates/page";
import QRGeneratePage from "@/app/qr-generate/page";
import RosterPage from "@/app/roster/page";
import StatsPage from "@/app/stats/page";
import CommandCenterPage from "@/app/command-center/page";
import ConfigPage from "@/app/config/page";
import UsersPage from "@/app/users/page";
import APIStatusPage from "@/app/api-status/page";
import ResultsPage from "@/app/results/page";
import ReportsPage from "@/app/reports/page";

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Volunteer Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute requiredRoles={["volunteer", "instructor", "admin"]}><SessionsPage /></ProtectedRoute>} />
      <Route path="/scanner" element={<ProtectedRoute requiredRoles={["volunteer", "admin"]}><ScannerPage /></ProtectedRoute>} />
      <Route path="/exam" element={<ProtectedRoute requiredRoles={["volunteer", "assessment_admin", "admin"]}><ExamPage /></ProtectedRoute>} />
      <Route path="/exam/:examId" element={<ProtectedRoute requiredRoles={["volunteer", "assessment_admin", "admin"]}><ExamDetailPage /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute requiredRoles={["volunteer", "assessment_admin", "admin"]}><CertificatesPage /></ProtectedRoute>} />

      {/* Instructor Routes */}
      <Route path="/qr-generate" element={<ProtectedRoute requiredRoles={["instructor", "admin"]}><QRGeneratePage /></ProtectedRoute>} />
      <Route path="/roster" element={<ProtectedRoute requiredRoles={["instructor", "admin"]}><RosterPage /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute requiredRoles={["instructor", "admin"]}><StatsPage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/command-center" element={<ProtectedRoute requiredRoles={["admin"]}><CommandCenterPage /></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute requiredRoles={["admin"]}><ConfigPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute requiredRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
      <Route path="/api-status" element={<ProtectedRoute requiredRoles={["admin"]}><APIStatusPage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute requiredRoles={["assessment_admin", "admin"]}><ResultsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredRoles={["admin", "assessment_admin"]}><ReportsPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
