import React, { useEffect, useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function ListaPrestamos({ clienteId }) {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    monto: "",
    interesMensual: "",
    fechaInicio: "",
    dias: "",
    cobradoHoy: false,
  });
  const [abonoCantidad, setAbonoCantidad] = useState({});

  // Obtener préstamos del cliente
  const obtenerPrestamos = async () => {
    if (!clienteId) {
      setPrestamos([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No autorizado. Por favor inicia sesión.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/prestamos/cliente/${clienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || err.error || "Error al cargar préstamos");
      }
      const data = await res.json();

      // Asegurarse de que interesMensual y montoRecuperado sean números, y pagoDiarioTotal venga del backend
      const dataConPagoFijo = data.map((p) => ({
        ...p,
        interesMensual: Number(p.interesMensual) || 0,
        montoRecuperado: Number(p.montoRecuperado) || 0,
        pagoDiarioTotal: p.pagoDiarioFijo ?? 0,
      }));

      setPrestamos(dataConPagoFijo);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerPrestamos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // Helpers de fecha y cálculo
  function soloFecha(fecha) {
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    return f;
  }

  const hoy = soloFecha(new Date());

  const prestamosActivos = prestamos.filter((p) => {
    const inicio = soloFecha(p.fechaInicio);
    const finPrestamo = new Date(inicio);
    finPrestamo.setDate(finPrestamo.getDate() + p.dias);
    return hoy < finPrestamo;
  });

  const prestamosTerminados = prestamos.filter((p) => {
    const inicio = soloFecha(p.fechaInicio);
    const finPrestamo = new Date(inicio);
    finPrestamo.setDate(finPrestamo.getDate() + p.dias);
    return hoy >= finPrestamo;
  });

  // Marcar cobrado hoy
  const handleCobradoHoyChange = async (prestamoId, valor) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No autorizado.");

      const prestamo = prestamos.find((p) => p._id === prestamoId);
      if (!prestamo) return;

      const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...prestamo, cobradoHoy: valor }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || err.error || "Error al actualizar préstamo");
      }

      setPrestamos((prev) =>
        prev.map((p) => (p._id === prestamoId ? { ...p, cobradoHoy: valor } : p))
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // Abonar (optimistic update + sync)
  const handleAbonar = async (prestamoId) => {
    const cantidad = parseFloat(abonoCantidad[prestamoId]);
    if (!cantidad || cantidad <= 0) {
      alert("Ingresa una cantidad válida para abonar.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No autorizado.");
      return;
    }

    const prevPrestamos = prestamos;

    setPrestamos((prev) =>
      prev.map((p) =>
        p._id === prestamoId
          ? {
              ...p,
              montoRecuperado: Math.min(p.montoRecuperado + cantidad, p.monto),
            }
          : p
      )
    );

    try {
      const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}/abonar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cantidad }),
      });

      const contentType = res.headers.get("content-type") || "";
      let resultado = null;
      if (contentType.includes("application/json")) {
        resultado = await res.json().catch(() => null);
      }

      if (!res.ok) {
        const mensaje = resultado?.msg || resultado?.error || res.statusText || "Error al hacer abono";
        throw new Error(mensaje);
      }

      if (resultado && resultado._id) {
        setPrestamos((prev) =>
          prev.map((p) =>
            p._id === resultado._id
              ? {
                  ...resultado,
                  interesMensual: Number(resultado.interesMensual) || 0,
                  montoRecuperado: Number(resultado.montoRecuperado) || 0,
                  pagoDiarioTotal: p.pagoDiarioTotal, // mantener pago fijo actual
                }
              : p
          )
        );
      } else {
        await obtenerPrestamos();
      }

      setAbonoCantidad((prev) => ({ ...prev, [prestamoId]: "" }));
    } catch (error) {
      setPrestamos(prevPrestamos);
      alert(error.message);
    }
  };

  // Edición / Guardado
  const iniciarEdicion = (prestamo) => {
    setEditandoId(prestamo._id);
    setFormData({
      monto: prestamo.monto.toString(),
      interesMensual: prestamo.interesMensual.toString(),
      fechaInicio: prestamo.fechaInicio.slice(0, 10),
      dias: prestamo.dias.toString(),
      cobradoHoy: prestamo.cobradoHoy || false,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormData({
      monto: "",
      interesMensual: "",
      fechaInicio: "",
      dias: "",
      cobradoHoy: false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const guardarEdicion = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No autorizado.");

      const montoNum = parseFloat(formData.monto);
      const interesNum = parseFloat(formData.interesMensual);
      const diasNum = parseInt(formData.dias);

      if (isNaN(montoNum) || montoNum <= 0) {
        alert("El monto debe ser un número positivo");
        return;
      }
      if (isNaN(interesNum) || interesNum < 0) {
        alert("El interés mensual debe ser un número positivo o cero");
        return;
      }
      if (isNaN(diasNum) || diasNum <= 0) {
        alert("Los días deben ser un número entero positivo");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/prestamos/${editandoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monto: montoNum,
          interesMensual: interesNum,
          fechaInicio: formData.fechaInicio,
          dias: diasNum,
          cobradoHoy: formData.cobradoHoy,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || err.error || "Error al actualizar préstamo");
      }

      const prestamoActualizado = await res.json();

      // Aquí usar directamente pagoDiarioFijo sin recalcular
      setPrestamos((prev) =>
        prev.map((p) =>
          p._id === editandoId
            ? {
                ...prestamoActualizado,
                interesMensual: Number(prestamoActualizado.interesMensual) || 0,
                pagoDiarioTotal: prestamoActualizado.pagoDiarioFijo ?? 0,
              }
            : p
        )
      );

      cancelarEdicion();
    } catch (error) {
      alert(error.message);
    }
  };

  // Eliminar
  const eliminarPrestamo = async (prestamoId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este préstamo?")) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No autorizado.");

      const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || err.error || "Error al eliminar préstamo");
      }

      setPrestamos((prev) => prev.filter((p) => p._id !== prestamoId));
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <p>Cargando préstamos...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Préstamos Activos</h2>
      {prestamosActivos.length === 0 ? (
        <p>No hay préstamos activos para este cliente.</p>
      ) : (
        <div className="overflow-auto max-h-[400px] border rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Interés mensual</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha inicio</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Días</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Pago diario total</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero recuperado</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero restante</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Abonar</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cobrado hoy</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prestamosActivos.map((p) => {
                const montoRecuperado = p.montoRecuperado || 0;
                const dineroRestante = Math.max(0, p.monto - montoRecuperado);

                return (
                  <tr key={p._id} className="bg-white">
                    {editandoId === p._id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            className="border p-1 rounded w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.001"
                            name="interesMensual"
                            value={formData.interesMensual}
                            onChange={handleChange}
                            className="border p-1 rounded w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            name="fechaInicio"
                            value={formData.fechaInicio}
                            onChange={handleChange}
                            className="border p-1 rounded w-32"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            name="dias"
                            value={formData.dias}
                            onChange={handleChange}
                            className="border p-1 rounded w-16"
                          />
                        </td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">-</td>
                        <td className="px-4 py-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="cobradoHoy"
                              checked={formData.cobradoHoy}
                              onChange={handleChange}
                            />
                          </label>
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={guardarEdicion}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                          >
                            Cancelar
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2">${(p.monto ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">{p.interesMensual ?? 0}%</td>
                        <td className="px-4 py-2">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{p.dias ?? 0}</td>
                        <td className="px-4 py-2">${(p.pagoDiarioTotal ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">${(montoRecuperado ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2">${(dineroRestante ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2 flex gap-1 items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={dineroRestante}
                            placeholder="Cantidad"
                            value={abonoCantidad[p._id] || ""}
                            onChange={(e) =>
                              setAbonoCantidad((prev) => ({
                                ...prev,
                                [p._id]: e.target.value,
                              }))
                            }
                            className="border p-1 rounded w-24"
                          />
                          <button
                            onClick={() => handleAbonar(p._id)}
                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            disabled={dineroRestante <= 0}
                          >
                            Abonar
                          </button>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={p.cobradoHoy || false}
                            onChange={(e) => handleCobradoHoyChange(p._id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={() => iniciarEdicion(p)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarPrestamo(p._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-xl font-semibold mt-8 mb-3">Préstamos Terminados</h2>
      {prestamosTerminados.length === 0 ? (
        <p>No hay préstamos terminados para este cliente.</p>
      ) : (
        <div className="overflow-auto max-h-[300px] border rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Interés mensual</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha inicio</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Días</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Pago diario total</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero recuperado</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero restante</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prestamosTerminados.map((p) => {
                const montoRecuperado = p.montoRecuperado || 0;
                const dineroRestante = Math.max(0, p.monto - montoRecuperado);

                return (
                  <tr key={p._id} className="bg-white">
                    <td className="px-4 py-2">${(p.monto ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">{p.interesMensual ?? 0}%</td>
                    <td className="px-4 py-2">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{p.dias ?? 0}</td>
                    <td className="px-4 py-2">${(p.pagoDiarioTotal ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">${(montoRecuperado ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">${(dineroRestante ?? 0).toFixed(2)}</td>
                    <button
                            onClick={() => eliminarPrestamo(p._id)}
                            className="bg-red-600 text-white px-4 py-1 mt-1 rounded hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
