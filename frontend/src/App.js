import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './AuthContext';
import PrivateRoute from './PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ChatBot from './components/ChatBot';
import WellnessReminder from './components/WellnessReminder';
import GlobalSoundListener from './components/GlobalSoundListener';
import KeyboardShortcuts from './components/KeyboardShortcuts';

// Critical pages — loaded eagerly (login flow)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';

// Lazy-loaded pages — loaded on demand for faster initial load
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const MasterData = lazy(() => import('./pages/MasterData'));
const MyQuestions = lazy(() => import('./pages/MyQuestions'));
const McqForm = lazy(() => import('./pages/McqForm'));
const McqDetail = lazy(() => import('./pages/McqDetail'));
const PendingReviews = lazy(() => import('./pages/PendingReviews'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const BulkUpload = lazy(() => import('./pages/BulkUpload'));
const ScreenshotMcq = lazy(() => import('./pages/ScreenshotMcq'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ReviewerDashboard = lazy(() => import('./pages/ReviewerDashboard'));
const ReviewerMetrics = lazy(() => import('./pages/ReviewerMetrics'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Analytics = lazy(() => import('./pages/Analytics'));
const QuizBuilder = lazy(() => import('./pages/QuizBuilder'));
const TakeQuiz = lazy(() => import('./pages/TakeQuiz'));
const QuizAttempts = lazy(() => import('./pages/QuizAttempts'));
const Inbox = lazy(() => import('./pages/Inbox'));
const LiveJoin = lazy(() => import('./pages/LiveJoin'));
const LiveLobby = lazy(() => import('./pages/LiveLobby'));
const LiveHost = lazy(() => import('./pages/LiveHost'));
const LivePlay = lazy(() => import('./pages/LivePlay'));
const LiveResults = lazy(() => import('./pages/LiveResults'));
const LiveQuiz = lazy(() => import('./pages/LiveQuiz'));
const LiveSessionDetail = lazy(() => import('./pages/LiveSessionDetail'));
const ResumeInterview = lazy(() => import('./pages/ResumeInterview'));
const CodingQuestion = lazy(() => import('./pages/CodingQuestion'));
const AIStudio = lazy(() => import('./pages/AIStudio'));
const QuestionTypes = lazy(() => import('./pages/QuestionTypes'));
const QuestionTypeCreator = lazy(() => import('./pages/QuestionTypeCreator'));
const RuleBook = lazy(() => import('./pages/RuleBook'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));

// Hide the chatbot while a quiz is in progress so it cannot be used to cheat
function ChatBotGuard() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/quiz/take/')) return null;
  if (pathname.startsWith('/live/')) return null;
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
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner" style={{width:40,height:40,border:'4px solid rgba(255,255,255,0.2)',borderTop:'4px solid #A100FF',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/my-questions" element={<PrivateRoute><MyQuestions /></PrivateRoute>} />
          <Route path="/mcq/create" element={<PrivateRoute><McqForm mode="create" /></PrivateRoute>} />
          <Route path="/coding/create" element={<PrivateRoute><CodingQuestion /></PrivateRoute>} />
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
          <Route path="/admin-settings" element={<PrivateRoute requiredRole="ADMIN"><AdminSettings /></PrivateRoute>} />
          <Route path="/kanban" element={<PrivateRoute><KanbanBoard /></PrivateRoute>} />
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/quiz-builder" element={<PrivateRoute><QuizBuilder /></PrivateRoute>} />
          <Route path="/quiz/take/:token" element={<TakeQuiz />} />
          <Route path="/quiz-sessions/:id/attempts" element={<PrivateRoute><QuizAttempts /></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
          <Route path="/smart-interview-kit" element={<PrivateRoute><ResumeInterview /></PrivateRoute>} />
          <Route path="/ai-studio" element={<PrivateRoute><AIStudio /></PrivateRoute>} />
          <Route path="/question-types" element={<PrivateRoute><QuestionTypes /></PrivateRoute>} />
          <Route path="/question-type-create/:typeId" element={<PrivateRoute><QuestionTypeCreator /></PrivateRoute>} />
          <Route path="/rulebook" element={<PrivateRoute><RuleBook /></PrivateRoute>} />
          {/* Live Quiz Battle routes */}
          <Route path="/live" element={<PrivateRoute><LiveQuiz /></PrivateRoute>} />
          <Route path="/live/join" element={<LiveJoin />} />
          <Route path="/live/join/:pin" element={<LiveJoin />} />
          <Route path="/live/lobby/:sessionId" element={<LiveLobby />} />
          <Route path="/live/host/:sessionId" element={<PrivateRoute><LiveHost /></PrivateRoute>} />
          <Route path="/live/play/:sessionId" element={<LivePlay />} />
          <Route path="/live/results/:sessionId" element={<LiveResults />} />
          <Route path="/live/sessions/:sessionId" element={<PrivateRoute><LiveSessionDetail /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <ToastContainer position="top-right" autoClose={30000} />
        <ChatBotGuard />
        <WellnessReminder />
        <GlobalSoundListener />
        <KeyboardShortcuts />
        <ExamLockGuard />
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
