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

  useEffect(() => {
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
    fetch(`${API_BASE_URL}/prestamos/cliente/${clienteId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar préstamos");
        return res.json();
      })
      .then((data) => {
        const dataNormalizada = data.map((p) => ({
          ...p,
          interesMensual: Number(p.interesMensual) || 0,
        }));
        setPrestamos(dataNormalizada);
      })
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  }, [clienteId]);

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

      if (!res.ok) throw new Error("Error al actualizar préstamo");

      setPrestamos((prev) =>
        prev.map((p) => (p._id === prestamoId ? { ...p, cobradoHoy: valor } : p))
      );
    } catch (error) {
      alert(error.message);
    }
  };

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

      if (!res.ok) throw new Error("Error al actualizar préstamo");

      const prestamoActualizado = await res.json();

      setPrestamos((prev) =>
        prev.map((p) => (p._id === editandoId ? prestamoActualizado : p))
      );

      cancelarEdicion();
    } catch (error) {
      alert(error.message);
    }
  };

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

      if (!res.ok && res.status !== 404) throw new Error("Error al eliminar préstamo");

      setPrestamos((prev) => prev.filter((p) => p._id !== prestamoId));
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <p>Cargando préstamos...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-3">Préstamos Activos</h2>
        {prestamosActivos.length === 0 ? (
          <p>No hay préstamos activos para este cliente.</p>
        ) : (
          <ul className="space-y-4 max-h-[300px] overflow-auto">
            {prestamosActivos.map((p) => {
              const interesMensualValido = isNaN(p.interesMensual) ? 0 : p.interesMensual;
              const interesDiario = interesMensualValido / 30;
              const interesDiarioMonto = p.monto * interesDiario;

              return (
                <li
                  key={p._id}
                  className="border p-3 rounded bg-gray-50 flex flex-col gap-2"
                >
                  {editandoId === p._id ? (
                    <>    
                      <input
                        type="number"
                        step="0.01"
                        name="monto"
                        value={formData.monto}
                        onChange={handleChange}
                        className="border p-1 rounded w-full"
                      />
                      <input
                        type="number"
                        step="0.001"
                        name="interesMensual"
                        value={formData.interesMensual}
                        onChange={handleChange}
                        className="border p-1 rounded w-full"
                      />
                      <input
                        type="date"
                        name="fechaInicio"
                        value={formData.fechaInicio}
                        onChange={handleChange}
                        className="border p-1 rounded w-full"
                      />
                      <input
                        type="number"
                        name="dias"
                        value={formData.dias}
                        onChange={handleChange}
                        className="border p-1 rounded w-full"
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="cobradoHoy"
                          checked={formData.cobradoHoy}
                          onChange={handleChange}
                        />
                        Cobrado hoy
                      </label>
                      <div className="flex gap-2">
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
                      </div>
                    </>
                  ) : (
                    <>
                      <div>Monto: ${p.monto.toFixed(2)}</div>
                      <div>Interés mensual: {p.interesMensual}%</div>
                      <div>Fecha inicio: {new Date(p.fechaInicio).toLocaleDateString()}</div>
                      <div>Días: {p.dias}</div>
                      <div>
                        Pago diario total: ${(p.monto / p.dias + interesDiarioMonto).toFixed(2)}
                      </div>
                      <div>Cobrado hoy: {p.cobradoHoy ? "Sí" : "No"}</div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.cobradoHoy || false}
                          onChange={(e) => handleCobradoHoyChange(p._id, e.target.checked)}
                        />
                        Marcar como cobrado hoy
                      </label>
                      <div className="flex gap-2 mt-2">
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
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-semibold mb-3">Historial de Préstamos</h2>
        {prestamosTerminados.length === 0 ? (
          <p>No hay historial de préstamos para este cliente.</p>
        ) : (
          <ul className="space-y-4 max-h-[300px] overflow-auto">
            {prestamosTerminados.map((p) => (
              <li
                key={p._id}
                className="border p-3 rounded bg-gray-100 flex flex-col gap-2"
              >
                <div>Monto: ${p.monto.toFixed(2)}</div>
                <div>Interés mensual: {p.interesMensual}%</div>
                <div>Fecha inicio: {new Date(p.fechaInicio).toLocaleDateString()}</div>
                <div>Días: {p.dias}</div>
                <div>
                  Pago diario total: $
                  {(p.monto / p.dias + (p.interesMensual / 30) * p.monto).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
