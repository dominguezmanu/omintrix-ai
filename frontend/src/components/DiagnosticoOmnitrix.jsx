import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Wrench,
  Cpu,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Zap,
  ChevronDown,
  ChevronUp,
  Terminal,
  Search,
  Info,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const fallasEjemplo = [
  {
    codigo: "OM-001",
    nombre: "TRANSFORMACIÓN INCORRECTA",
    descripcion: "El dispositivo selecciona una especie diferente.",
    problema:
      "Intento transformarme en XLR8, pero el Omnitrix me transforma en Four Arms. Además, la interfaz holográfica parpadea antes de seleccionar la transformación.",
  },
  {
    codigo: "OM-002",
    nombre: "PROBLEMA ENERGÉTICO",
    descripcion: "El Omnitrix presenta problemas de energía.",
    problema:
      "Mi Omnitrix se pone rojo y no me permite transformarme. Intento seleccionar un alien, pero el dispositivo no responde.",
  },
  {
    codigo: "OM-003",
    nombre: "BLOQUEO DE SEGURIDAD",
    descripcion: "Las funciones del dispositivo están restringidas.",
    problema:
      "El Omnitrix no permite acceder a determinadas transformaciones. Parece que existe un bloqueo de seguridad activo y no puedo utilizar las funciones habituales.",
  },
  {
    codigo: "OM-005",
    nombre: "FALLA HOLOGRÁFICA",
    descripcion: "La interfaz presenta errores visuales.",
    problema:
      "La pantalla holográfica del Omnitrix parpadea constantemente. Algunas imágenes de aliens desaparecen y otras aparecen incorrectamente.",
  },
];

export default function DiagnosticoOmnitrix({ token, onConsumoActualizado }) {
  const [problema, setProblema] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarHerramientas, setMostrarHerramientas] = useState(false);

  async function ejecutarAnalisis(e) {
    e.preventDefault();

    const texto = problema.trim();

    if (texto.length < 10 || cargando) return;

    setCargando(true);
    setResultado(null);
    setError("");
    setMostrarHerramientas(false);

    try {
      const respuesta = await axios.post(
        `${API_URL}/api/v1/ia/diagnostico`,
        { problema: texto },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 120000,
        },
      );

      setResultado(respuesta.data);

      onConsumoActualizado?.();
    } catch (err) {
      const detalle = err.response?.data?.detail;

      if (err.response?.status === 429) {
        setError(
          typeof detalle === "string"
            ? detalle
            : "No tienes suficientes tokens para ejecutar el diagnóstico.",
        );
      } else if (err.response?.status === 401) {
        setError("Tu sesión ha expirado. Iniciá sesión nuevamente.");
      } else {
        setError(
          typeof detalle === "string"
            ? detalle
            : "No fue posible completar el diagnóstico.",
        );
      }
    } finally {
      setCargando(false);
    }
  }

  function limpiar() {
    if (cargando) return;

    setProblema("");
    setResultado(null);
    setError("");
    setMostrarHerramientas(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ENCABEZADO */}
      <div className="mb-9">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 bg-[#8cff00] rounded-full animate-pulse" />

          <span className="text-[#8cff00] text-xs tracking-[0.3em]">
            SISTEMA DE MANTENIMIENTO // AI-03
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black mb-3">
          DIAGNÓSTICO <span className="text-[#8cff00]">OMNITRIX</span>
        </h1>

        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Identifica anomalías, investiga fallas y consulta posibles soluciones
          mediante el sistema inteligente de diagnóstico desarrollado por
          Azmuth.
        </p>
      </div>

      {/* INDICADORES */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-[#29412f] bg-[#101914] p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-[#8cff00]" size={22} />
            <span className="text-gray-400 text-xs tracking-wider">
              ESTADO DEL SISTEMA
            </span>
          </div>

          <p className="text-[#8cff00] font-black text-lg">OPERATIVO</p>
        </div>

        <div className="border border-[#29412f] bg-[#101914] p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-[#8cff00]" size={22} />
            <span className="text-gray-400 text-xs tracking-wider">
              BASE DE CONOCIMIENTO
            </span>
          </div>

          <p className="text-white font-black text-lg">NEON POSTGRESQL</p>
        </div>

        <div className="border border-[#29412f] bg-[#101914] p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="text-[#8cff00]" size={22} />
            <span className="text-gray-400 text-xs tracking-wider">
              MOTOR DE DIAGNÓSTICO
            </span>
          </div>

          <p className="text-white font-black text-lg">
            INTELIGENCIA ARTIFICIAL
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_310px] gap-6">
        {/* PANEL PRINCIPAL */}
        <div className="space-y-6">
          {/* FORMULARIO */}
          <form
            onSubmit={ejecutarAnalisis}
            className="border border-[#29412f] bg-[#101914]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#29412f]">
              <div className="flex items-center gap-3">
                <Terminal size={21} className="text-[#8cff00]" />

                <h2 className="font-black tracking-wider text-sm">
                  TERMINAL DE DIAGNÓSTICO
                </h2>
              </div>

              <span className="text-[#8cff00] text-xs">SYS_DIAG</span>
            </div>

            <div className="p-5 md:p-7">
              <label className="block text-gray-400 text-xs font-bold tracking-widest mb-4">
                DESCRIPCIÓN DE LA ANOMALÍA
              </label>

              <textarea
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
                rows={8}
                maxLength={3000}
                disabled={cargando}
                placeholder="Describe los síntomas que presenta el Omnitrix. Incluye errores, problemas de transformación, comportamiento de la interfaz o cualquier anomalía detectada..."
                className="w-full bg-[#0a110d] border border-[#34503a] p-5 text-white placeholder:text-gray-600 outline-none focus:border-[#8cff00] resize-y leading-relaxed disabled:opacity-50"
              />

              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>Proporciona todos los síntomas observados.</span>

                <span>{problema.length}/3000</span>
              </div>

              <div className="flex gap-3 mt-7">
                <button
                  type="submit"
                  disabled={cargando || problema.trim().length < 10}
                  className="flex-1 bg-[#8cff00] text-black py-4 px-5 font-black tracking-wider flex items-center justify-center gap-3 hover:bg-[#b1ff57] disabled:opacity-40 transition"
                >
                  {cargando ? (
                    <>
                      <LoaderCircle size={20} className="animate-spin" />
                      DIAGNOSTICANDO...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      INICIAR DIAGNÓSTICO
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={limpiar}
                  disabled={cargando}
                  title="Limpiar diagnóstico"
                  className="border border-[#34503a] px-5 text-gray-400 hover:text-[#8cff00] hover:border-[#8cff00] disabled:opacity-40 transition"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </form>

          {/* ANALIZANDO */}
          {cargando && (
            <div className="border border-[#8cff00]/40 bg-[#101914] p-9">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 border-4 border-[#8cff00]/20 border-t-[#8cff00] rounded-full animate-spin" />

                  <Cpu
                    size={30}
                    className="text-[#8cff00] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  />
                </div>

                <h3 className="font-black text-lg tracking-wider mb-3">
                  EJECUTANDO DIAGNÓSTICO
                </h3>

                <p className="text-gray-400 text-sm max-w-md">
                  El sistema está comparando los síntomas con las fallas
                  registradas en la base de datos.
                </p>

                <div className="mt-7 w-full max-w-sm h-1 bg-[#26362a] overflow-hidden">
                  <div className="h-full w-1/3 bg-[#8cff00] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="border border-red-500/40 bg-red-950/20 p-5 flex items-start gap-3"
            >
              <AlertTriangle className="text-red-400 shrink-0" size={21} />

              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* RESULTADO */}
          {resultado && (
            <div className="border border-[#8cff00]/50 bg-[#101914]">
              <div className="p-5 md:p-6 border-b border-[#29412f]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#8cff00] flex items-center justify-center">
                      <CheckCircle2 size={25} className="text-black" />
                    </div>

                    <div>
                      <h2 className="font-black tracking-wider">
                        DIAGNÓSTICO COMPLETADO
                      </h2>

                      <p className="text-gray-500 text-xs mt-1">
                        ANÁLISIS GENERADO CON IA
                      </p>
                    </div>
                  </div>

                  <span className="border border-[#8cff00]/50 px-3 py-2 text-[#8cff00] text-xs font-bold">
                    REGISTRO #{resultado.diagnostico_id}
                  </span>
                </div>
              </div>

              <div className="p-5 md:p-8">
                {/* RESPUESTA MARKDOWN */}
                <div
                  className="
                  text-sm text-gray-200 leading-relaxed
                  break-words [overflow-wrap:anywhere]
                  [&_h1]:text-2xl
                  [&_h2]:text-xl
                  [&_h3]:text-lg
                  [&_h1]:font-black
                  [&_h2]:font-bold
                  [&_h3]:font-bold
                  [&_h1]:text-[#8cff00]
                  [&_h2]:text-[#8cff00]
                  [&_h3]:text-[#8cff00]
                  [&_h1]:mb-5
                  [&_h2]:mb-4
                  [&_h3]:mb-3
                  [&_p]:mb-4
                  [&_strong]:text-white
                  [&_ul]:list-disc
                  [&_ul]:pl-6
                  [&_ol]:list-decimal
                  [&_ol]:pl-6
                  [&_li]:mb-2
                  [&_table]:block
                  [&_table]:overflow-x-auto
                  [&_table]:mb-6
                  [&_th]:border
                  [&_td]:border
                  [&_th]:border-[#34503a]
                  [&_td]:border-[#34503a]
                  [&_th]:p-3
                  [&_td]:p-3
                  [&_th]:bg-[#1b3020]
                  [&_pre]:overflow-x-auto
                "
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {resultado.diagnostico}
                  </ReactMarkdown>
                </div>

                {/* ADVERTENCIA */}
                <div className="mt-8 border-l-2 border-yellow-500 bg-yellow-950/10 p-5 flex gap-3">
                  <Info className="text-yellow-400 shrink-0" size={20} />

                  <div>
                    <p className="text-yellow-400 font-bold text-xs mb-2">
                      ADVERTENCIA DEL SISTEMA
                    </p>

                    <p className="text-gray-400 text-xs leading-relaxed">
                      Este diagnóstico pertenece a una simulación basada en el
                      universo Ben 10. Las fallas identificadas son hipótesis y
                      no representan una reparación real del dispositivo. Los
                      procedimientos generados por IA deben contrastarse con el
                      catálogo técnico.
                    </p>
                  </div>
                </div>

                {/* HERRAMIENTAS */}
                <div className="mt-8 pt-6 border-t border-[#29412f]">
                  <button
                    type="button"
                    onClick={() => setMostrarHerramientas(!mostrarHerramientas)}
                    className="w-full flex items-center justify-between text-[#8cff00] hover:text-white transition"
                  >
                    <span className="flex items-center gap-3 text-xs font-bold tracking-wider">
                      <Database size={18} />
                      CONSULTAS A LA BASE DE DATOS
                    </span>

                    {mostrarHerramientas ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>

                  {mostrarHerramientas && (
                    <div className="mt-5 space-y-3">
                      {(resultado.herramientas_ejecutadas || []).map(
                        (herramienta, index) => (
                          <div
                            key={index}
                            className="bg-[#0a110d] border border-[#29412f] p-4"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2
                                size={16}
                                className="text-[#8cff00]"
                              />

                              <span className="text-[#8cff00] text-sm font-bold">
                                {herramienta.herramienta}
                              </span>
                            </div>

                            <pre className="text-gray-400 text-xs whitespace-pre-wrap break-all">
                              {herramienta.argumentos}
                            </pre>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* TOKENS */}
                <div className="mt-7 pt-5 border-t border-[#29412f] flex flex-wrap gap-5 text-xs text-gray-400">
                  <span className="flex items-center gap-2">
                    <Zap size={16} className="text-[#8cff00]" />
                    Consumidos:{" "}
                    <strong className="text-white">
                      {resultado.tokens_total?.toLocaleString()}
                    </strong>
                  </span>

                  <span>
                    Disponibles:{" "}
                    <strong className="text-[#8cff00]">
                      {resultado.tokens_disponibles?.toLocaleString()}
                    </strong>
                  </span>

                  <span>Modelo: {resultado.modelo}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL LATERAL */}
        <aside className="space-y-5">
          {/* FALLAS DE EJEMPLO */}
          <div className="border border-[#29412f] bg-[#101914]">
            <div className="p-5 border-b border-[#29412f] flex items-center gap-3">
              <ShieldAlert size={22} className="text-[#8cff00]" />

              <h3 className="font-black text-sm tracking-wider">
                FALLAS CONOCIDAS
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {fallasEjemplo.map((falla) => (
                <button
                  key={falla.codigo}
                  type="button"
                  disabled={cargando}
                  onClick={() => {
                    setProblema(falla.problema);
                    setResultado(null);
                    setError("");
                  }}
                  className="w-full text-left border border-[#29412f] p-4 hover:border-[#8cff00] hover:bg-[#1b3020] disabled:opacity-50 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#8cff00] text-xs font-black">
                      {falla.codigo}
                    </span>

                    <Wrench size={15} className="text-gray-500" />
                  </div>

                  <h4 className="text-white font-bold text-xs mb-2">
                    {falla.nombre}
                  </h4>

                  <p className="text-gray-400 text-xs leading-relaxed">
                    {falla.descripcion}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* INFORMACIÓN DEL SISTEMA */}
          <div className="border border-[#29412f] bg-[#101914] p-5">
            <div className="flex items-center gap-3 mb-5">
              <Cpu size={21} className="text-[#8cff00]" />

              <h3 className="font-black text-sm">INFORMACIÓN TÉCNICA</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Proveedor</span>
                <span>Groq</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Base de datos</span>
                <span>Neon PostgreSQL</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Tipo</span>
                <span className="text-[#8cff00]">Agente de diagnóstico</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Autenticación</span>
                <span>JWT</span>
              </div>
            </div>
          </div>

          {/* NOTA */}
          <div className="border-l-2 border-[#8cff00] bg-[#142019] p-5">
            <p className="text-[#8cff00] font-bold text-xs mb-3">
              PROTOCOLO GALVAN
            </p>

            <p className="text-gray-400 text-xs leading-relaxed">
              El sistema compara los síntomas reportados con las fallas
              almacenadas en Neon y utiliza inteligencia artificial para
              elaborar posibles diagnósticos.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
