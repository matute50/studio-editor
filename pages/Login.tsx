import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, UserPlus, LogIn, ShieldCheck, CheckCircle2, Eye, EyeOff, KeyRound, Wrench } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Estado para la recuperación manual
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUrl, setRecoveryUrl] = useState('');

  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanPassword = password.trim();
    const cleanEmail = email.trim();

    try {
      if (isSignUp) {
        // --- REGISTRO ---
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        if (data.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            setError('La cuenta ya existe. Por favor inicia sesión o usa el Ingreso Mágico.');
            setIsSignUp(false);
          } else {
            setMessage('¡Cuenta creada! Revisa tu email para confirmarla.');
            setIsSignUp(false);
          }
        }
      } else {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Tu correo no ha sido confirmado. Revisa tu bandeja de entrada o usa el "Ingreso Mágico".');
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
          } else {
            throw error;
          }
        }
        
        navigate('/'); 
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || 'Ocurrió un error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico primero.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: window.location.origin 
        }
      });
      if (error) throw error;
      setMessage('¡Enlace enviado! Si al hacer clic te da error de conexión (localhost), copia ese enlace de error y úsalo en la opción de abajo "¿El enlace mágico dió error?".');
    } catch (err: any) {
      setError('Error enviando enlace mágico: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRecovery = async () => {
    if (!recoveryUrl) return;
    setLoading(true);
    setError(null);
    
    try {
      // Intentamos extraer el hash de la URL pegada
      // Formato esperado: http://localhost:3000/#access_token=...&refresh_token=...
      const hashIndex = recoveryUrl.indexOf('#');
      if (hashIndex === -1) throw new Error('La URL no contiene un token válido (falta el #)');
      
      const hashPart = recoveryUrl.substring(hashIndex + 1);
      const params = new URLSearchParams(hashPart);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        throw new Error('No se encontraron los tokens de acceso en el enlace.');
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) throw error;

      setMessage('¡Sesión recuperada con éxito! Redirigiendo...');
      setTimeout(() => navigate('/'), 1000);

    } catch (err: any) {
      setError('Error al procesar el enlace: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
          <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-1">EDITOR</h1>
          <p className="text-slate-400 text-sm">Saladillo Vivo</p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3 rounded-r">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 font-medium break-words w-full">{error}</div>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 flex items-start gap-3 rounded-r">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="text-sm text-green-700 font-medium">{message}</div>
            </div>
          )}

          {!showRecovery ? (
            <>
              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="nombre@ejemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="Ingrese contraseña"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                    isSignUp 
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN')}
                </button>
              </form>

              {!isSignUp && (
                <div className="mt-4">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Opciones Alternativas</span></div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all mb-3"
                  >
                    <KeyRound className="w-4 h-4 mr-2 text-yellow-500" />
                    Ingresar sin contraseña (Magic Link)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRecovery(true)}
                    className="w-full flex justify-center items-center text-xs text-slate-500 hover:text-blue-600 underline"
                  >
                    ¿El enlace mágico dió error de conexión?
                  </button>
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-6 text-center">
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  {isSignUp ? 'Volver al Login' : '¿Primera vez? Crear cuenta'}
                </button>
              </div>
            </>
          ) : (
            // --- PANTALLA DE RECUPERACIÓN MANUAL ---
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                <p className="font-bold flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4" />
                  Recuperación Manual
                </p>
                <p>Si el enlace del correo te llevó a una página de error (ej: <code>localhost rechazo la conexión</code>), copia la dirección URL completa de esa página de error y pégala aquí abajo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pegar Enlace Fallido (URL Completa)</label>
                <textarea
                  value={recoveryUrl}
                  onChange={(e) => setRecoveryUrl(e.target.value)}
                  className="block w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono h-24"
                  placeholder="http://localhost:3000/#access_token=eyJhbGc..."
                />
              </div>

              <button
                onClick={handleManualRecovery}
                disabled={loading || !recoveryUrl}
                className="w-full flex justify-center items-center py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validar y Entrar'}
              </button>

              <button
                onClick={() => setShowRecovery(false)}
                className="w-full text-center text-sm text-slate-500 mt-2 hover:text-slate-800"
              >
                Cancelar y volver
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            <p>Saladillo Vivo © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};