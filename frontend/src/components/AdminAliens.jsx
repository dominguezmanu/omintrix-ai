import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  Save,
  X,
  Pencil,
  Power,
  RefreshCw,
  LoaderCircle,
  Dna,
  Zap,
  AlertTriangle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const formularioVacio = {
  nombre: "",
  especie: "",
  planeta: "",
  descripcion: "",
  fortalezas: "",
  debilidades: "",
  imagen_url: "",
  serie_origen: "",
  activo: true,
};

function normalizarAlien(alien) {
  return {
    ...formularioVacio,
    ...alien,
    imagen_url: alien.imagen_url || "",
  };
}

export default function AdminAliens({ token }) {
  const [aliens, setAliens] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [habilidadId, setHabilidadId] = useState("");
  const [nivel, setNivel] = useState(5);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const mostrarError = (err) => {
    const detalle = err.response?.data?.detail;
    setError(
      typeof detalle === "string"
        ? detalle
        : "No fue posible completar la operación.",
    );
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [resAliens, resHabilidades] = await Promise.all([
        axios.get(`${API_URL}/api/v1/admin/aliens`, { headers }),
        axios.get(`${API_URL}/api/v1/admin/aliens/catalogo/habilidades`, {
          headers,
        }),
      ]);

      setAliens(resAliens.data);
      setHabilidades(resHabilidades.data);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function nuevoAlien() {
    setFormulario({ ...formularioVacio });
    setEditando(null);
    setDetalle(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  function editarAlien(alien) {
    setFormulario(normalizarAlien(alien));
    setEditando(alien.id);
    setDetalle(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  }

  async function guardarAlien(e) {
    e.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        especie: formulario.especie || null,
        planeta: formulario.planeta || null,
        descripcion: formulario.descripcion || null,
        fortalezas: formulario.fortalezas || null,
        debilidades: formulario.debilidades || null,
        imagen_url: formulario.imagen_url || null,
        serie_origen: formulario.serie_origen || null,
      };

      if (editando) {
        await api.patch(`/api/v1/admin/aliens/${editando}`, {
          ...datos,
          activo: formulario.activo,
        });
      } else {
        await api.post("/api/v1/admin/aliens", datos);
      }

      setMensaje(
        editando
          ? "Transformación actualizada correctamente."
          : "Nueva transformación registrada.",
      );

      setMostrarFormulario(false);
      await cargarDatos();
    } catch (err) {
      mostrarError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(alien) {
    const accion = alien.activo ? "desactivar" : "reactivar";

    if (!window.confirm(`¿Querés ${accion} la transformación ${alien.nombre}?`))
      return;

    setGuardando(true);
    setError("");

    try {
      if (alien.activo) {
        await api.delete(`/api/v1/admin/aliens/${alien.id}`);
      } else {
        await api.patch(`/api/v1/admin/aliens/${alien.id}`, { activo: true });
      }

      setMensaje(
        `Transformación ${
          accion === "desactivar" ? "desactivada" : "reactivada"
        } correctamente.`,
      );

      await cargarDatos();
    } catch (err) {
      mostrarError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function abrirDetalle(id) {
    setError("");
    setMostrarFormulario(false);

    try {
      const respuesta = await api.get(`/api/v1/admin/aliens/${id}`);
      setDetalle(respuesta.data);
    } catch (err) {
      mostrarError(err);
    }
  }

  async function asignarHabilidad(e) {
    e.preventDefault();

    if (!detalle || !habilidadId) return;

    setGuardando(true);
    setError("");

    try {
      await api.post(`/api/v1/admin/aliens/${detalle.id}/habilidades`, {
        habilidad_id: Number(habilidadId),
        nivel: Number(nivel),
      });

      await abrirDetalle(detalle.id);
      setHabilidadId("");
      setNivel(5);
      setMensaje("Habilidad asignada correctamente.");
    } catch (err) {
      mostrarError(err);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarHabilidad(id) {
    if (!detalle) return;

    setGuardando(true);
    setError("");

    try {
      await api.delete(`/api/v1/admin/aliens/${detalle.id}/habilidades/${id}`);

      await abrirDetalle(detalle.id);
      setMensaje("Habilidad eliminada correctamente.");
    } catch (err) {
      mostrarError(err);
    } finally {
      setGuardando(false);
    }
  }

  const filtrados = aliens.filter((alien) =>
    `${alien.nombre} ${alien.especie || ""} ${alien.planeta || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  const campo = (nombre, etiqueta, multilinea = false) => (
    <div>
      <label className="block text-xs text-gray-400 mb-2 uppercase">
        {etiqueta}
      </label>

      {multilinea ? (
        <textarea
          rows={3}
          value={formulario[nombre] || ""}
          onChange={(e) =>
            setFormulario({
              ...formulario,
              [nombre]: e.target.value,
            })
          }
          className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
        />
      ) : (
        <input
          value={formulario[nombre] || ""}
          required={nombre === "nombre"}
          maxLength={nombre === "nombre" ? 100 : undefined}
          onChange={(e) =>
            setFormulario({
              ...formulario,
              [nombre]: e.target.value,
            })
          }
          className="w-full bg-[#0a110d] border border-[#34503a] p-3 outline-none focus:border-[#8cff00]"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[#8cff00] text-xs tracking-[0.25em] mb-2">
            BANCO GENÉTICO // ADMINISTRACIÓN
          </p>
          <h2 className="text-2xl font-black">CATÁLOGO DE ALIENS</h2>
          <p className="text-gray-400 text-sm mt-2">
            {aliens.length} transformaciones registradas
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={cargarDatos}
            className="border border-[#34503a] p-3 text-[#8cff00]"
            title="Actualizar"
          >
            <RefreshCw size={19} />
          </button>

          <button
            onClick={nuevoAlien}
            className="bg-[#8cff00] text-black px-5 py-3 font-black flex items-center gap-2"
          >
            <Plus size={19} />
            NUEVO ALIEN
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-950/20 p-4 text-red-300 flex gap-3">
          <AlertTriangle size={19} />
          {error}
        </div>
      )}

      {mensaje && (
        <div className="border border-[#8cff00]/40 bg-[#8cff00]/10 p-4 text-[#8cff00]">
          {mensaje}
        </div>
      )}

      {mostrarFormulario && (
        <form
          onSubmit={guardarAlien}
          className="border border-[#8cff00]/50 bg-[#101914] p-6 space-y-5"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg">
              {editando ? "EDITAR TRANSFORMACIÓN" : "REGISTRAR TRANSFORMACIÓN"}
            </h3>
            <button type="button" onClick={() => setMostrarFormulario(false)}>
              <X size={21} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {campo("nombre", "Nombre")}
            {campo("especie", "Especie")}
            {campo("planeta", "Planeta")}
            {campo("serie_origen", "Serie de origen")}
            {campo("imagen_url", "URL de imagen")}
          </div>

          {campo("descripcion", "Descripción", true)}
          {campo("fortalezas", "Fortalezas", true)}
          {campo("debilidades", "Debilidades", true)}

          <button
            type="submit"
            disabled={guardando}
            className="bg-[#8cff00] text-black px-7 py-3 font-black flex gap-2 items-center disabled:opacity-50"
          >
            {guardando ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Save size={19} />
            )}
            GUARDAR TRANSFORMACIÓN
          </button>
        </form>
      )}

      {detalle && (
        <div className="border border-[#8cff00]/50 bg-[#101914] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs text-[#8cff00] mb-2">
                CONFIGURACIÓN GENÉTICA
              </p>
              <h3 className="text-2xl font-black">{detalle.nombre}</h3>
            </div>

            <button onClick={() => setDetalle(null)}>
              <X size={22} />
            </button>
          </div>

          <h4 className="font-bold mb-4">HABILIDADES ASIGNADAS</h4>

          <div className="space-y-3 mb-7">
            {(detalle.habilidades || []).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 bg-[#0a110d] border border-[#29412f] p-4"
              >
                <span>{h.nombre}</span>

                <div className="flex gap-4 items-center">
                  <span className="text-[#8cff00]">{h.nivel}/10</span>

                  <button
                    disabled={guardando}
                    onClick={() => eliminarHabilidad(h.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={19} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={asignarHabilidad}
            className="grid sm:grid-cols-[1fr_100px_auto] gap-3"
          >
            <select
              required
              value={habilidadId}
              onChange={(e) => setHabilidadId(e.target.value)}
              className="bg-[#0a110d] border border-[#34503a] p-3"
            >
              <option value="">Seleccionar habilidad</option>
              {habilidades.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={10}
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="bg-[#0a110d] border border-[#34503a] p-3"
            />

            <button
              type="submit"
              disabled={guardando}
              className="bg-[#8cff00] text-black px-5 py-3 font-bold flex items-center gap-2"
            >
              <Zap size={18} />
              ASIGNAR
            </button>
          </form>
        </div>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar alien, especie o planeta..."
        className="w-full bg-[#101914] border border-[#34503a] p-4 outline-none focus:border-[#8cff00]"
      />

      {cargando ? (
        <LoaderCircle
          size={35}
          className="text-[#8cff00] animate-spin mx-auto"
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((alien) => (
            <div
              key={alien.id}
              className="border border-[#29412f] bg-[#101914] p-5"
            >
              <div className="flex justify-between items-start mb-5">
                <Dna size={30} className="text-[#8cff00]" />

                <span
                  className={`text-xs px-3 py-1 border ${
                    alien.activo
                      ? "text-[#8cff00] border-[#8cff00]/40"
                      : "text-red-400 border-red-500/40"
                  }`}
                >
                  {alien.activo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>

              <h3 className="text-xl font-black mb-2">{alien.nombre}</h3>

              <p className="text-gray-400 text-sm">{alien.especie}</p>

              <p className="text-gray-500 text-xs mt-2">{alien.planeta}</p>

              <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[#29412f]">
                <button
                  onClick={() => editarAlien(alien)}
                  className="border border-[#34503a] px-3 py-2 text-xs flex gap-2 items-center hover:text-[#8cff00]"
                >
                  <Pencil size={15} />
                  EDITAR
                </button>

                <button
                  onClick={() => abrirDetalle(alien.id)}
                  className="border border-[#34503a] px-3 py-2 text-xs flex gap-2 items-center hover:text-[#8cff00]"
                >
                  <Zap size={15} />
                  HABILIDADES
                </button>

                <button
                  disabled={guardando}
                  onClick={() => cambiarEstado(alien)}
                  className="border border-[#34503a] px-3 py-2 text-xs flex gap-2 items-center hover:text-[#8cff00] disabled:opacity-50"
                >
                  <Power size={15} />
                  {alien.activo ? "DESACTIVAR" : "ACTIVAR"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
