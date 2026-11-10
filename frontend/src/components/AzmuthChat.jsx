import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Database,
  Zap,
  LoaderCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function AzmuthChat({ token, usuario, onConsumoActualizado }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionId, setConversacionId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [error, setError] = useState("");
  const [ultimoConsumo, setUltimoConsumo] = useState(null);

  const finalChat = useRef(null);

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  useEffect(() => {
    cargarConversaciones();
  }, [token]);

  useEffect(() => {
    finalChat.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [mensajes, cargando]);

  async function cargarConversaciones() {
    try {
      const respuesta = await api.get("/api/v1/conversaciones");

      setConversaciones(
        respuesta.data.filter(
          (conversacion) => conversacion.servicio === "Azmuth AI",
        ),
      );
    } catch {
      setError("No se pudo cargar el historial de conversaciones.");
    }
  }

  async function abrirConversacion(id) {
    if (cargando) return;

    setCargandoHistorial(true);
    setError("");

    try {
      const respuesta = await api.get(`/api/v1/conversaciones/${id}`);

      setConversacionId(id);
      setMensajes(respuesta.data.mensajes);
      setUltimoConsumo(null);
    } catch {
      setError("No se pudo abrir esta conversación.");
    } finally {
      setCargandoHistorial(false);
    }
  }

  function nuevaConversacion() {
    if (cargando) return;

    setConversacionId(null);
    setMensajes([]);
    setPregunta("");
    setError("");
    setUltimoConsumo(null);
  }

  async function enviarMensaje(e) {
    e.preventDefault();

    const texto = pregunta.trim();

    if (!texto || cargando || cargandoHistorial) return;

    setError("");
    setCargando(true);
    setPregunta("");

    const mensajeTemporal = {
      id: `temp-${Date.now()}`,
      rol: "user",
      contenido: texto,
      fuentes: [],
    };

    setMensajes((anteriores) => [...anteriores, mensajeTemporal]);

    try {
      const respuesta = await api.post("/api/v1/ia/azmuth", {
        pregunta: texto,
        conversacion_id: conversacionId,
      });

      const datos = respuesta.data;

      setConversacionId(datos.conversacion_id);

      setMensajes((anteriores) => [
        ...anteriores,
        {
          id: `respuesta-${Date.now()}`,
          rol: "assistant",
          contenido: datos.respuesta,
          fuentes: datos.fuentes || [],
        },
      ]);

      setUltimoConsumo({
        tokens_total: datos.tokens_total,
        tokens_disponibles: datos.tokens_disponibles,
      });

      await cargarConversaciones();

      onConsumoActualizado?.();
    } catch (err) {
      setMensajes((anteriores) =>
        anteriores.filter((mensaje) => mensaje.id !== mensajeTemporal.id),
      );

      setPregunta(texto);

      const detalle = err.response?.data?.detail;

      setError(
        typeof detalle === "string"
          ? detalle
          : "No fue posible comunicarse con Azmuth.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="h-[calc(100vh-165px)] min-h-[500px] flex border border-[#243c2c] bg-[#0d1510] overflow-hidden">
      {/* HISTORIAL LATERAL */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-[#243c2c] flex-col">
        <div className="p-4 border-b border-[#243c2c]">
          <button
            onClick={nuevaConversacion}
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[#8cff00] text-black font-bold py-3 hover:bg-[#b1ff57] disabled:opacity-50 transition text-sm"
          >
            <Plus size={18} />
            NUEVA CONVERSACIÓN
          </button>
        </div>

        <div className="p-4 text-[10px] text-gray-500 tracking-[0.2em]">
          REGISTROS ANTERIORES
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {conversaciones.length === 0 && (
            <p className="text-gray-500 text-xs px-3">
              No hay conversaciones registradas.
            </p>
          )}

          {conversaciones.map((conversacion) => (
            <button
              key={conversacion.id}
              onClick={() => abrirConversacion(conversacion.id)}
              disabled={cargando || cargandoHistorial}
              className={`
                w-full text-left flex items-start gap-3
                px-3 py-3 mb-1 text-sm transition
                disabled:opacity-60
                ${
                  conversacionId === conversacion.id
                    ? "bg-[#213c26] text-[#8cff00]"
                    : "text-gray-400 hover:bg-[#17241b] hover:text-white"
                }
              `}
            >
              <MessageSquare size={17} className="shrink-0 mt-1" />

              <span className="truncate">
                {conversacion.titulo || "Conversación sin título"}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* CHAT */}
      <section className="flex-1 min-w-0 flex flex-col">
        {/* ENCABEZADO */}
        <div className="h-20 px-5 border-b border-[#243c2c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#8cff00] flex items-center justify-center">
              <Bot size={27} className="text-black" />
            </div>

            <div>
              <h2 className="font-black tracking-wider">AZMUTH AI</h2>

              <p className="text-[#8cff00] text-[10px] tracking-widest">
                GALVAN INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={nuevaConversacion}
              disabled={cargando}
              className="md:hidden text-[#8cff00]"
              title="Nueva conversación"
            >
              <Plus size={22} />
            </button>

            <button
              onClick={cargarConversaciones}
              className="text-gray-400 hover:text-[#8cff00]"
              title="Actualizar historial"
            >
              <RefreshCw size={18} />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#8cff00]">
              <span className="w-2 h-2 rounded-full bg-[#8cff00]" />
              EN LÍNEA
            </div>
          </div>
        </div>

        {/* MENSAJES */}
        <div className="flex-1 overflow-y-auto p-4 md:p-7 space-y-6">
          {cargandoHistorial && (
            <div className="flex justify-center py-10">
              <LoaderCircle size={30} className="text-[#8cff00] animate-spin" />
            </div>
          )}

          {!cargandoHistorial && mensajes.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
              <div className="w-24 h-24 border-2 border-[#8cff00] flex items-center justify-center mb-7 shadow-[0_0_40px_#8cff0020]">
                <Bot size={48} className="text-[#8cff00]" />
              </div>

              <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-4">
                COMUNICACIÓN ESTABLECIDA
              </p>

              <h3 className="text-3xl font-black mb-4">
                SALUDOS, {usuario.nombre.split(" ")[0].toUpperCase()}.
              </h3>

              <p className="text-gray-400 leading-relaxed mb-8">
                Soy Azmuth, creador del Omnitrix. Supongo que tienes alguna
                pregunta que requiere de mi extraordinaria inteligencia.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 w-full">
                {[
                  "¿Qué puedes decirme sobre XLR8?",
                  "¿Cuál es el alien más inteligente?",
                  "¿Cómo funciona el Omnitrix?",
                  "¿Qué transformación sirve para explorar el océano?",
                ].map((sugerencia) => (
                  <button
                    key={sugerencia}
                    onClick={() => setPregunta(sugerencia)}
                    className="border border-[#2b4431] p-4 text-left text-sm text-gray-300 hover:border-[#8cff00] hover:text-white transition"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!cargandoHistorial &&
            mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                className={`flex gap-3 ${
                  mensaje.rol === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {mensaje.rol === "assistant" && (
                  <div className="hidden sm:flex w-9 h-9 bg-[#8cff00] items-center justify-center shrink-0">
                    <Bot size={22} className="text-black" />
                  </div>
                )}

                <div
                  className={`
                  max-w-[92%] md:max-w-[80%] min-w-0
                  px-5 py-4 text-sm leading-relaxed
                  ${
                    mensaje.rol === "user"
                      ? "bg-[#243c2c] border border-[#3b5f43]"
                      : "bg-[#121d16] border border-[#253c2b]"
                  }
                `}
                >
                  <div className="text-[10px] tracking-widest text-[#8cff00] mb-3 font-bold">
                    {mensaje.rol === "user" ? "PORTADOR" : "AZMUTH"}
                  </div>

                  <div className="text-gray-200 break-words [overflow-wrap:anywhere] [&_p]:mb-3 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_td]:border [&_th]:p-2 [&_td]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {mensaje.contenido}
                    </ReactMarkdown>
                  </div>

                  {Array.isArray(mensaje.fuentes) &&
                    mensaje.fuentes.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-[#2c4633]">
                        <div className="flex items-center gap-2 text-[#8cff00] text-xs font-bold mb-3">
                          <Database size={15} />
                          FUENTES CONSULTADAS
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {mensaje.fuentes.map((fuente, index) => (
                            <span
                              key={index}
                              className="text-xs bg-[#1c3022] border border-[#36563e] px-3 py-2 text-gray-300"
                            >
                              {fuente.titulo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

          {cargando && (
            <div className="flex gap-3 items-center text-[#8cff00] text-sm">
              <LoaderCircle size={21} className="animate-spin" />
              Azmuth está analizando la información...
            </div>
          )}

          <div ref={finalChat} />
        </div>

        {/* ERROR */}
        {error && (
          <div className="mx-5 mb-3 border border-red-500/40 bg-red-950/30 p-3 text-red-300 text-xs flex gap-2">
            <AlertTriangle size={17} className="shrink-0" />
            {error}
          </div>
        )}

        {/* CONSUMO */}
        {ultimoConsumo && (
          <div className="px-5 py-2 border-t border-[#243c2c] flex flex-wrap gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-2">
              <Zap size={14} className="text-[#8cff00]" />
              Última consulta: {ultimoConsumo.tokens_total} tokens
            </span>

            <span>
              Disponibles:{" "}
              <strong className="text-[#8cff00]">
                {ultimoConsumo.tokens_disponibles.toLocaleString()}
              </strong>
            </span>
          </div>
        )}

        {/* FORMULARIO */}
        <form
          onSubmit={enviarMensaje}
          className="p-4 md:p-5 border-t border-[#243c2c]"
        >
          <div className="flex gap-3 items-end">
            <textarea
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Escribe tu consulta para Azmuth..."
              rows={2}
              maxLength={2000}
              disabled={cargando || cargandoHistorial}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();

                  if (!cargando && pregunta.trim()) {
                    e.currentTarget.form.requestSubmit();
                  }
                }
              }}
              className="flex-1 min-w-0 resize-none bg-[#152119] border border-[#34503a] p-4 text-white placeholder:text-gray-500 outline-none focus:border-[#8cff00] disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={cargando || cargandoHistorial || !pregunta.trim()}
              className="h-[58px] w-[58px] shrink-0 bg-[#8cff00] text-black flex items-center justify-center hover:bg-[#b1ff57] disabled:opacity-40 transition"
            >
              {cargando ? (
                <LoaderCircle size={23} className="animate-spin" />
              ) : (
                <Send size={23} />
              )}
            </button>
          </div>

          <p className="text-[10px] text-gray-500 mt-3 text-center">
            SISTEMA DE INTELIGENCIA GALVAN • RESPUESTAS GENERADAS CON IA
          </p>
        </form>
      </section>
    </div>
  );
}
