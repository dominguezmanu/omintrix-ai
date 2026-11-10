import { useEffect, useState } from "react";
import axios from "axios";
import {
  Users,
  Bot,
  ShieldCheck,
  Save,
  LoaderCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Database,
  Plus,
  X,
  UserPlus,
  BarChart3,
} from "lucide-react";
import AdminAliens from "./AdminAliens";
import AdminReportes from "./AdminReportes";
const API_URL = import.meta.env.VITE_API_URL;

export default function AdminPanel({ token, usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [seccion, setSeccion] = useState("usuarios");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [mostrarCrearUsuario, setMostrarCrearUsuario] = useState(false);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    correo: "",
    password: "",
    rol: "usuario",
    limite_tokens: 100000,
  });

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const [respuestaUsuarios, respuestaServicios] = await Promise.all([
        api.get("/api/v1/admin/usuarios"),
        api.get("/api/v1/admin/servicios"),
      ]);

      setUsuarios(respuestaUsuarios.data);
      setServicios(respuestaServicios.data);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "No tienes permisos administrativos."
          : "No fue posible cargar la administración.",
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [token]);

  function modificarUsuario(id, campo, valor) {
    setUsuarios((actuales) =>
      actuales.map((u) => (u.id === id ? { ...u, [campo]: valor } : u)),
    );
  }

  function modificarServicio(id, campo, valor) {
    setServicios((actuales) =>
      actuales.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)),
    );
  }

  async function guardarUsuario(u) {
    setGuardando(`usuario-${u.id}`);
    setError("");
    setMensaje("");

    try {
      await api.patch(`/api/v1/admin/usuarios/${u.id}`, {
        nombre: u.nombre,
        rol: u.rol,
        activo: u.activo,
        limite_tokens: Number(u.limite_tokens),
      });

      setMensaje(`Usuario ${u.nombre} actualizado correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(
        err.response?.data?.detail || "No se pudo actualizar el usuario.",
      );
    } finally {
      setGuardando(null);
    }
  }

  async function crearUsuario(e) {
    e.preventDefault();

    setGuardando("crear-usuario");
    setError("");
    setMensaje("");

    try {
      await api.post("/api/v1/admin/usuarios", {
        ...nuevoUsuario,
        limite_tokens: Number(nuevoUsuario.limite_tokens),
      });

      setMensaje("Nuevo portador registrado correctamente.");

      setNuevoUsuario({
        nombre: "",
        correo: "",
        password: "",
        rol: "usuario",
        limite_tokens: 100000,
      });

      setMostrarCrearUsuario(false);

      await cargarDatos();
    } catch (err) {
      const detalle = err.response?.data?.detail;

      setError(
        typeof detalle === "string"
          ? detalle
          : "No fue posible crear el usuario.",
      );
    } finally {
      setGuardando(null);
    }
  }

  async function guardarServicio(s) {
    setGuardando(`servicio-${s.id}`);
    setError("");
    setMensaje("");

    try {
      await api.patch(`/api/v1/admin/servicios/${s.id}`, {
        activo: s.activo,
        limite_tokens_solicitud: Number(s.limite_tokens_solicitud),
      });

      setMensaje(`Servicio ${s.nombre} actualizado correctamente.`);
      await cargarDatos();
    } catch (err) {
      setError(
        err.response?.data?.detail || "No se pudo actualizar el servicio.",
      );
    } finally {
      setGuardando(null);
    }
  }

  if (usuario.rol !== "admin") {
    return (
      <div className="text-red-400 p-8">Acceso administrativo denegado.</div>
    );
  }

  const consumoTotal = usuarios.reduce(
    (total, u) => total + Number(u.tokens_consumidos || 0),
    0,
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-9">
        <div>
          <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-3">
            GALVAN SYSTEMS // ADMINISTRACIÓN
          </p>

          <h1 className="text-3xl md:text-4xl font-black">
            CENTRO DE <span className="text-[#8cff00]">CONTROL</span>
          </h1>

          <p className="text-gray-400 mt-3">
            Administración de usuarios y servicios del Omnitrix.
          </p>
        </div>

        <button
          onClick={cargarDatos}
          disabled={cargando || guardando !== null}
          className="border border-[#34503a] text-[#8cff00] px-5 py-3 flex items-center gap-2 hover:border-[#8cff00] disabled:opacity-50"
        >
          <RefreshCw size={18} />
          ACTUALIZAR
        </button>
      </div>

      {/* INDICADORES */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          {
            titulo: "USUARIOS REGISTRADOS",
            valor: usuarios.length,
            icono: Users,
          },
          {
            titulo: "SERVICIOS ACTIVOS",
            valor: servicios.filter((s) => s.activo).length,
            icono: Bot,
          },
          {
            titulo: "TOKENS CONSUMIDOS",
            valor: consumoTotal.toLocaleString(),
            icono: Zap,
          },
        ].map((indicador) => {
          const Icono = indicador.icono;

          return (
            <div
              key={indicador.titulo}
              className="bg-[#101914] border border-[#29412f] p-6"
            >
              <Icono size={25} className="text-[#8cff00] mb-5" />

              <p className="text-xs text-gray-400 tracking-wider mb-3">
                {indicador.titulo}
              </p>

              <p className="text-3xl font-black">{indicador.valor}</p>
            </div>
          );
        })}
      </div>

      {/* MENÚ */}
      <div className="flex flex-wrap gap-3 mb-7">
        {[
          { id: "usuarios", nombre: "USUARIOS", icono: Users },
          { id: "servicios", nombre: "SERVICIOS IA", icono: Bot },
          { id: "aliens", nombre: "ALIENS", icono: Database },
          { id: "reportes", nombre: "REPORTE", icono: BarChart3 },
        ].map((item) => {
          const Icono = item.icono;

          return (
            <button
              key={item.id}
              onClick={() => setSeccion(item.id)}
              className={`flex gap-3 items-center px-6 py-3 font-bold text-sm ${
                seccion === item.id
                  ? "bg-[#8cff00] text-black"
                  : "border border-[#34503a] text-gray-400 hover:text-white"
              }`}
            >
              <Icono size={18} />
              {item.nombre}
            </button>
          );
        })}
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div className="mb-6 border border-[#8cff00]/40 bg-[#8cff00]/10 p-4 text-[#8cff00] flex items-center gap-3">
          <CheckCircle2 size={20} />
          {mensaje}
        </div>
      )}

      {error && (
        <div className="mb-6 border border-red-500/40 bg-red-950/20 p-4 text-red-300 flex items-center gap-3">
          <AlertTriangle size={20} />
          {typeof error === "string"
            ? error
            : "Ocurrió un error de validación."}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-20">
          <LoaderCircle size={36} className="text-[#8cff00] animate-spin" />
        </div>
      ) : (
        <>
          {/* USUARIOS */}
          {seccion === "usuarios" && (
            <div className="space-y-5">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black">PORTADORES REGISTRADOS</h2>

                  <p className="text-gray-400 text-sm mt-2">
                    Gestiona los usuarios autorizados del Omnitrix.
                  </p>
                </div>

                <button
                  onClick={() => setMostrarCrearUsuario(!mostrarCrearUsuario)}
                  className="bg-[#8cff00] text-black px-5 py-3 font-black text-sm flex items-center gap-2 hover:bg-[#b1ff57] transition"
                >
                  {mostrarCrearUsuario ? (
                    <X size={19} />
                  ) : (
                    <UserPlus size={19} />
                  )}

                  {mostrarCrearUsuario ? "CANCELAR" : "NUEVO PORTADOR"}
                </button>
              </div>

              {mostrarCrearUsuario && (
                <form
                  onSubmit={crearUsuario}
                  className="border border-[#8cff00]/50 bg-[#101914] p-6 md:p-8 mb-7"
                >
                  <div className="flex items-center gap-3 mb-7">
                    <UserPlus size={24} className="text-[#8cff00]" />

                    <h3 className="font-black text-lg">
                      REGISTRAR NUEVO PORTADOR
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-400 text-xs mb-2">
                        NOMBRE COMPLETO
                      </label>

                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={nuevoUsuario.nombre}
                        onChange={(e) =>
                          setNuevoUsuario({
                            ...nuevoUsuario,
                            nombre: e.target.value,
                          })
                        }
                        placeholder="Ej. Rook Blonko"
                        className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2">
                        IDENTIFICADOR DE ACCESO
                      </label>

                      <input
                        required
                        type="text"
                        minLength={5}
                        maxLength={150}
                        value={nuevoUsuario.correo}
                        onChange={(e) =>
                          setNuevoUsuario({
                            ...nuevoUsuario,
                            correo: e.target.value,
                          })
                        }
                        placeholder="rook@omnitrix.local"
                        className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2">
                        CONTRASEÑA
                      </label>

                      <input
                        required
                        type="password"
                        minLength={8}
                        maxLength={128}
                        value={nuevoUsuario.password}
                        onChange={(e) =>
                          setNuevoUsuario({
                            ...nuevoUsuario,
                            password: e.target.value,
                          })
                        }
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2">
                        ROL DEL PORTADOR
                      </label>

                      <select
                        value={nuevoUsuario.rol}
                        onChange={(e) =>
                          setNuevoUsuario({
                            ...nuevoUsuario,
                            rol: e.target.value,
                          })
                        }
                        className="w-full bg-[#0a110d] border border-[#34503a] p-3"
                      >
                        <option value="usuario">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2">
                        LÍMITE DE TOKENS
                      </label>

                      <input
                        required
                        type="number"
                        min={0}
                        step={1}
                        value={nuevoUsuario.limite_tokens}
                        onChange={(e) =>
                          setNuevoUsuario({
                            ...nuevoUsuario,
                            limite_tokens: e.target.value,
                          })
                        }
                        className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#29412f] flex justify-end">
                    <button
                      type="submit"
                      disabled={guardando !== null}
                      className="bg-[#8cff00] text-black font-black px-7 py-4 flex items-center gap-3 hover:bg-[#b1ff57] disabled:opacity-50 transition"
                    >
                      {guardando === "crear-usuario" ? (
                        <LoaderCircle size={20} className="animate-spin" />
                      ) : (
                        <Plus size={20} />
                      )}
                      REGISTRAR PORTADOR
                    </button>
                  </div>
                </form>
              )}
              <div className="flex items-center gap-3 mb-6">
                <Users size={22} className="text-[#8cff00]" />
                <h2 className="text-xl font-black">
                  ADMINISTRACIÓN DE USUARIOS
                </h2>
              </div>

              {usuarios.map((u) => {
                const esPropio = u.id === usuario.id;
                const estaGuardando = guardando === `usuario-${u.id}`;

                return (
                  <div
                    key={u.id}
                    className="bg-[#101914] border border-[#29412f] p-5 md:p-7"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#8cff00] text-black flex items-center justify-center font-black text-xl">
                          {u.nombre.charAt(0)}
                        </div>

                        <div>
                          <h3 className="font-black text-lg">{u.nombre}</h3>

                          <p className="text-gray-500 text-sm">{u.correo}</p>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-3 py-2 border ${
                          u.activo
                            ? "text-[#8cff00] border-[#8cff00]/40"
                            : "text-red-400 border-red-500/40"
                        }`}
                      >
                        {u.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          NOMBRE
                        </label>

                        <input
                          value={u.nombre}
                          onChange={(e) =>
                            modificarUsuario(u.id, "nombre", e.target.value)
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          ROL
                        </label>

                        <select
                          value={u.rol}
                          disabled={esPropio}
                          onChange={(e) =>
                            modificarUsuario(u.id, "rol", e.target.value)
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3"
                        >
                          <option value="admin">Administrador</option>
                          <option value="usuario">Usuario</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          LÍMITE DE TOKENS
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={u.limite_tokens}
                          onChange={(e) =>
                            modificarUsuario(
                              u.id,
                              "limite_tokens",
                              e.target.value,
                            )
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          ESTADO
                        </label>

                        <select
                          value={String(u.activo)}
                          disabled={esPropio}
                          onChange={(e) =>
                            modificarUsuario(
                              u.id,
                              "activo",
                              e.target.value === "true",
                            )
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3"
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-7 pt-5 border-t border-[#29412f] flex flex-wrap items-center justify-between gap-4">
                      <p className="text-gray-400 text-sm">
                        Tokens consumidos:{" "}
                        <strong className="text-[#8cff00]">
                          {Number(u.tokens_consumidos).toLocaleString()}
                        </strong>
                      </p>

                      <button
                        onClick={() => guardarUsuario(u)}
                        disabled={guardando !== null}
                        className="bg-[#8cff00] text-black px-6 py-3 font-black text-sm flex items-center gap-2 hover:bg-[#b1ff57] disabled:opacity-40"
                      >
                        {estaGuardando ? (
                          <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        GUARDAR CAMBIOS
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SERVICIOS IA */}
          {seccion === "servicios" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <Database size={22} className="text-[#8cff00]" />

                <h2 className="text-xl font-black">
                  CONFIGURACIÓN DE SERVICIOS IA
                </h2>
              </div>

              {servicios.map((s) => {
                const estaGuardando = guardando === `servicio-${s.id}`;

                return (
                  <div
                    key={s.id}
                    className="bg-[#101914] border border-[#29412f] p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <Bot size={27} className="text-[#8cff00]" />

                        <div>
                          <h3 className="font-black text-lg">{s.nombre}</h3>

                          <p className="text-gray-400 text-sm mt-1">
                            {s.descripcion}
                          </p>
                        </div>
                      </div>

                      <span className="text-[#8cff00] text-xs">
                        {s.proveedor?.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          MODELO
                        </label>

                        <div className="bg-[#0a110d] border border-[#34503a] p-3 text-sm break-all">
                          {s.modelo || "No configurado"}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          LÍMITE POR SOLICITUD
                        </label>

                        <input
                          type="number"
                          min="256"
                          max="100000"
                          value={s.limite_tokens_solicitud}
                          onChange={(e) =>
                            modificarServicio(
                              s.id,
                              "limite_tokens_solicitud",
                              e.target.value,
                            )
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2">
                          ESTADO
                        </label>

                        <select
                          value={String(s.activo)}
                          onChange={(e) =>
                            modificarServicio(
                              s.id,
                              "activo",
                              e.target.value === "true",
                            )
                          }
                          className="w-full bg-[#0a110d] border border-[#34503a] p-3"
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end mt-7 pt-5 border-t border-[#29412f]">
                      <button
                        onClick={() => guardarServicio(s)}
                        disabled={guardando !== null}
                        className="bg-[#8cff00] text-black px-6 py-3 font-black text-sm flex gap-2 items-center hover:bg-[#b1ff57] disabled:opacity-40"
                      >
                        {estaGuardando ? (
                          <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        GUARDAR CONFIGURACIÓN
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* ADMINISTRACIÓN DE ALIENS */}
          {seccion === "aliens" && <AdminAliens token={token} />}
          {/* REPORTES ADMINISTRATIVOS */}
          {seccion === "reportes" && <AdminReportes token={token} />}
        </>
      )}

      <div className="mt-9 border-l-2 border-[#8cff00] bg-[#142019] p-5 flex gap-3">
        <ShieldCheck size={22} className="text-[#8cff00] shrink-0" />

        <p className="text-gray-400 text-sm">
          Las modificaciones se realizan mediante la API de FastAPI y requieren
          permisos administrativos. Los cambios se almacenan directamente en
          Neon PostgreSQL.
        </p>
      </div>
    </div>
  );
}
