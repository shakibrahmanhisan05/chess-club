import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import HomePage from "./pages/HomePage";
import MembersPage from "./pages/MembersPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import TournamentsPage from "./pages/TournamentsPage";
import NewsPage from "./pages/NewsPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import AboutPage from "./pages/AboutPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="members/:memberId" element={<MemberProfilePage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
