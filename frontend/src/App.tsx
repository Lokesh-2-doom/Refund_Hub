import { useState } from 'react';

// Auth & Login Views
import { LoginGateway } from './Authentication_Page/LoginGateway';
import { StudentLoginForm } from './Authentication_Page/Login_Page';
import { StudentRegistrationForm } from './Authentication_Page/Registration_Page';
import { RegistrationSuccess } from './Authentication_Page/RegistrationSuccess';

// Role-based Dashboards
import { SuperAdminDashboard } from './SuperAdmin_Page/SuperAdminDashboard';
import { SecretaryDashboard } from './Secretary_Page/SecretaryDashboard';
import { StudentDashboard } from './Student_Page/StudentDashboard';

// BASE URL defined
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

// ─── Types ───────────────────────────────────────────────────────────────────
type LoginView = 'gateway' | 'student' | 'registerStudent' | 'registerSuccess';

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [loginView, setLoginView] = useState<LoginView>('gateway');

  const [registrationData, setRegistrationData] = useState<{
    name: string;
    studentId: string;
  } | null>(null);

  // ─── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/logout`, { method: 'POST' });
    } catch {
      // Silent fail — still log out locally
    }

    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');

    setIsAuthenticated(false);
    setLoginView('gateway');
  };

  // ─── Authenticated: route to correct dashboard ────────────────────────────

  if (isAuthenticated) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.isSuperAdmin) return <SuperAdminDashboard onLogout={handleLogout}/>;
    if (user.isSecretary) return <SecretaryDashboard onLogout={handleLogout} department={user.department || "general"}/>

    return <StudentDashboard onLogout={handleLogout} />;     // Default: student
  }

  // ─── Unauthenticated: login / register flow ───────────────────────────────

  switch (loginView) {
    case 'gateway':
      return (
        <LoginGateway
          onLoginClick={() => setLoginView('student')}
          onRegisterClick={() => setLoginView('registerStudent')}
        />
      );

    // ── Student Login ──
    case 'student':
      return (
        <StudentLoginForm
          onBack={() => setLoginView('gateway')}
          onSignIn={(user: any) => {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(user));
            setIsAuthenticated(true);
          }}
          onRegister={() => setLoginView('registerStudent')}
        />
      );

    // ── Student Registration ──
    case 'registerStudent':
      return (
        <StudentRegistrationForm
          onBack={() => setLoginView('gateway')}
          onComplete={(data: any) => {
            setRegistrationData({ name: data.fullName, studentId: data.studentId });
            setLoginView('registerSuccess');
          }}
        />
      );

    // ── Registration Success ──
    case 'registerSuccess':
      return (
        <RegistrationSuccess
          onGoToLogin={() => {
            setRegistrationData(null);
            setLoginView('student');
          }}
          studentName={registrationData?.name || 'Student'}
          studentId={registrationData?.studentId || 'STU-XXXX-XXX'}
        />
      );

    default:
      return null;
  }
}

export default App;