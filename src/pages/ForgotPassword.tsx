import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ArrowRight, Mail, Lock, ShieldCheck, HelpCircle, ChevronLeft } from 'lucide-react';
import Logo from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Answer & New Password
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const users = authService.getUsers();
      const user = users.find(u => u.email === email);
      
      if (!user) {
        throw new Error('User not found');
      }

      setSecurityQuestion(user.securityQuestion);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authService.resetPassword(email, securityAnswer, newPassword);

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/10 via-transparent to-red-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[160px]" />
        
        <div className="relative z-10 flex items-center space-x-3">
          <Logo size={40} />
          <span className="text-xl font-bold tracking-tighter uppercase">Tahir GPT</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-8xl font-black tracking-tighter leading-[0.85] uppercase mb-8">
            Secure <br />
            <span className="text-red-500">Recovery</span> <br />
            System.
          </h1>
          <p className="max-w-md text-zinc-400 text-lg font-medium leading-relaxed">
            Lost your access? No problem. Our advanced security protocols will 
            help you regain control of your workspace in seconds.
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Encrypted Protocol</span>
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-2">
            <Link to="/login" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Sign In
            </Link>
            <h2 className="text-4xl font-bold tracking-tight">Reset Password</h2>
            <p className="text-zinc-500 font-medium">Follow the steps to recover your account.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium flex items-center animate-shake">
              <ShieldCheck className="w-4 h-4 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-medium flex items-center">
              <ShieldCheck className="w-4 h-4 mr-3 flex-shrink-0" />
              {success}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleFetchQuestion}>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-zinc-700"
                  placeholder="Enter your email"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center group"
              >
                Find Account
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                  <label className="text-[10px] uppercase tracking-widest font-black text-zinc-600 block mb-2">Security Question</label>
                  <p className="text-zinc-300 font-medium">{securityQuestion}</p>
                </div>
                
                <div className="relative group">
                  <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-zinc-700"
                    placeholder="Your answer"
                  />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-zinc-700"
                    placeholder="New password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center group"
              >
                Reset Password
                <ShieldCheck className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
