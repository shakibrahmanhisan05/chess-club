import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import HomePage from "./pages/HomePage";
import MembersPage from "./pages/MembersPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import TournamentsPage from "./pages/TournamentsPage";
import NewsPage from "./pages/NewsPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import AboutPage from "./pages/AboutPage";
import StatisticsPage from "./pages/StatisticsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import MemberLoginPage from "./pages/MemberLoginPage";
import MemberRegisterPage from "./pages/MemberRegisterPage";
import MemberDashboardPage from "./pages/MemberDashboardPage";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            richColors 
            theme="dark"
            toastOptions={{
              style: {
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.1)',
              }
            }}
          />
          <Routes>
            {/* Public routes with Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="members/:memberId" element={<MemberProfilePage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="tournaments" element={<TournamentsPage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>
            
            {/* Admin routes (no layout) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Member auth routes (no layout) */}
            <Route path="/member/login" element={<MemberLoginPage />} />
            <Route path="/member/register" element={<MemberRegisterPage />} />
            <Route path="/member/dashboard" element={<MemberDashboardPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
