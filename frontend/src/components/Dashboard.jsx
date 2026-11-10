import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  Database,
  Gauge,
  LogOut,
  Menu,
  Search,
  Shield,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import AzmuthChat from "./AzmuthChat";
import SelectorOmnitrix from "./SelectorOmnitrix";
import DiagnosticoOmnitrix from "./DiagnosticoOmnitrix";
import AdminPanel from "./AdminPanel";

const API_URL = import.meta.env.VITE_API_URL;

const navegacion = [
  { id: "inicio", nombre: "Panel principal", icono: Gauge },
  { id: "aliens", nombre: "Base de datos alienígena", icono: Database },
  { id: "azmuth", nombre: "Azmuth AI", icono: Bot },
  { id: "selector", nombre: "Selector Omnitrix", icono: Zap },
  { id: "diagnostico", nombre: "Diagnóstico", icono: Wrench },
  { id: "historial", nombre: "Historial", icono: BookOpen },
];

const servicios = [
  {
    id: "azmuth",
    nombre: "AZMUTH AI",
    descripcion:
      "Consulta al creador del Omnitrix sobre especies, tecnología y transformaciones.",
    icono: Bot,
    codigo: "AI-01",
  },
  {
    id: "selector",
    nombre: "SELECTOR OMNITRIX",
    descripcion: "Analiza escenarios y descubre qué transformación necesitas.",
    icono: Zap,
    codigo: "AI-02",
  },
  {
    id: "diagnostico",
    nombre: "DIAGNÓSTICO",
    descripcion: "Investiga fallas y problemas técnicos del Omnitrix.",
    icono: Wrench,
    codigo: "AI-03",
  },
];

function Tarjeta({ children, className = "" }) {
  return (
    <div className={`border border-[#243c2c] bg-[#101914] ${className}`}>
      {children}
    </div>
  );
}

export default function Dashboard({ usuario, token, cerrarSesion }) {
  const [seccion, setSeccion] = useState("inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [aliens, setAliens] = useState([]);
  const [consumo, setConsumo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [alienSeleccionado, setAlienSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [respuestaAliens, respuestaConsumo] = await Promise.all([
          axios.get(`${API_URL}/api/v1/aliens`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get(`${API_URL}/api/v1/consumo`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        setAliens(respuestaAliens.data);
        setConsumo(respuestaConsumo.data);
      } catch (err) {
        if (err.response?.status === 401) {
          cerrarSesion();
          return;
        }

        setError("No fue posible cargar los datos del Omnitrix.");
      }
    }

    cargarDatos();
  }, [token, cerrarSesion]);

  async function seleccionarAlien(id) {
    setCargandoDetalle(true);
    setError("");

    try {
      const respuesta = await axios.get(`${API_URL}/api/v1/aliens/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAlienSeleccionado(respuesta.data);
    } catch {
      setError("No fue posible consultar esta transformación.");
    } finally {
      setCargandoDetalle(false);
    }
  }

  function navegar(destino) {
    setSeccion(destino);
    setMenuAbierto(false);
    setAlienSeleccionado(null);
    setError("");
  }

  const aliensFiltrados = aliens.filter((alien) =>
    `${alien.nombre} ${alien.especie} ${alien.planeta}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  const porcentaje = consumo
    ? Math.max(
        0,
        Math.min(
          100,
          (consumo.tokens_disponibles / Math.max(consumo.limite_tokens, 1)) *
            100,
        ),
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#080d0a] text-white flex">
      {/* MENÚ LATERAL */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40
          h-screen w-72 shrink-0
          bg-[#0d1510] border-r border-[#243c2c]
          flex flex-col
          transition-transform duration-300
          ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-7 border-b border-[#243c2c]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border-2 border-[#8cff00] p-2">
                <Cpu size={25} className="text-[#8cff00]" />
              </div>

              <div>
                <h1 className="font-black tracking-widest text-lg">OMNITRIX</h1>
                <p className="text-[#8cff00] text-[10px] tracking-[0.25em]">
                  INTELLIGENCE SYSTEM
                </p>
              </div>
            </div>

            <button
              className="lg:hidden text-gray-400"
              onClick={() => setMenuAbierto(false)}
            >
              <X size={23} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-8 pb-3 text-[10px] tracking-[0.3em] text-gray-500">
          NAVEGACIÓN DEL SISTEMA
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navegacion.map((item) => {
            const Icono = item.icono;
            const activo = seccion === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navegar(item.id)}
                className={`
                  flex items-center gap-3 w-full
                  px-4 py-3 text-left text-sm transition
                  ${
                    activo
                      ? "bg-[#8cff00] text-[#081008] font-bold"
                      : "text-gray-400 hover:text-[#8cff00] hover:bg-[#16251a]"
                  }
                `}
              >
                <Icono size={19} />
                {item.nombre}
              </button>
            );
          })}

          {usuario.rol === "admin" && (
            <>
              <div className="px-4 pt-7 pb-2 text-[10px] tracking-widest text-gray-500">
                ACCESO ADMINISTRATIVO
              </div>

              <button
                onClick={() => navegar("admin")}
                className={`
                  flex items-center gap-3 w-full
                  px-4 py-3 text-sm transition
                  ${
                    seccion === "admin"
                      ? "bg-[#8cff00] text-black font-bold"
                      : "text-gray-400 hover:text-[#8cff00] hover:bg-[#16251a]"
                  }
                `}
              >
                <Shield size={19} />
                Administración
              </button>
            </>
          )}
        </nav>

        <div className="border-t border-[#243c2c] p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 bg-[#8cff00] text-black flex items-center justify-center font-black text-lg">
              {usuario.nombre.charAt(0)}
            </div>

            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{usuario.nombre}</p>
              <p className="text-[#8cff00] text-xs uppercase tracking-wider">
                {usuario.rol}
              </p>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="flex gap-3 items-center w-full text-gray-400 hover:text-red-400 transition text-sm"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 min-w-0">
        <header className="h-20 border-b border-[#243c2c] px-5 md:px-9 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuAbierto(true)}
              className="lg:hidden text-[#8cff00]"
            >
              <Menu size={25} />
            </button>

            <div>
              <p className="text-[10px] text-[#8cff00] tracking-[0.3em] mb-1">
                GALVAN TECHNOLOGY
              </p>
              <h2 className="font-bold text-sm md:text-base">
                SISTEMA OMNITRIX
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#8cff00] text-xs">
            <span className="h-2 w-2 bg-[#8cff00] rounded-full animate-pulse" />
            <span className="hidden sm:inline tracking-widest">
              CONEXIÓN ACTIVA
            </span>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-5 md:p-9">
          {error && (
            <div className="mb-6 border border-red-800 bg-red-950/30 p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* INICIO */}
          {seccion === "inicio" && (
            <div>
              <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-3">
                TERMINAL PRINCIPAL // ACCESO AUTORIZADO
              </p>

              <h1 className="text-3xl md:text-5xl font-black mb-3">
                BIENVENIDO,{" "}
                <span className="text-[#8cff00]">
                  {usuario.nombre.split(" ")[0].toUpperCase()}
                </span>
              </h1>

              <p className="text-gray-400 mb-10">
                Todos los sistemas del Omnitrix están disponibles para consulta.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-11">
                <Tarjeta className="p-6">
                  <Database className="text-[#8cff00] mb-5" size={27} />
                  <p className="text-gray-400 text-xs tracking-widest mb-2">
                    TRANSFORMACIONES
                  </p>
                  <p className="text-4xl font-black">{aliens.length}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Especies registradas
                  </p>
                </Tarjeta>

                <Tarjeta className="p-6">
                  <Zap className="text-[#8cff00] mb-5" size={27} />
                  <p className="text-gray-400 text-xs tracking-widest mb-2">
                    TOKENS DISPONIBLES
                  </p>
                  <p className="text-4xl font-black">
                    {consumo?.tokens_disponibles?.toLocaleString() ?? "—"}
                  </p>
                  <div className="h-1 bg-[#26362a] mt-4">
                    <div
                      className="h-full bg-[#8cff00]"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </Tarjeta>

                <Tarjeta className="p-6">
                  <Activity className="text-[#8cff00] mb-5" size={27} />
                  <p className="text-gray-400 text-xs tracking-widest mb-2">
                    CONSULTAS REALIZADAS
                  </p>
                  <p className="text-4xl font-black">
                    {consumo?.solicitudes ?? "—"}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Servicios de inteligencia artificial
                  </p>
                </Tarjeta>
              </div>

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black tracking-wide">
                  SERVICIOS DE INTELIGENCIA
                </h2>
                <span className="text-[#8cff00] text-xs">03 SISTEMAS</span>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {servicios.map((servicio) => {
                  const Icono = servicio.icono;

                  return (
                    <button
                      key={servicio.id}
                      onClick={() => navegar(servicio.id)}
                      className="border border-[#243c2c] bg-[#101914] p-6 text-left hover:border-[#8cff00] hover:bg-[#15241a] transition group"
                    >
                      <div className="flex justify-between items-start mb-9">
                        <div className="border border-[#8cff00]/50 p-3">
                          <Icono size={26} className="text-[#8cff00]" />
                        </div>

                        <span className="text-gray-500 text-xs">
                          {servicio.codigo}
                        </span>
                      </div>

                      <h3 className="font-black text-lg mb-3">
                        {servicio.nombre}
                      </h3>

                      <p className="text-gray-400 text-sm leading-relaxed min-h-20">
                        {servicio.descripcion}
                      </p>

                      <div className="flex items-center gap-2 text-[#8cff00] text-xs font-bold tracking-widest mt-5">
                        EXPLORAR
                        <ArrowRight
                          size={16}
                          className="group-hover:translate-x-1 transition"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => navegar("aliens")}
                className="mt-8 w-full border border-[#8cff00]/40 px-6 py-5 flex justify-between items-center text-[#8cff00] hover:bg-[#8cff00]/10 transition"
              >
                <span className="font-bold tracking-wider">
                  EXPLORAR BASE DE DATOS ALIENÍGENA
                </span>
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* CATÁLOGO DE ALIENS */}
          {seccion === "aliens" && (
            <div>
              <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-3">
                ARCHIVO GENÉTICO // BASE DE DATOS
              </p>

              <h1 className="text-3xl md:text-4xl font-black mb-3">
                TRANSFORMACIONES
              </h1>

              <p className="text-gray-400 mb-8">
                Catálogo de especies disponibles en el Omnitrix.
              </p>

              {alienSeleccionado ? (
                <div>
                  <button
                    onClick={() => setAlienSeleccionado(null)}
                    className="flex items-center gap-2 text-[#8cff00] mb-6"
                  >
                    <ArrowLeft size={18} />
                    VOLVER AL CATÁLOGO
                  </button>

                  <Tarjeta className="p-6 md:p-9">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="w-full md:w-64 h-64 bg-[#16251a] border border-[#365b3e] flex items-center justify-center shrink-0 overflow-hidden">
                        {alienSeleccionado.imagen_url ? (
                          <img
                            src={alienSeleccionado.imagen_url}
                            alt={alienSeleccionado.nombre}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <DnaIcon />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-[#8cff00] text-xs tracking-widest mb-3">
                          REGISTRO #{alienSeleccionado.id}
                        </p>

                        <h2 className="text-4xl font-black mb-5">
                          {alienSeleccionado.nombre}
                        </h2>

                        <p className="text-gray-400 mb-3">
                          <strong className="text-white">Especie:</strong>{" "}
                          {alienSeleccionado.especie || "Desconocida"}
                        </p>

                        <p className="text-gray-400 mb-6">
                          <strong className="text-white">Planeta:</strong>{" "}
                          {alienSeleccionado.planeta || "Desconocido"}
                        </p>

                        <p className="text-gray-300 leading-relaxed">
                          {alienSeleccionado.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mt-10">
                      <div>
                        <h3 className="text-[#8cff00] font-bold mb-4">
                          FORTALEZAS
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                          {alienSeleccionado.fortalezas}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-[#8cff00] font-bold mb-4">
                          DEBILIDADES
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                          {alienSeleccionado.debilidades}
                        </p>
                      </div>
                    </div>

                    <div className="mt-10">
                      <h3 className="font-bold text-lg mb-5">
                        HABILIDADES REGISTRADAS
                      </h3>

                      <div className="space-y-5">
                        {(alienSeleccionado.habilidades || []).map(
                          (habilidad, index) => (
                            <div key={index}>
                              <div className="flex justify-between mb-2 text-sm">
                                <span>{habilidad.nombre}</span>
                                <span className="text-[#8cff00]">
                                  {habilidad.nivel}/10
                                </span>
                              </div>

                              <div className="h-2 bg-[#26362a]">
                                <div
                                  className="h-full bg-[#8cff00]"
                                  style={{
                                    width: `${habilidad.nivel * 10}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </Tarjeta>
                </div>
              ) : (
                <>
                  <div className="relative mb-8">
                    <Search
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8cff00]"
                    />

                    <input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar transformación, especie o planeta..."
                      className="w-full bg-[#111a14] border border-[#2a3d2f] py-4 pl-12 pr-5 outline-none focus:border-[#8cff00] text-white"
                    />
                  </div>

                  <p className="text-gray-500 text-xs mb-5 tracking-wider">
                    {aliensFiltrados.length} REGISTROS ENCONTRADOS
                  </p>

                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {aliensFiltrados.map((alien) => (
                      <button
                        key={alien.id}
                        onClick={() => seleccionarAlien(alien.id)}
                        disabled={cargandoDetalle}
                        className="text-left border border-[#243c2c] bg-[#101914] hover:border-[#8cff00] transition group overflow-hidden"
                      >
                        <div className="h-40 bg-[#16251a] flex items-center justify-center overflow-hidden">
                          {alien.imagen_url ? (
                            <img
                              src={alien.imagen_url}
                              alt={alien.nombre}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Cpu size={60} className="text-[#8cff00]/50" />
                          )}
                        </div>

                        <div className="p-5">
                          <p className="text-[#8cff00] text-[10px] tracking-widest mb-2">
                            ESPECIE REGISTRADA
                          </p>

                          <h3 className="text-xl font-black mb-2">
                            {alien.nombre}
                          </h3>

                          <p className="text-gray-400 text-sm">
                            {alien.especie}
                          </p>

                          <div className="flex justify-between mt-5 pt-4 border-t border-[#243c2c] text-[#8cff00] text-xs">
                            <span>VER INFORMACIÓN</span>
                            <ArrowRight size={17} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* CHAT DE AZMUTH */}
          {seccion === "azmuth" && (
            <AzmuthChat
              token={token}
              usuario={usuario}
              onConsumoActualizado={async () => {
                try {
                  const respuesta = await axios.get(
                    `${API_URL}/api/v1/consumo`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  setConsumo(respuesta.data);
                } catch {
                  console.error("No se pudo actualizar el consumo");
                }
              }}
            />
          )}

          {/* SELECTOR OMNITRIX */}
          {seccion === "selector" && (
            <SelectorOmnitrix
              token={token}
              onConsumoActualizado={async () => {
                try {
                  const respuesta = await axios.get(
                    `${API_URL}/api/v1/consumo`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  setConsumo(respuesta.data);
                } catch {
                  console.error("No se pudo actualizar el consumo");
                }
              }}
            />
          )}

          {/* DIAGNÓSTICO OMNITRIX */}
          {seccion === "diagnostico" && (
            <DiagnosticoOmnitrix
              token={token}
              onConsumoActualizado={async () => {
                try {
                  const respuesta = await axios.get(
                    `${API_URL}/api/v1/consumo`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  setConsumo(respuesta.data);
                } catch {
                  console.error("No se pudo actualizar el consumo");
                }
              }}
            />
          )}

          {/* PANEL ADMINISTRATIVO */}
          {seccion === "admin" && usuario.rol === "admin" && (
            <AdminPanel token={token} usuario={usuario} />
          )}

          {/* PANTALLAS QUE CONECTAREMOS DESPUÉS */}
          {![
            "inicio",
            "aliens",
            "azmuth",
            "selector",
            "diagnostico",
            "admin",
          ].includes(seccion) && (
            <div className="max-w-2xl mx-auto py-16 text-center">
              <div className="w-24 h-24 mx-auto border-2 border-[#8cff00] flex items-center justify-center mb-8">
                {seccion === "admin" ? (
                  <ShieldCheck size={45} className="text-[#8cff00]" />
                ) : (
                  <Cpu size={45} className="text-[#8cff00]" />
                )}
              </div>

              <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-4">
                MÓDULO IDENTIFICADO
              </p>

              <h1 className="text-3xl md:text-4xl font-black mb-5 uppercase">
                {seccion === "admin"
                  ? "ADMINISTRACIÓN"
                  : navegacion.find((item) => item.id === seccion)?.nombre}
              </h1>

              <p className="text-gray-400 leading-relaxed mb-8">
                El servicio ya está disponible en nuestro backend. Su interfaz
                se integrará en el siguiente paso de desarrollo.
              </p>

              <button
                onClick={() => navegar("inicio")}
                className="bg-[#8cff00] text-black font-black px-8 py-4 hover:bg-[#b1ff57] transition"
              >
                VOLVER AL PANEL
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FONDO DEL MENÚ MÓVIL */}
      {menuAbierto && (
        <button
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          aria-label="Cerrar menú"
        />
      )}
    </div>
  );
}

function DnaIcon() {
  return (
    <div className="text-center">
      <Cpu size={70} className="text-[#8cff00] mx-auto mb-3" />
      <p className="text-[#8cff00] text-xs tracking-[0.2em]">
        ADN IDENTIFICADO
      </p>
    </div>
  );
}
