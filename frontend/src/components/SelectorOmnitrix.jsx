import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Zap,
  Send,
  LoaderCircle,
  Shield,
  Database,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Cpu,
  CheckCircle2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const escenarios = [
  {
    titulo: "RESCATE",
    descripcion: "Rescatar personas de un edificio en llamas.",
    texto:
      "Necesito rescatar a tres personas atrapadas en un edificio en llamas. Hay mucho humo, las escaleras están destruidas y tengo cinco minutos. ¿Qué transformación debería utilizar?",
  },
  {
    titulo: "INFILTRACIÓN",
    descripcion: "Entrar a una instalación sin ser detectado.",
    texto:
      "Necesito infiltrarme en una instalación enemiga, recuperar información y salir sin que los guardias me detecten. ¿Qué alien debería utilizar?",
  },
  {
    titulo: "EXPLORACIÓN",
    descripcion: "Investigar una zona submarina.",
    texto:
      "Debo explorar una instalación abandonada en el fondo del océano. Necesito moverme bajo el agua y buscar sobrevivientes. ¿Qué transformación me conviene?",
  },
  {
    titulo: "COMBATE",
    descripcion: "Detener a un enemigo extremadamente fuerte.",
    texto:
      "Un enemigo con fuerza extraordinaria está destruyendo una ciudad. Necesito detenerlo y proteger a los civiles. ¿Qué transformación sería la más adecuada?",
  },
];

export default function SelectorOmnitrix({ token, onConsumoActualizado }) {
  const [escenario, setEscenario] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarHerramientas, setMostrarHerramientas] = useState(false);

  async function analizarEscenario(e) {
    e.preventDefault();

    const texto = escenario.trim();

    if (!texto || cargando) return;

    setCargando(true);
    setError("");
    setResultado(null);

    try {
      const respuesta = await axios.post(
        `${API_URL}/api/v1/ia/selector`,
        { escenario: texto },
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
            : "No tienes suficientes tokens para esta consulta.",
        );
      } else {
        setError(
          typeof detalle === "string"
            ? detalle
            : "No fue posible completar el análisis. Inténtalo nuevamente.",
        );
      }
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setEscenario("");
    setResultado(null);
    setError("");
    setMostrarHerramientas(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ENCABEZADO */}
      <div className="mb-9">
        <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-3">
          SISTEMA DE ANÁLISIS // AI-02
        </p>

        <h1 className="text-3xl md:text-4xl font-black mb-3">
          SELECTOR <span className="text-[#8cff00]">OMNITRIX</span>
        </h1>

        <p className="text-gray-400 max-w-2xl leading-relaxed">
          Describe tu situación y el sistema analizará las transformaciones
          disponibles para recomendarte la más adecuada.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* FORMULARIO */}
        <div className="space-y-6">
          <form
            onSubmit={analizarEscenario}
            className="border border-[#29412f] bg-[#101914]"
          >
            <div className="p-5 border-b border-[#29412f] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu size={20} className="text-[#8cff00]" />

                <h2 className="font-bold tracking-wider text-sm">
                  ANÁLISIS DE ESCENARIO
                </h2>
              </div>

              <span className="text-[#8cff00] text-xs">INPUT_01</span>
            </div>

            <div className="p-5 md:p-7">
              <label className="block text-xs font-bold tracking-widest text-gray-400 mb-4">
                DESCRIPCIÓN DE LA SITUACIÓN
              </label>

              <textarea
                value={escenario}
                onChange={(e) => setEscenario(e.target.value)}
                maxLength={3000}
                rows={8}
                disabled={cargando}
                placeholder="Describe el problema, las condiciones del entorno, los peligros y el objetivo que necesitas cumplir..."
                className="w-full bg-[#0a110d] border border-[#34503a] p-5 text-white placeholder:text-gray-600 outline-none focus:border-[#8cff00] resize-y leading-relaxed disabled:opacity-60"
              />

              <div className="flex justify-between text-xs text-gray-500 mt-3">
                <span>Describe el escenario con suficiente detalle.</span>
                <span>{escenario.length}/3000</span>
              </div>

              <div className="flex flex-wrap gap-3 mt-7">
                <button
                  type="submit"
                  disabled={cargando || escenario.trim().length < 10}
                  className="flex-1 min-w-[180px] bg-[#8cff00] text-black font-black tracking-wider py-4 px-5 flex items-center justify-center gap-3 hover:bg-[#b1ff57] disabled:opacity-40 transition"
                >
                  {cargando ? (
                    <>
                      <LoaderCircle size={20} className="animate-spin" />
                      ANALIZANDO...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      ANALIZAR ESCENARIO
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={reiniciar}
                  disabled={cargando}
                  className="border border-[#34503a] px-5 text-gray-400 hover:text-[#8cff00] hover:border-[#8cff00] disabled:opacity-40 transition"
                  title="Limpiar"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </form>

          {/* CARGANDO */}
          {cargando && (
            <div className="border border-[#8cff00]/40 bg-[#101914] p-8 text-center">
              <LoaderCircle
                size={40}
                className="text-[#8cff00] animate-spin mx-auto mb-5"
              />

              <h3 className="font-black tracking-widest mb-3">
                ANALIZANDO TRANSFORMACIONES
              </h3>

              <p className="text-gray-400 text-sm">
                El sistema está consultando las especies disponibles y evaluando
                sus capacidades.
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              className="border border-red-500/40 bg-red-950/20 p-5 flex items-start gap-3"
            >
              <AlertTriangle size={21} className="text-red-400 shrink-0" />

              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* RESULTADO */}
          {resultado && (
            <div className="border border-[#8cff00]/50 bg-[#101914]">
              <div className="p-5 border-b border-[#29412f] flex items-center gap-3">
                <CheckCircle2 size={23} className="text-[#8cff00]" />

                <div>
                  <h2 className="font-black tracking-wider">
                    ANÁLISIS COMPLETADO
                  </h2>

                  <p className="text-gray-500 text-xs mt-1">
                    RECOMENDACIÓN GENERADA POR IA
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-8">
                <div className="text-gray-200 leading-relaxed text-sm break-words [overflow-wrap:anywhere] [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h2]:text-[#8cff00] [&_h3]:text-[#8cff00] [&_p]:mb-4 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_td]:border [&_th]:p-3 [&_td]:p-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {resultado.recomendacion}
                  </ReactMarkdown>
                </div>

                <div className="mt-8 pt-6 border-t border-[#29412f]">
                  <button
                    onClick={() => setMostrarHerramientas(!mostrarHerramientas)}
                    className="flex items-center gap-3 text-[#8cff00] text-xs font-bold tracking-wider hover:text-white transition"
                  >
                    <Database size={17} />

                    {mostrarHerramientas
                      ? "OCULTAR CONSULTAS REALIZADAS"
                      : "VER CONSULTAS REALIZADAS"}
                  </button>

                  {mostrarHerramientas && (
                    <div className="mt-5 space-y-3">
                      {(resultado.herramientas_ejecutadas || []).map(
                        (herramienta, index) => (
                          <div
                            key={index}
                            className="bg-[#0a110d] border border-[#29412f] p-4"
                          >
                            <p className="text-[#8cff00] font-bold text-sm mb-2">
                              {herramienta.herramienta}
                            </p>

                            <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                              {herramienta.argumentos}
                            </pre>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-5 border-t border-[#29412f] flex flex-wrap gap-5 text-xs text-gray-400">
                  <span className="flex items-center gap-2">
                    <Zap size={15} className="text-[#8cff00]" />
                    Tokens consumidos:{" "}
                    {resultado.tokens_total?.toLocaleString()}
                  </span>

                  <span>
                    Tokens disponibles:{" "}
                    <strong className="text-[#8cff00]">
                      {resultado.tokens_disponibles?.toLocaleString() ?? "—"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO */}
        <aside className="space-y-5">
          <div className="border border-[#29412f] bg-[#101914] p-5">
            <div className="flex items-center gap-3 mb-5">
              <Shield size={21} className="text-[#8cff00]" />

              <h3 className="font-black text-sm tracking-wider">
                ESCENARIOS DE PRUEBA
              </h3>
            </div>

            <p className="text-gray-400 text-xs mb-5 leading-relaxed">
              Selecciona una situación para cargarla automáticamente en el
              analizador.
            </p>

            <div className="space-y-3">
              {escenarios.map((ejemplo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setEscenario(ejemplo.texto);
                    setResultado(null);
                    setError("");
                  }}
                  disabled={cargando}
                  className="w-full text-left border border-[#29412f] p-4 hover:border-[#8cff00] hover:bg-[#1b3020] disabled:opacity-50 transition"
                >
                  <p className="text-[#8cff00] font-bold text-xs tracking-wider mb-2">
                    {ejemplo.titulo}
                  </p>

                  <p className="text-gray-400 text-xs leading-relaxed">
                    {ejemplo.descripcion}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[#29412f] bg-[#101914] p-5">
            <div className="flex items-center gap-3 mb-4">
              <Cpu size={20} className="text-[#8cff00]" />
              <h3 className="font-black text-sm">MOTOR DE ANÁLISIS</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Proveedor</span>
                <span className="text-white">Groq</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Información</span>
                <span className="text-white">Neon PostgreSQL</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Motor</span>
                <span className="text-[#8cff00]">Agente IA</span>
              </div>
            </div>
          </div>

          <div className="border-l-2 border-[#8cff00] bg-[#142019] p-5">
            <p className="text-[#8cff00] font-bold text-xs mb-3">
              NOTA DEL SISTEMA
            </p>

            <p className="text-gray-400 text-xs leading-relaxed">
              Las recomendaciones se generan a partir de las características
              registradas de cada especie. Las valoraciones son orientativas y
              pertenecen al universo ficticio de Ben 10.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
