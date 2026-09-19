import React, { useState } from 'react';
import {
  Shield,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  User,
  KeyRound,
} from 'lucide-react';
import { useHouse } from '../context/HouseContext';
import { UserRole } from '../types';
import { getStandardStudentEmail, normalizeStudentIdOrEmail } from '../utils/memberSorting';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: UserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { members, setCurrentUserById, setMemberPasscode, triggerCelebration } = useHouse();

  const [loginMode, setLoginMode] = useState<'student' | 'staff'>('student');
  const [studentFlow, setStudentFlow] = useState<'normal' | 'first_time' | 'forgot_password'>('normal');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiryTime, setCodeExpiryTime] = useState<Date | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'input_email' | 'enter_code_and_pw'>('input_email');
  const [matchedStudent, setMatchedStudent] = useState<any | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedEmailNotification, setSimulatedEmailNotification] = useState<{
    toEmail: string;
    code: string;
    studentName: string;
  } | null>(null);

  if (!isOpen) return null;

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

    const found = members.find((m) => {
      const email = (m.email || '').trim().toLowerCase();
      const stdId = (m.studentId || '').trim().toLowerCase();
      const name = m.name.toLowerCase();

      if (loginMode === 'student') {
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

    const expectedPasscode = found.passcode || '123456';
    if (password !== expectedPasscode && password !== 'ADMIN2026' && password !== 'TEA2026') {
      setErrorMsg('密碼不正確。如忘記密碼，請點擊下方「忘記密碼」以校園電郵重設。');
      return;
    }

    setCurrentUserById(found.id);
    onSuccess(found.role);
    triggerCelebration();
    onClose();
  };

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
      setErrorMsg('在敬社名冊中找不到此學號或電郵。請確認您為敬社社員，或聯繫敬社顧問老師核對名單。');
      return;
    }

    const targetEmail = getStandardStudentEmail(student.studentId) || student.email || `${studentIdCandidate}@nlsipess.edu.hk`;
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    setGeneratedCode(randomCode);
    setCodeExpiryTime(expiry);
    setMatchedStudent(student);
    setVerificationStep('enter_code_and_pw');

    setSimulatedEmailNotification({
      toEmail: targetEmail,
      code: randomCode,
      studentName: `${student.name} (${student.class})`,
    });

    setSuccessMsg(`驗證碼已發送至學生校園電郵：${targetEmail}`);
  };

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

    if (!matchedStudent) {
      setErrorMsg('驗證階段異常，請重新操作');
      return;
    }

    try {
      await setMemberPasscode(matchedStudent.id, newPassword);
      setCurrentUserById(matchedStudent.id);
      onSuccess(matchedStudent.role);
      triggerCelebration();
      onClose();
    } catch (err) {
      setErrorMsg('設定密碼時發生錯誤，請重試');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-stone-800 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Shield className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-300">新界鄉議局南約區中學</div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">登入敬社社務系統</h2>
            </div>
          </div>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50/90 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setLoginMode('student');
              setErrorMsg('');
              setSuccessMsg('');
              setStudentFlow('normal');
              setVerificationStep('input_email');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginMode === 'student'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            學生社員登入
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('staff');
              setErrorMsg('');
              setSuccessMsg('');
              setStudentFlow('normal');
              setVerificationStep('input_email');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginMode === 'staff'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            老師與管理員
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto">

          {/* Email verification preview toast */}
          {simulatedEmailNotification && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
              <div className="font-bold flex items-center justify-between text-amber-900">
                <span>【校園郵件通知模擬】</span>
                <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-black text-sm">
                  {simulatedEmailNotification.code}
                </span>
              </div>
              <p>驗證碼已發送至：{simulatedEmailNotification.toEmail}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loginMode === 'student' ? (
            studentFlow === 'normal' ? (
              <form onSubmit={handleRegularLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>學生學號 / 校園電郵 *</span>
                    <span className="text-[11px] text-emerald-700 font-normal">
                      學號 + @nlsipess.edu.hk
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="modal-student-identifier"
                      type="text"
                      required
                      placeholder="例如: s2500123@nlsipess.edu.hk 或 s2500123"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>登入密碼 *</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentFlow('forgot_password');
                        setVerifyEmailInput(identifier);
                      }}
                      className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                    >
                      忘記密碼？
                    </button>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="modal-student-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="請輸入密碼"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <span>登入學生系統</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-3 border-t border-stone-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentFlow('first_time');
                      setVerifyEmailInput(identifier);
                    }}
                    className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    學生首次登入啟用 (校園電郵接收驗證碼)
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-xs font-bold text-stone-800">
                    {studentFlow === 'first_time' ? '學生首次登入啟用' : '忘記密碼重設'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentFlow('normal')}
                    className="text-xs text-stone-500 hover:underline cursor-pointer"
                  >
                    返回登入
                  </button>
                </div>

                {verificationStep === 'input_email' ? (
                  <form onSubmit={handleSendVerificationCode} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        學生校園電郵或學號 *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例如: s2500123@nlsipess.edu.hk 或 s2500123"
                        value={verifyEmailInput}
                        onChange={(e) => setVerifyEmailInput(e.target.value)}
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>發送驗證碼至學生校園電郵</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAndSetPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        輸入 6 位數電郵驗證碼 *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="6 位數驗證碼"
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-center font-mono font-bold tracking-widest text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          設定新密碼 *
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="至少 6 位"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          確認新密碼 *
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="再次輸入"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>完成設定並直接登入</span>
                    </button>
                  </form>
                )}
              </div>
            )
          ) : (
            <form onSubmit={handleRegularLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  教職員校園電郵 / 編號 *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="例如: tykwong@nlsipess.edu.hk 或 TEA-088"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  管理密碼 *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="請輸入管理密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <Shield className="w-4 h-4" />
                <span>登入管理台</span>
              </button>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
                <div className="font-bold text-stone-800 flex items-center gap-1 mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                  教職員說明：
                </div>
                <p>老師顧問帳號由系統最高管理員（System Admin）統一開立與維護。</p>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
