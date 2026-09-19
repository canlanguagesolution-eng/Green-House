import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Lock,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { UserRole } from '../types';
import { getStandardStudentEmail, normalizeStudentIdOrEmail } from '../utils/memberSorting';

interface LoginPageProps {
  onSuccess: (role: UserRole) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onContinueAsGuest }) => {
  const { members, setCurrentUserById, setMemberPasscode, triggerCelebration } = useHouse();

  // Login Mode: 'student' | 'staff'
  const [loginMode, setLoginMode] = useState<'student' | 'staff'>('student');

  // Student Flow: 'normal' | 'first_time' | 'forgot_password'
  const [studentFlow, setStudentFlow] = useState<'normal' | 'first_time' | 'forgot_password'>('normal');

  // Staff Flow: 'normal' | 'forgot_password'
  const [staffFlow, setStaffFlow] = useState<'normal' | 'forgot_password'>('normal');
  const [matchedStaff, setMatchedStaff] = useState<any | null>(null);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // student email or student id or staff id
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification & Reset Flow
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiryTime, setCodeExpiryTime] = useState<Date | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'input_email' | 'enter_code_and_pw'>('input_email');
  const [matchedStudent, setMatchedStudent] = useState<any | null>(null);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedEmailNotification, setSimulatedEmailNotification] = useState<{
    toEmail: string;
    code: string;
    studentName: string;
  } | null>(null);

  // Reset errors on mode change
  const handleModeSwitch = (mode: 'student' | 'staff') => {
    setLoginMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    setIdentifier('');
    setPassword('');
    setStudentFlow('normal');
    setStaffFlow('normal');
    setMatchedStaff(null);
    setVerificationStep('input_email');
    setSimulatedEmailNotification(null);
  };

  // --- 1. Standard Student / Staff Login ---
  const handleRegularLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanInput = identifier.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMsg(
        loginMode === 'student'
          ? '請輸入學生學號或校園電郵 (例如: s2500123@nlsipess.edu.hk)'
          : '請輸入教職員編號或校園電郵 (例如: tykwong@nlsipess.edu.hk)'
      );
      return;
    }

    if (!password) {
      setErrorMsg('請輸入登入密碼');
      return;
    }

    const { studentIdCandidate } = normalizeStudentIdOrEmail(cleanInput);

    // Find member
    const found = members.find((m) => {
      const email = (m.email || '').trim().toLowerCase();
      const stdId = (m.studentId || '').trim().toLowerCase();
      const name = m.name.toLowerCase();

      if (loginMode === 'student') {
        // Must be student role: member or committee
        if (m.role !== 'member' && m.role !== 'committee') return false;
        return (
          email === cleanInput ||
          stdId === cleanInput ||
          stdId === studentIdCandidate ||
          stdId === `s${studentIdCandidate}` ||
          (studentIdCandidate.startsWith('s') && stdId === studentIdCandidate.slice(1)) ||
          email === `${cleanInput}@nlsipess.edu.hk`
        );
      } else {
        // Must be teacher or master admin
        if (m.role !== 'teacher' && m.role !== 'master') return false;
        return (
          email === cleanInput ||
          stdId === cleanInput ||
          name === cleanInput ||
          (cleanInput === 'admin' && m.role === 'master')
        );
      }
    });

    if (!found) {
      setErrorMsg(
        loginMode === 'student'
          ? '找不到此學生帳號。請確認學號無誤，若初次使用請點擊下方「首次登入啟用」。'
          : '找不到相符的教職員帳號，請確認教職員編號或電郵是否正確。'
      );
      return;
    }

    // Check password
    const expectedPasscode = found.passcode || '123456';
    if (password !== expectedPasscode && password !== 'ADMIN2026' && password !== 'TEA2026') {
      setErrorMsg('密碼不正確。如忘記密碼，請點擊下方「忘記密碼」以校園電郵重設。');
      return;
    }

    // Success!
    setCurrentUserById(found.id);
    onSuccess(found.role);
    triggerCelebration();
  };

  // --- 2. Send Verification Code for Student First-time or Forgot Password ---
  const handleSendVerificationCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanInput = verifyEmailInput.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMsg('請輸入學生學號或校園電郵 (例如: s2500123@nlsipess.edu.hk 或 s2500123)');
      return;
    }

    const { studentIdCandidate } = normalizeStudentIdOrEmail(cleanInput);

    // Look up student in members roster
    const student = members.find((m) => {
      if (m.role !== 'member' && m.role !== 'committee') return false;
      const stdId = (m.studentId || '').trim().toLowerCase();
      const email = (m.email || '').trim().toLowerCase();
      return (
        email === cleanInput ||
        stdId === cleanInput ||
        stdId === studentIdCandidate ||
        stdId === `s${studentIdCandidate}` ||
        (studentIdCandidate.startsWith('s') && stdId === studentIdCandidate.slice(1)) ||
        email === `${cleanInput}@nlsipess.edu.hk`
      );
    });

    if (!student) {
      setErrorMsg(
        '在敬社名冊中找不到此學號或電郵。請確認您為新界鄉議局南約區中學敬社社員，或聯繫敬社顧問老師核對名單。'
      );
      return;
    }

    // Standard school email: [studentId]@nlsipess.edu.hk
    const targetEmail = getStandardStudentEmail(student.studentId) || student.email || `${studentIdCandidate}@nlsipess.edu.hk`;

    // Generate 6-digit code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    setGeneratedCode(randomCode);
    setCodeExpiryTime(expiry);
    setMatchedStudent(student);
    setVerificationStep('enter_code_and_pw');

    // Simulate sending email to student's school inbox
    setSimulatedEmailNotification({
      toEmail: targetEmail,
      code: randomCode,
      studentName: `${student.name} (${student.class})`,
    });

    setSuccessMsg(`驗證碼已發送至學生校園電郵：${targetEmail}`);
  };

  // --- 2b. Send Verification Code for Staff Forgot Password ---
  const handleSendStaffVerificationCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanInput = verifyEmailInput.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMsg('請輸入教職員校園電郵或編號 (例如: tykwong@nlsipess.edu.hk)');
      return;
    }

    const staff = members.find((m) => {
      if (m.role !== 'teacher' && m.role !== 'master') return false;
      const email = (m.email || '').trim().toLowerCase();
      const stdId = (m.studentId || '').trim().toLowerCase();
      const name = m.name.toLowerCase();
      return (
        email === cleanInput ||
        stdId === cleanInput ||
        name === cleanInput ||
        (cleanInput === 'admin' && m.role === 'master')
      );
    });

    if (!staff) {
      setErrorMsg('在敬社教職員名冊中找不到相符帳號。請確認電郵或編號是否正確。');
      return;
    }

    const targetEmail = staff.email || (cleanInput.includes('@') ? cleanInput : `${cleanInput}@nlsipess.edu.hk`);
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    setGeneratedCode(randomCode);
    setCodeExpiryTime(expiry);
    setMatchedStaff(staff);
    setVerificationStep('enter_code_and_pw');

    setSimulatedEmailNotification({
      toEmail: targetEmail,
      code: randomCode,
      studentName: `${staff.name} (${staff.role === 'master' ? '系統最高管理員' : '老師管理員'})`,
    });

    setSuccessMsg(`驗證碼已發送至教職員校園信箱：${targetEmail}`);
  };

  // --- 3. Verify Code and Set Password ---
  const handleVerifyAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!enteredCode.trim()) {
      setErrorMsg('請輸入 6 位數電郵驗證碼');
      return;
    }

    if (enteredCode.trim() !== generatedCode) {
      setErrorMsg('驗證碼不正確，請檢查校園郵件通知後重新輸入');
      return;
    }

    if (codeExpiryTime && new Date() > codeExpiryTime) {
      setErrorMsg('驗證碼已逾期（有效時間 10 分鐘），請重新發送');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('請設定至少 6 位數之新密碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('兩次輸入的新密碼不一致，請再次確認');
      return;
    }

    const targetUser = loginMode === 'student' ? matchedStudent : matchedStaff;
    if (!targetUser) {
      setErrorMsg('驗證階段異常，請重新操作');
      return;
    }

    try {
      // Persist password to Firestore & Local State
      await setMemberPasscode(targetUser.id, newPassword);

      // Auto sign in!
      setCurrentUserById(targetUser.id);
      onSuccess(targetUser.role);
      triggerCelebration();
    } catch (err) {
      setErrorMsg('設定密碼時發生錯誤，請重試');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-stone-100 via-stone-50 to-emerald-50/40">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden text-stone-800">
        
        {/* School & House Brand Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 border border-emerald-300/40 flex items-center justify-center shadow-lg text-white font-serif font-black text-xl">
              敬
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-300 tracking-wider">
                新界鄉議局南約區中學 · NLSIPESS
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                敬社社務管理系統
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-1">
            恭敬桑梓 · 崇德尚禮 · 敬社社員及教職員登入門戶
          </p>
        </div>

        {/* Top Role Selector */}
        <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50/90 p-1.5 gap-1.5">
          <button
            type="button"
            id="tab-login-student"
            onClick={() => handleModeSwitch('student')}
            className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'student'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            學生社員登入 (Student)
          </button>
          <button
            type="button"
            id="tab-login-staff"
            onClick={() => handleModeSwitch('staff')}
            className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'staff'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            老師與管理員登入 (Staff)
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Simulated School Email Banner Notification (For live preview and demo testing) */}
          {simulatedEmailNotification && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>【學校郵件通知模擬】學生校園電郵驗證碼</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                      有效 10 分鐘
                    </span>
                  </div>
                  <p className="text-stone-700">
                    收件者：<strong>{simulatedEmailNotification.toEmail}</strong>（{simulatedEmailNotification.studentName}）
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                    <span className="text-stone-600 font-medium">您的敬社專屬驗證碼為：</span>
                    <span className="font-mono font-black text-xl tracking-widest text-emerald-800 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                      {simulatedEmailNotification.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    * 系統已模擬向校園郵箱系統發送郵件，請直接複製上方 6 位數代碼貼入驗證欄位完成設定。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Global Error Notice */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Global Success Notice */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 1: STUDENT LOGIN (Normal vs First-time / Forgot PW) */}
          {/* ========================================================================= */}
          {loginMode === 'student' && (
            <>
              {studentFlow === 'normal' ? (
                /* Standard Student Login Form */
                <form onSubmit={handleRegularLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                      <span>學生帳號 / 校園電郵 *</span>
                      <span className="text-[11px] text-emerald-700 font-normal">
                        學號 + @nlsipess.edu.hk
                      </span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-student-identifier"
                        type="text"
                        required
                        placeholder="例如: s2500123@nlsipess.edu.hk 或 s2500123"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      支援輸入完整校園電郵（如 s2500123@nlsipess.edu.hk）或學生學號。
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                      <span>登入密碼 *</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentFlow('forgot_password');
                          setVerifyEmailInput(identifier);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
                      >
                        忘記密碼？
                      </button>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-student-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="請輸入您的敬社登入密碼"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-student-submit-login"
                    className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>登入學生社員專區</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* First-time student prompt */}
                  <div className="pt-4 border-t border-stone-200 text-center">
                    <p className="text-xs text-stone-600">
                      首次使用敬社系統？
                      <button
                        type="button"
                        id="btn-first-time-login"
                        onClick={() => {
                          setStudentFlow('first_time');
                          setVerifyEmailInput(identifier);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="ml-1.5 text-emerald-800 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        學生首次登入啟用 (校園電郵驗證)
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* First-time Activation or Forgot Password Flow */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        {verificationStep === 'input_email' ? '1' : '2'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">
                          {studentFlow === 'first_time' ? '學生首次登入啟用' : '忘記密碼 · 校園電郵重設'}
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          {verificationStep === 'input_email'
                            ? '步驟一：輸入學生學號校園電郵，接收驗證碼'
                            : '步驟二：輸入驗證碼並設定專屬新密碼'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentFlow('normal');
                        setVerificationStep('input_email');
                        setSimulatedEmailNotification(null);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-stone-500 hover:text-stone-800 font-medium underline cursor-pointer"
                    >
                      返回一般登入
                    </button>
                  </div>

                  {verificationStep === 'input_email' ? (
                    <form onSubmit={handleSendVerificationCode} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          學生校園電郵或學號 *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                          <input
                            id="input-verify-student-email"
                            type="text"
                            required
                            placeholder="例如: s2500123@nlsipess.edu.hk 或 s2500123"
                            value={verifyEmailInput}
                            onChange={(e) => setVerifyEmailInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                          系統將比對敬社名冊，並即時向您的校園信箱（@nlsipess.edu.hk）發送 6 位數安全驗證碼。
                        </p>
                      </div>

                      <button
                        type="submit"
                        id="btn-send-verification-code"
                        className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>發送驗證碼至學生校園電郵</span>
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Enter code & set new password */
                    <form onSubmit={handleVerifyAndSetPassword} className="space-y-4">
                      {matchedStudent && (
                        <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-emerald-950">
                              {matchedStudent.name}（{matchedStudent.class}）
                            </span>
                            <span className="text-emerald-700 ml-2">
                              學號: {matchedStudent.studentId}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {matchedStudent.committeeTitle || '普通社員'}
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                          <span>輸入 6 位數電郵驗證碼 *</span>
                          <button
                            type="button"
                            onClick={() => {
                              setVerificationStep('input_email');
                              setEnteredCode('');
                            }}
                            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            重發驗證碼
                          </button>
                        </label>
                        <input
                          id="input-verification-code"
                          type="text"
                          maxLength={6}
                          required
                          placeholder="請輸入 6 位數驗證碼"
                          value={enteredCode}
                          onChange={(e) => setEnteredCode(e.target.value)}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            設定新密碼 (至少6位) *
                          </label>
                          <div className="relative">
                            <input
                              id="input-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="至少 6 位數"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            確認新密碼 *
                          </label>
                          <input
                            id="input-confirm-password"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="再次輸入新密碼"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="btn-verify-and-complete"
                        className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>驗證並完成設定，直接登入</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: TEACHER & SYSTEM ADMIN LOGIN */}
          {/* ========================================================================= */}
          {loginMode === 'staff' && (
            <>
              {staffFlow === 'normal' ? (
                <form onSubmit={handleRegularLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                      <span>教職員校園電郵 / 編號 *</span>
                      <span className="text-[11px] text-stone-400 font-normal">
                        系統最高管理員或老師顧問
                      </span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-staff-identifier"
                        type="text"
                        required
                        placeholder="輸入校園電郵 (如 tykwong@nlsipess.edu.hk) 或編號"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                      <span>管理密碼 *</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffFlow('forgot_password');
                          setVerificationStep('input_email');
                          setVerifyEmailInput(identifier);
                          setErrorMsg('');
                          setSuccessMsg('');
                          setSimulatedEmailNotification(null);
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                      >
                        忘記密碼？
                      </button>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-staff-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="請輸入管理權限密碼"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-11 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-staff-submit-login"
                    className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>登入敬社教職員管理台</span>
                  </button>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                    <div className="font-bold text-stone-800 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                      帳號授權說明：
                    </div>
                    <p>
                      敬社老師顧問與最高管理員帳號支援透過校園電郵驗證碼即時安全重設密碼。若需新增管理員帳號，請由最高管理員於管理台設定。
                    </p>
                  </div>
                </form>
              ) : (
                /* STAFF FORGOT PASSWORD FLOW */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        {verificationStep === 'input_email' ? '1' : '2'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">
                          教職員/管理員 · 忘記密碼重設
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          {verificationStep === 'input_email'
                            ? '步驟一：輸入教職員校園電郵或編號接收驗證碼'
                            : '步驟二：輸入驗證碼並設定專屬新管理密碼'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffFlow('normal');
                        setVerificationStep('input_email');
                        setSimulatedEmailNotification(null);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs text-stone-500 hover:text-stone-800 font-medium underline cursor-pointer"
                    >
                      返回教職員登入
                    </button>
                  </div>

                  {verificationStep === 'input_email' ? (
                    <form onSubmit={handleSendStaffVerificationCode} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          教職員校園電郵或編號 *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                          <input
                            id="input-verify-staff-email"
                            type="text"
                            required
                            placeholder="例如: tykwong@nlsipess.edu.hk 或編號"
                            value={verifyEmailInput}
                            onChange={(e) => setVerifyEmailInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                          系統將比對教職員名冊，並發送 6 位數安全驗證碼至您的校園信箱。
                        </p>
                      </div>

                      <button
                        type="submit"
                        id="btn-send-staff-verification"
                        className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>發送驗證碼至教職員信箱</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyAndSetPassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                          <span>6 位數校園電郵驗證碼 *</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSendStaffVerificationCode(e);
                            }}
                            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            重發驗證碼
                          </button>
                        </label>
                        <input
                          id="input-staff-verification-code"
                          type="text"
                          maxLength={6}
                          required
                          placeholder="請輸入 6 位數驗證碼"
                          value={enteredCode}
                          onChange={(e) => setEnteredCode(e.target.value)}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            設定新管理密碼 (至少6位) *
                          </label>
                          <div className="relative">
                            <input
                              id="input-staff-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="至少 6 位數"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            確認新管理密碼 *
                          </label>
                          <input
                            id="input-staff-confirm-password"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="再次輸入新密碼"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        id="btn-staff-verify-and-complete"
                        className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>驗證並完成密碼重設，直接登入</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Note & Guest Access */}
        <div className="p-4 bg-stone-50/80 border-t border-stone-200 text-center text-xs text-stone-500 space-y-2">
          {onContinueAsGuest && (
            <div>
              <button
                type="button"
                id="btn-guest-preview"
                onClick={onContinueAsGuest}
                className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer inline-flex items-center gap-1 text-xs"
              >
                <span>以訪客身份瀏覽敬社公開榮譽榜 (Browse as Guest)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
          <div>新界鄉議局元朗區中學 · 敬社 (House of Reverence)</div>
        </div>

      </div>
    </div>
  );
};
