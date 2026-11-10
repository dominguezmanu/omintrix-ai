import { useState } from "react";
import axios from "axios";
import {
  Fingerprint,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Radio,
  LoaderCircle,
} from "lucide-react";
import Dashboard from "./components/Dashboard";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);

  async function iniciarSesion(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await axios.post(`${API_URL}/api/v1/auth/login`, {
        correo,
        password,
      });

      const datos = respuesta.data;
      console.log("Login exitoso:", {
        usuario: datos.usuario?.nombre,
        tokenRecibido: Boolean(datos.access_token),
      });

      setToken(datos.access_token);
      setUsuario(datos.usuario);
    } catch (err) {
      const mensaje = err.response?.data?.detail;

      setError(
        typeof mensaje === "string"
          ? mensaje
          : "No se pudo conectar con el Omnitrix.",
      );
    } finally {
      setCargando(false);
    }
  }

  if (usuario && token) {
    return (
      <Dashboard
        usuario={usuario}
        token={token}
        cerrarSesion={() => {
          setUsuario(null);
          setToken(null);
          setPassword("");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080d0a] text-white flex overflow-hidden">
      {/* PANEL IZQUIERDO */}
      <section className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 border-r border-[#8cff0025] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#8cff00 1px, transparent 1px), linear-gradient(90deg, #8cff00 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 border-2 border-[#8cff00] flex items-center justify-center">
            <Cpu className="text-[#8cff00]" size={24} />
          </div>

          <div>
            <h2 className="font-black tracking-[0.18em] text-lg">OMNITRIX</h2>
            <p className="text-[10px] text-[#8cff00] tracking-[0.3em]">
              INTELLIGENCE SYSTEM
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* EMBLEMA OMNITRIX */}
          <div className="relative w-72 h-72 xl:w-80 xl:h-80 rounded-full border-[12px] border-[#1a2720] shadow-[0_0_100px_#8cff0015] flex items-center justify-center">
            <div className="absolute inset-3 rounded-full border-4 border-[#8cff00] shadow-[0_0_35px_#8cff0050]" />

            <div className="absolute w-[78%] h-[78%] rounded-full bg-[#8cff00]/10" />

            <div className="relative w-[65%] h-[65%] overflow-hidden rounded-full bg-[#8cff00] shadow-[0_0_60px_#8cff0070]">
              <div
                className="absolute inset-0 bg-[#071008]"
                style={{
                  clipPath: "polygon(0 0, 45% 0, 100% 100%, 55% 100%)",
                }}
              />

              <div
                className="absolute inset-0 bg-[#071008]"
                style={{
                  clipPath: "polygon(55% 0, 100% 0, 45% 100%, 0 100%)",
                }}
              />
            </div>
          </div>

          <div className="mt-14 text-center">
            <p className="text-[#8cff00] text-xs tracking-[0.5em] mb-5">
              GALVAN TECHNOLOGY
            </p>

            <h1 className="text-5xl xl:text-6xl font-black tracking-tight">
              OMNITRIX <span className="text-[#8cff00]">AI</span>
            </h1>

            <p className="text-gray-400 mt-5 max-w-md leading-relaxed">
              Accede al conocimiento de las especies alienígenas, consulta a
              Azmuth y descubre el potencial del Omnitrix.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] tracking-widest text-gray-500">
          <span>PLUMBER DATABASE // V1.0</span>
          <span className="flex items-center gap-2 text-[#8cff00]">
            <Radio size={14} />
            SISTEMA EN LÍNEA
          </span>
        </div>
      </section>

      {/* PANEL DE LOGIN */}
      <section className="w-full lg:w-[45%] min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12 flex items-center gap-3">
            <Cpu className="text-[#8cff00]" size={32} />
            <span className="font-black tracking-widest text-xl">
              OMNITRIX AI
            </span>
          </div>

          <div className="flex items-center gap-2 mb-8">
            <span className="h-2 w-2 bg-[#8cff00] rounded-full shadow-[0_0_12px_#8cff00]" />
            <span className="text-[#8cff00] text-xs font-bold tracking-[0.25em]">
              TERMINAL DE ACCESO
            </span>
          </div>

          <h2 className="text-4xl font-black mb-3">IDENTIFICACIÓN</h2>

          <p className="text-gray-400 mb-10">
            Introduce tus credenciales para acceder al sistema.
          </p>

          <form onSubmit={iniciarSesion} className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-400 mb-3">
                IDENTIFICADOR DEL PORTADOR
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8cff00]"
                />

                <input
                  type="text"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ben@omnitrix.local"
                  required
                  className="w-full bg-[#111a14] border border-[#2a3d2f] py-4 pl-12 pr-4 outline-none focus:border-[#8cff00] transition text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-400 mb-3">
                CÓDIGO DE SEGURIDAD
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8cff00]"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  className="w-full bg-[#111a14] border border-[#2a3d2f] py-4 pl-12 pr-4 outline-none focus:border-[#8cff00] transition text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#8cff00] text-[#071008] font-black tracking-widest py-4 flex justify-center items-center gap-3 hover:bg-[#b1ff57] disabled:opacity-60 transition"
            >
              {cargando ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  VERIFICANDO...
                </>
              ) : (
                <>
                  <Fingerprint size={21} />
                  ACTIVAR OMNITRIX
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-[#26362a] flex items-start gap-3">
            <ShieldCheck size={20} className="text-[#8cff00] shrink-0" />

            <p className="text-xs text-gray-500 leading-relaxed">
              Acceso restringido a portadores autorizados. Todas las actividades
              del sistema estarán asociadas a tu cuenta.
            </p>
          </div>

          <div className="mt-12 flex items-center gap-2 text-gray-600 text-xs tracking-wider">
            <Radio size={14} />
            OMNITRIX AI • GALVAN SYSTEMS
          </div>
        </div>
      </section>
    </div>
  );
}
