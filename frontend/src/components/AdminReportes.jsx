import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  FilterX,
  LoaderCircle,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

const formatoNumero = (valor) => Number(valor || 0).toLocaleString("es-GT");

const formatoFecha = (valor) => {
  if (!valor) return "—";
  return String(valor).slice(0, 10);
};

const tooltipStyle = {
  backgroundColor: "#101914",
  border: "1px solid #34503a",
  borderRadius: 0,
  color: "#ffffff",
};

function Indicador({ titulo, valor, icono: Icono }) {
  return (
    <div className="bg-[#101914] border border-[#29412f] p-5">
      <div className="flex justify-between items-start mb-5">
        <p className="text-xs text-gray-400 tracking-wider">{titulo}</p>

        <Icono size={21} className="text-[#8cff00]" />
      </div>

      <p className="text-3xl font-black text-white">{formatoNumero(valor)}</p>
    </div>
  );
}

function GraficaVacia({ mensaje }) {
  return (
    <div className="h-64 flex items-center justify-center text-gray-500 text-sm text-center px-5">
      {mensaje}
    </div>
  );
}

export default function AdminReportes({ token }) {
  const [resumen, setResumen] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [diario, setDiario] = useState([]);
  const [detalle, setDetalle] = useState([]);

  const [catalogoUsuarios, setCatalogoUsuarios] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);

  const [filtros, setFiltros] = useState({
    usuario_id: "",
    servicio_id: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const parametros = useMemo(() => {
    const valores = {};

    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== "") valores[campo] = valor;
    }

    return valores;
  }, [filtros]);

  const cargarReportes = useCallback(async () => {
    if (
      filtros.fecha_inicio &&
      filtros.fecha_fin &&
      filtros.fecha_inicio > filtros.fecha_fin
    ) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }

    setCargando(true);
    setError("");

    const configuracion = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: parametros,
    };

    try {
      const [resResumen, resUsuarios, resServicios, resDiario, resDetalle] =
        await Promise.all([
          axios.get(`${API_URL}/api/v1/reportes/resumen`, configuracion),
          axios.get(`${API_URL}/api/v1/reportes/usuarios`, configuracion),
          axios.get(`${API_URL}/api/v1/reportes/servicios`, configuracion),
          axios.get(`${API_URL}/api/v1/reportes/diario`, configuracion),
          axios.get(`${API_URL}/api/v1/reportes/detalle`, configuracion),
        ]);

      setResumen(resResumen.data);
      setUsuarios(resUsuarios.data);
      setServicios(resServicios.data);
      setDiario(resDiario.data);
      setDetalle(resDetalle.data);
    } catch (err) {
      const detalleError = err.response?.data?.detail;

      setError(
        typeof detalleError === "string"
          ? detalleError
          : "No se pudieron cargar los reportes.",
      );
    } finally {
      setCargando(false);
    }
  }, [token, parametros, filtros.fecha_inicio, filtros.fecha_fin]);

  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      axios.get(`${API_URL}/api/v1/admin/usuarios`, { headers }),
      axios.get(`${API_URL}/api/v1/admin/servicios`, { headers }),
    ])
      .then(([resUsuarios, resServicios]) => {
        setCatalogoUsuarios(resUsuarios.data);
        setCatalogoServicios(resServicios.data);
      })
      .catch(() => {
        setError("No fue posible cargar los filtros de usuarios y servicios.");
      });
  }, [token]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  function actualizarFiltro(campo, valor) {
    setFiltros((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function limpiarFiltros() {
    setFiltros({
      usuario_id: "",
      servicio_id: "",
      fecha_inicio: "",
      fecha_fin: "",
    });
  }

  const datosServicios = servicios.map((s) => ({
    nombre: s.servicio,
    tokens: Number(s.tokens_total),
    consultas: Number(s.consultas),
  }));

  const datosDiarios = diario.map((d) => ({
    fecha: d.fecha,
    tokens: Number(d.tokens_total),
    consultas: Number(d.consultas),
  }));

  const totalUsuarios = usuarios.reduce(
    (suma, u) => suma + Number(u.tokens_total),
    0,
  );

  const totalServicios = servicios.reduce(
    (suma, s) => suma + Number(s.tokens_total),
    0,
  );

  const coincide =
    resumen &&
    totalUsuarios === Number(resumen.tokens_total) &&
    totalServicios === Number(resumen.tokens_total);

  return (
    <div className="space-y-7">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-[#8cff00] text-xs tracking-[0.3em] mb-3">
            GALVAN ANALYTICS // REPORTES
          </p>

          <h2 className="text-2xl md:text-3xl font-black">
            ANÁLISIS DE <span className="text-[#8cff00]">CONSUMO</span>
          </h2>

          <p className="text-gray-400 text-sm mt-3">
            Estadísticas obtenidas de Neon PostgreSQL mediante FastAPI.
          </p>
        </div>

        <button
          onClick={cargarReportes}
          disabled={cargando}
          className="flex items-center gap-2 px-5 py-3 border border-[#34503a] text-[#8cff00] hover:border-[#8cff00] disabled:opacity-50"
        >
          <RefreshCw size={18} className={cargando ? "animate-spin" : ""} />
          ACTUALIZAR
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-[#101914] border border-[#29412f] p-5">
        <div className="flex items-center gap-3 mb-5">
          <CalendarDays size={20} className="text-[#8cff00]" />
          <h3 className="font-black text-sm tracking-wider">
            FILTROS DEL REPORTE
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2">USUARIO</label>
            <select
              value={filtros.usuario_id}
              onChange={(e) => actualizarFiltro("usuario_id", e.target.value)}
              className="w-full bg-[#0a110d] border border-[#34503a] p-3"
            >
              <option value="">Todos los usuarios</option>
              {catalogoUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              SERVICIO IA
            </label>
            <select
              value={filtros.servicio_id}
              onChange={(e) => actualizarFiltro("servicio_id", e.target.value)}
              className="w-full bg-[#0a110d] border border-[#34503a] p-3"
            >
              <option value="">Todos los servicios</option>
              {catalogoServicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              FECHA INICIAL
            </label>
            <input
              type="date"
              value={filtros.fecha_inicio}
              onChange={(e) => actualizarFiltro("fecha_inicio", e.target.value)}
              className="w-full bg-[#0a110d] border border-[#34503a] p-3 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              FECHA FINAL
            </label>
            <input
              type="date"
              value={filtros.fecha_fin}
              onChange={(e) => actualizarFiltro("fecha_fin", e.target.value)}
              className="w-full bg-[#0a110d] border border-[#34503a] p-3 [color-scheme:dark]"
            />
          </div>
        </div>

        <button
          onClick={limpiarFiltros}
          className="flex items-center gap-2 text-gray-400 hover:text-[#8cff00] text-xs mt-5"
        >
          <FilterX size={17} />
          LIMPIAR FILTROS
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="border border-red-500/40 bg-red-950/20 text-red-300 p-5"
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <LoaderCircle size={38} className="text-[#8cff00] animate-spin" />
          <p className="text-gray-400 text-sm">
            Consultando los registros de consumo...
          </p>
        </div>
      ) : (
        resumen && (
          <>
            {/* INDICADORES */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Indicador
                titulo="CONSULTAS REGISTRADAS"
                valor={resumen.total_consultas}
                icono={Activity}
              />

              <Indicador
                titulo="TOKENS CONSUMIDOS"
                valor={resumen.tokens_total}
                icono={Zap}
              />

              <Indicador
                titulo="USUARIOS ACTIVOS"
                valor={resumen.usuarios_activos}
                icono={Users}
              />

              <Indicador
                titulo="SERVICIOS ACTIVOS"
                valor={resumen.servicios_activos}
                icono={Database}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-[#29412f] bg-[#101914] p-5">
                <p className="text-xs text-gray-400 mb-2">TOKENS DE ENTRADA</p>
                <p className="text-2xl font-black">
                  {formatoNumero(resumen.tokens_entrada)}
                </p>
              </div>

              <div className="border border-[#29412f] bg-[#101914] p-5">
                <p className="text-xs text-gray-400 mb-2">TOKENS DE SALIDA</p>
                <p className="text-2xl font-black">
                  {formatoNumero(resumen.tokens_salida)}
                </p>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid xl:grid-cols-2 gap-5">
              <div className="bg-[#101914] border border-[#29412f] p-5">
                <div className="flex items-center gap-3 mb-7">
                  <BarChart3 size={21} className="text-[#8cff00]" />
                  <h3 className="font-black text-sm">CONSUMO POR SERVICIO</h3>
                </div>

                {datosServicios.length === 0 ? (
                  <GraficaVacia mensaje="No hay consumo registrado para estos filtros." />
                ) : (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={datosServicios}
                        margin={{ top: 10, right: 10, left: 0, bottom: 55 }}
                      >
                        <CartesianGrid stroke="#29412f" strokeDasharray="3 3" />

                        <XAxis
                          dataKey="nombre"
                          stroke="#9ca3af"
                          tick={{ fontSize: 10 }}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                        />

                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fontSize: 11 }}
                          tickFormatter={formatoNumero}
                        />

                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(valor) => [
                            formatoNumero(valor),
                            "Tokens",
                          ]}
                        />

                        <Bar dataKey="tokens" fill="#8cff00" radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-[#101914] border border-[#29412f] p-5">
                <div className="flex items-center gap-3 mb-7">
                  <Activity size={21} className="text-[#8cff00]" />
                  <h3 className="font-black text-sm">ACTIVIDAD DIARIA</h3>
                </div>

                {datosDiarios.length === 0 ? (
                  <GraficaVacia mensaje="No hay actividad para el período seleccionado." />
                ) : (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosDiarios}>
                        <CartesianGrid stroke="#29412f" strokeDasharray="3 3" />

                        <XAxis
                          dataKey="fecha"
                          stroke="#9ca3af"
                          tick={{ fontSize: 10 }}
                        />

                        <YAxis
                          stroke="#9ca3af"
                          tick={{ fontSize: 11 }}
                          tickFormatter={formatoNumero}
                        />

                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(valor) => [
                            formatoNumero(valor),
                            "Tokens",
                          ]}
                        />

                        <Line
                          type="monotone"
                          dataKey="tokens"
                          stroke="#8cff00"
                          strokeWidth={3}
                          dot={{ fill: "#8cff00" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* VALIDACIÓN DE TOTALES */}
            <div
              className={`border p-4 text-sm ${
                coincide
                  ? "border-[#8cff00]/40 text-[#8cff00] bg-[#8cff00]/5"
                  : "border-yellow-500/40 text-yellow-300 bg-yellow-500/5"
              }`}
            >
              {coincide
                ? "✓ Los totales por usuario y servicio coinciden con el resumen general."
                : "Advertencia: los totales agrupados no coinciden con el resumen general."}
            </div>

            {/* TABLA POR USUARIO */}
            <div className="border border-[#29412f] bg-[#101914]">
              <div className="p-5 border-b border-[#29412f]">
                <h3 className="font-black">CONSUMO POR PORTADOR</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1b3020] text-[#8cff00] text-xs">
                    <tr>
                      <th className="text-left p-4">USUARIO</th>
                      <th className="text-right p-4">CONSULTAS</th>
                      <th className="text-right p-4">ENTRADA</th>
                      <th className="text-right p-4">SALIDA</th>
                      <th className="text-right p-4">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuarios.map((u) => (
                      <tr
                        key={u.usuario_id}
                        className="border-t border-[#29412f]"
                      >
                        <td className="p-4 font-semibold">{u.usuario}</td>
                        <td className="p-4 text-right">
                          {formatoNumero(u.consultas)}
                        </td>
                        <td className="p-4 text-right">
                          {formatoNumero(u.tokens_entrada)}
                        </td>
                        <td className="p-4 text-right">
                          {formatoNumero(u.tokens_salida)}
                        </td>
                        <td className="p-4 text-right text-[#8cff00] font-bold">
                          {formatoNumero(u.tokens_total)}
                        </td>
                      </tr>
                    ))}

                    {usuarios.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-gray-500 text-center"
                        >
                          No hay consultas para estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETALLE */}
            <div className="border border-[#29412f] bg-[#101914]">
              <div className="p-5 border-b border-[#29412f]">
                <h3 className="font-black">REGISTRO DETALLADO DE CONSUMO</h3>

                <p className="text-gray-400 text-xs mt-2">
                  {detalle.length} registros encontrados.
                </p>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#1b3020] text-[#8cff00] sticky top-0">
                    <tr>
                      <th className="text-left p-4">FECHA</th>
                      <th className="text-left p-4">USUARIO</th>
                      <th className="text-left p-4">SERVICIO</th>
                      <th className="text-right p-4">ENTRADA</th>
                      <th className="text-right p-4">SALIDA</th>
                      <th className="text-right p-4">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detalle.map((r, i) => (
                      <tr
                        key={`${r.usuario_id}-${r.servicio_id}-${r.fecha}-${i}`}
                        className="border-t border-[#29412f]"
                      >
                        <td className="p-4 whitespace-nowrap">
                          {formatoFecha(r.fecha)}
                        </td>
                        <td className="p-4">{r.usuario}</td>
                        <td className="p-4">{r.servicio}</td>
                        <td className="p-4 text-right">
                          {formatoNumero(r.tokens_entrada)}
                        </td>
                        <td className="p-4 text-right">
                          {formatoNumero(r.tokens_salida)}
                        </td>
                        <td className="p-4 text-right font-bold text-[#8cff00]">
                          {formatoNumero(r.tokens_total)}
                        </td>
                      </tr>
                    ))}

                    {detalle.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-gray-500"
                        >
                          No hay registros disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
