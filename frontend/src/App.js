import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './AuthContext';
import PrivateRoute from './PrivateRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MasterData from './pages/MasterData';
import MyQuestions from './pages/MyQuestions';
import McqForm from './pages/McqForm';
import McqDetail from './pages/McqDetail';
import PendingReviews from './pages/PendingReviews';
import QuestionBank from './pages/QuestionBank';
import BulkUpload from './pages/BulkUpload';
import Home from './pages/Home';
import ScreenshotMcq from './pages/ScreenshotMcq';
import Leaderboard from './pages/Leaderboard';
import UserManagement from './pages/UserManagement';
import ReviewerDashboard from './pages/ReviewerDashboard';
import ReviewerMetrics from './pages/ReviewerMetrics';
import AuditLog from './pages/AuditLog';
import KanbanBoard from './pages/KanbanBoard';
import Quiz from './pages/Quiz';
import Analytics from './pages/Analytics';
import QuizBuilder from './pages/QuizBuilder';
import TakeQuiz from './pages/TakeQuiz';
import QuizAttempts from './pages/QuizAttempts';
import Inbox from './pages/Inbox';
import ChatBot from './components/ChatBot';

// Hide the chatbot while a quiz is in progress so it cannot be used to cheat
function ChatBotGuard() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/quiz/take/')) return null;
  return <ChatBot />;
}

// If an exam is active and the visitor is NOT a logged-in SME/admin,
// redirect every other route back to the exam so they cannot cheat by
// browsing the app while sitting the test.
function ExamLockGuard() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const activeToken = sessionStorage.getItem('activeExamToken');
  if (activeToken && !user && !pathname.startsWith('/quiz/take/')) {
    return <Navigate to={`/quiz/take/${activeToken}`} replace />;
  }
  return null;
}

export default function App() {
  useEffect(() => {
    // Apply global dark/light mode on startup based on saved preference (default: dark)
    const saved = localStorage.getItem('dashTheme');
    if (saved === 'light') {
      document.body.classList.remove('dark-mode');
    } else {
      document.body.classList.add('dark-mode');
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/my-questions" element={<PrivateRoute><MyQuestions /></PrivateRoute>} />
          <Route path="/mcq/create" element={<PrivateRoute><McqForm mode="create" /></PrivateRoute>} />
          <Route path="/mcq/:id" element={<PrivateRoute><McqDetail /></PrivateRoute>} />
          <Route path="/mcq/:id/edit" element={<PrivateRoute><McqForm mode="edit" /></PrivateRoute>} />
          <Route path="/pending-reviews" element={<PrivateRoute><PendingReviews /></PrivateRoute>} />
          <Route path="/reviewer-dashboard" element={<PrivateRoute><ReviewerDashboard /></PrivateRoute>} />
          <Route path="/question-bank" element={<PrivateRoute requiredRole="ADMIN"><QuestionBank /></PrivateRoute>} />
          <Route path="/bulk-upload" element={<PrivateRoute><BulkUpload /></PrivateRoute>} />
          <Route path="/screenshot-mcq" element={<PrivateRoute><ScreenshotMcq /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute requiredRole="ADMIN"><UserManagement /></PrivateRoute>} />
          <Route path="/reviewer-metrics" element={<PrivateRoute requiredRole="ADMIN"><ReviewerMetrics /></PrivateRoute>} />
          <Route path="/audit-log" element={<PrivateRoute requiredRole="ADMIN"><AuditLog /></PrivateRoute>} />
          <Route path="/master-data" element={<PrivateRoute requiredRole="ADMIN"><MasterData /></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute><KanbanBoard /></PrivateRoute>} />
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/quiz-builder" element={<PrivateRoute><QuizBuilder /></PrivateRoute>} />
          <Route path="/quiz/take/:token" element={<TakeQuiz />} />
          <Route path="/quiz-sessions/:id/attempts" element={<PrivateRoute><QuizAttempts /></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={30000} />
        <ChatBotGuard />
        <ExamLockGuard />
      </BrowserRouter>
    </AuthProvider>
  );
}
