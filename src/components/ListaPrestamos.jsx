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

  const [historialCobros, setHistorialCobros] = useState({});
  const [cargandoHistorial, setCargandoHistorial] = useState({});
  const [prestamoHistorialAbierto, setPrestamoHistorialAbierto] = useState(null);

  const [mostrarHistorialTerminados, setMostrarHistorialTerminados] = useState({});

  // Obtener préstamos desde backend
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

      // Normalizar números y campos
      const dataProcesada = data.map((p) => ({
        ...p,
        interesMensual: Number(p.interesMensual) || 0,
        montoRecuperado: Number(p.montoRecuperado) || 0,
        montoFinal: Number(p.montoFinal) || p.monto,
        pagoDiarioTotal: p.pagoDiarioFijo ?? 0,
        historialPagos: Array.isArray(p.historialPagos)
          ? p.historialPagos
          : Array(p.diasTotales ?? p.dias).fill(false),
      }));

      setPrestamos(dataProcesada);
      // También actualizar historialCobros para el préstamo abierto actual (si hay)
      if (prestamoHistorialAbierto) {
        const prestamoAbierto = dataProcesada.find((p) => p._id === prestamoHistorialAbierto);
        if (prestamoAbierto) {
          setHistorialCobros((prev) => ({
            ...prev,
            [prestamoHistorialAbierto]: prestamoAbierto.historialPagos,
          }));
        }
      }
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

  // Función para normalizar fechas a inicio de día
  function soloFecha(fecha) {
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    return f;
  }

  const hoy = soloFecha(new Date());

  // Separar préstamos activos y terminados según fecha
  const prestamosActivos = prestamos.filter((p) => {
    const inicio = soloFecha(p.fechaInicio);
    const finPrestamo = new Date(inicio);
    finPrestamo.setDate(finPrestamo.getDate() + (p.diasTotales ?? p.dias));
    return hoy < finPrestamo;
  });

  const prestamosTerminados = prestamos.filter((p) => {
    const inicio = soloFecha(p.fechaInicio);
    const finPrestamo = new Date(inicio);
    finPrestamo.setDate(finPrestamo.getDate() + (p.diasTotales ?? p.dias));
    return hoy >= finPrestamo;
  });

  // Cambiar estado cobradoHoy en préstamo
  // const handleCobradoHoyChange = async (prestamoId, valor) => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     if (!token) throw new Error("No autorizado.");

  //     const prestamo = prestamos.find((p) => p._id === prestamoId);
  //     if (!prestamo) return;

  //     const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify({ ...prestamo, cobradoHoy: valor }),
  //     });

  //     if (!res.ok) {
  //       const err = await res.json().catch(() => ({}));
  //       throw new Error(err.msg || err.error || "Error al actualizar préstamo");
  //     }

  //     setPrestamos((prev) =>
  //       prev.map((p) => (p._id === prestamoId ? { ...p, cobradoHoy: valor } : p))
  //     );
  //   } catch (error) {
  //     alert(error.message);
  //   }
  // };

  // Abonar una cantidad al préstamo
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
              montoRecuperado: Math.min(p.montoRecuperado + cantidad, p.montoFinal ?? p.monto),
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
                  montoFinal: Number(resultado.montoFinal) || resultado.monto,
                  pagoDiarioTotal: p.pagoDiarioTotal,
                  historialPagos: resultado.historialPagos || p.historialPagos,
                }
              : p
          )
        );

        // Si ya se pagó todo, recargar lista
        const prestamoActualizado = resultado;
        if (
          Number(prestamoActualizado.montoRecuperado) >=
          (Number(prestamoActualizado.montoFinal) || Number(prestamoActualizado.monto))
        ) {
          await obtenerPrestamos();
        }
      } else {
        await obtenerPrestamos();
      }
      setAbonoCantidad((prev) => ({ ...prev, [prestamoId]: "" }));
    } catch (error) {
      setPrestamos(prevPrestamos);
      alert(error.message);
    }
  };

  // Iniciar edición de un préstamo
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

  // Cancelar edición
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

  // Manejar cambios en formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Guardar edición de préstamo
  const guardarEdicion = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No autorizado.");

    // Convertir a números
    const montoNum = parseFloat(formData.monto);
    const interesNum = parseFloat(formData.interesMensual);
    const diasNum = parseInt(formData.dias);

    // Validaciones estrictas
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

    // Preparar payload solo con campos válidos
    const payload = {
      monto: montoNum,
      interesMensual: interesNum,
      fechaInicio: formData.fechaInicio,
    };

    // Solo enviar dias si cambió
    if (diasNum !== prestamos.find(p => p._id === editandoId)?.dias) {
      payload.dias = diasNum;
    }

    // CobradoHoy opcional, solo si existe en formData
    if (typeof formData.cobradoHoy === "boolean") {
      payload.cobradoHoy = formData.cobradoHoy;
    }

    const res = await fetch(`${API_BASE_URL}/prestamos/${editandoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || err.error || "Error al actualizar préstamo");
    }

    const prestamoActualizado = await res.json();

    setPrestamos((prev) =>
      prev.map((p) =>
        p._id === editandoId
          ? {
              ...p,
              ...prestamoActualizado,
              interesMensual: Number(prestamoActualizado.interesMensual) || 0,
              pagoDiarioTotal: prestamoActualizado.pagoDiarioFijo ?? p.pagoDiarioTotal,
              montoFinal: prestamoActualizado.montoFinal || p.montoFinal || prestamoActualizado.monto,
              historialPagos: prestamoActualizado.historialPagos || p.historialPagos,
            }
          : p
      )
    );

    cancelarEdicion();
  } catch (error) {
    alert(error.message);
  }
};


  // Eliminar préstamo
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
      // Cerrar historial si estaba abierto para este préstamo
      if (prestamoHistorialAbierto === prestamoId) setPrestamoHistorialAbierto(null);
      setMostrarHistorialTerminados((prev) => {
        const copia = { ...prev };
        delete copia[prestamoId];
        return copia;
      });
      setHistorialCobros((prev) => {
        const copia = { ...prev };
        delete copia[prestamoId];
        return copia;
      });
    } catch (error) {
      alert(error.message);
    }
  };

  // Cargar historial de cobros para préstamo activo
  const cargarHistorialCobros = async (prestamoId) => {
    if (!clienteId) return;
    setCargandoHistorial((prev) => ({ ...prev, [prestamoId]: true }));

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No autorizado. Por favor inicia sesión.");
      setCargandoHistorial((prev) => ({ ...prev, [prestamoId]: false }));
      return;
    }

    try {
      // Obtener préstamo individual para cargar historial
      const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || err.error || "Error al cargar préstamo");
      }
      const prestamo = await res.json();

      setHistorialCobros((prev) => ({
        ...prev,
        [prestamoId]: prestamo.historialPagos || [],
      }));
      setPrestamoHistorialAbierto(prestamoId);
    } catch (error) {
      alert(error.message);
    } finally {
      setCargandoHistorial((prev) => ({ ...prev, [prestamoId]: false }));
    }
  };

  // Marcar o desmarcar pago de día específico
  // const togglePagoDia = async (prestamoId, diaIndex) => {
  //   const token = localStorage.getItem("token");
  //   if (!token) {
  //     alert("No autorizado.");
  //     return;
  //   }

  //   const pagadoActual = historialCobros[prestamoId]?.[diaIndex] || false;

  //   try {
  //     // Cambiar estado pago día en backend
  //     const res = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}/pago/${diaIndex + 1}`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify({ pagado: !pagadoActual }),
  //     });

  //     if (!res.ok) {
  //       const err = await res.json().catch(() => ({}));
  //       throw new Error(err.msg || err.error || "Error al actualizar pago diario");
  //     }

  //     // Obtener el préstamo actualizado para tener historial actualizado
  //     const resPrestamo = await fetch(`${API_BASE_URL}/prestamos/${prestamoId}`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     if (!resPrestamo.ok) {
  //       throw new Error("No se pudo actualizar el historial después del cambio");
  //     }
  //     const prestamoActualizado = await resPrestamo.json();

  //     // Actualizar historial local con datos del backend
  //     setHistorialCobros((prev) => ({
  //       ...prev,
  //       [prestamoId]: prestamoActualizado.historialPagos || [],
  //     }));

  //     // Actualizar préstamos para reflejar monto recuperado actualizado
  //     setPrestamos((prev) =>
  //       prev.map((p) =>
  //         p._id === prestamoId
  //           ? {
  //               ...p,
  //               montoRecuperado: prestamoActualizado.montoRecuperado || p.montoRecuperado,
  //               historialPagos: prestamoActualizado.historialPagos || p.historialPagos,
  //             }
  //           : p
  //       )
  //     );
  //   } catch (error) {
  //     alert(error.message);
  //   }
  // };

  // Generar array de fechas para mostrar en historial (del préstamo)
  // const generarFechasHistorial = (fechaInicio, plazo) => {
  //   const fechas = [];
  //   const inicio = soloFecha(new Date(fechaInicio));
  //   for (let i = 0; i < plazo; i++) {
  //     const fecha = new Date(inicio);
  //     fecha.setDate(fecha.getDate() + i);
  //     fechas.push(fecha.toLocaleDateString());
  //   }
  //   return fechas;
  // };

  // Renderizado principal
// Renderizado principal
return (
  <div className="overflow-x-auto max-w-full p-4">
    <h2 className="text-xl font-semibold mb-4">Préstamos Activos</h2>
    {loading ? (
      <p>Cargando...</p>
    ) : prestamosActivos.length === 0 ? (
      <p>No hay préstamos activos para este cliente.</p>
    ) : (
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto Final</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Interés Mensual</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha Inicio</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Plazo (días)</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Pago Diario</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto Recuperado</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero Restante</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              Pago día {new Date().toLocaleDateString()}
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Editar</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Eliminar</th>
          </tr>
        </thead>
        <tbody>
          {prestamosActivos.map((p) => {
            const montoRecuperado = p.montoRecuperado || 0;
            const montoInicial = p.monto ?? 0;
            const montoFinal = p.montoFinal ?? montoInicial;

            const plazo = p.diasTotales ?? p.dias;
            // const pagosHechos = p.historialPagos?.filter(Boolean).length ?? 0;
            // const diasRestantes = Math.max(0, plazo - pagosHechos);
            const dineroRestante = Math.max(0, montoFinal - montoRecuperado);

            const isEditing = editandoId === p._id;

            return (
              <React.Fragment key={p._id}>
                <tr className="bg-white">
                  <td className="px-4 py-2">${montoInicial.toFixed(2)}</td>
                  <td className="px-4 py-2">${montoFinal.toFixed(2)}</td>
                  <td className="px-4 py-2">{p.interesMensual.toFixed(3)}%</td>
                  <td className="px-4 py-2">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{plazo}</td>
                  <td className="px-4 py-2">${p.pagoDiarioTotal?.toFixed(2) ?? "-"}</td>
                  <td className="px-4 py-2">${montoRecuperado.toFixed(2)}</td>
                  <td className="px-4 py-2">${dineroRestante.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cantidad a abonar"
                        value={abonoCantidad[p._id] || ""}
                        onChange={(e) =>
                          setAbonoCantidad((prev) => ({
                            ...prev,
                            [p._id]: e.target.value,
                          }))
                        }
                        className="border rounded p-1 w-full"
                      />
                      <button
                        onClick={() => handleAbonar(p._id)}
                        className="bg-green-600 text-white px-2 py-1 rounded mt-1"
                      >
                        Registrar Pago
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={guardarEdicion}
                          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="bg-gray-300 text-black px-2 py-1 rounded"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => iniciarEdicion(p)}
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => eliminarPrestamo(p._id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>

                {isEditing && (
                  <tr className="bg-gray-100">
                    <td colSpan={12} className="p-4">
                      <div className="grid grid-cols-6 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Monto</label>
                          <input
                            type="number"
                            step="0.01"
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            className="border rounded p-1 w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Interés Mensual (%)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            name="interesMensual"
                            value={formData.interesMensual}
                            onChange={handleChange}
                            className="border rounded p-1 w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                          <input
                            type="date"
                            name="fechaInicio"
                            value={formData.fechaInicio}
                            onChange={handleChange}
                            className="border rounded p-1 w-full"
                          />
                        </div>

                        {/* <div>
                          <label className="block text-sm font-medium text-gray-700">Plazo (días)</label>
                          <input
                            type="number"
                            name="dias"
                            value={formData.dias}
                            onChange={handleChange}
                            className="border rounded p-1 w-full"
                            min={1}
                          />
                        </div> */}

                        {/* <div className="flex items-center mt-6">
                          <input
                            type="checkbox"
                            name="cobradoHoy"
                            checked={formData.cobradoHoy}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          <label className="text-sm font-medium text-gray-700">Cobrado hoy</label>
                        </div> */}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Mostrar historial de pagos */}
                {prestamoHistorialAbierto === p._id && (
                  <tr className="bg-gray-50">
                    <td colSpan={12} className="p-4">
                      <div className="bg-gray-100 p-3 rounded border overflow-auto">
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
                        >
                          {(historialCobros[p._id] ?? Array(plazo).fill(null)).map((item, i) => {
                            const fechaDia = new Date(p.fechaInicio);
                            fechaDia.setDate(fechaDia.getDate() + i);
                            const fechaTexto = fechaDia.toLocaleDateString();

                            // item debería ser { pagado: boolean, monto: number } o null
                            const pagado = item?.pagado ?? false;
                            const montoAbonado = item?.monto ?? null;

                            return (
                              <div
                                key={i}
                                className="flex flex-col items-center justify-center border bg-white p-2"
                              >
                                <div className="text-xs font-medium text-gray-700 mb-1">{fechaTexto}</div>
                                <input
                                  type="checkbox"
                                  checked={pagado}
                                  disabled
                                  aria-label={`Pago día ${i + 1} (${fechaTexto})`}
                                />
                                {pagado && montoAbonado != null && (
                                  <div className="text-xs text-green-700 mt-1">${montoAbonado.toFixed(2)}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 text-right">
                          <button
                            onClick={() => setPrestamoHistorialAbierto(null)}
                            className="text-blue-700 underline"
                          >
                            Cerrar historial
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Botón para abrir/cerrar historial si no está abierto */}
                {prestamoHistorialAbierto !== p._id && (
                  <tr className="bg-gray-50">
                    <td colSpan={12} className="p-4 text-center">
                      <button
                        onClick={() => cargarHistorialCobros(p._id)}
                        disabled={cargandoHistorial[p._id]}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        {cargandoHistorial[p._id] ? "Cargando historial..." : "Ver historial de pagos"}
                      </button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    )}

    <h2 className="text-xl font-semibold mt-10 mb-4">Préstamos Terminados</h2>
    {prestamosTerminados.length === 0 ? (
      <p>No hay préstamos terminados para este cliente.</p>
    ) : (
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto Final</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Interés Mensual</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha Inicio</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Plazo</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Pago Diario</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Monto Recuperado</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dinero Restante</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Historial de Pagos</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Eliminar</th>
          </tr>
        </thead>
        <tbody>
          {prestamosTerminados.map((p) => {
            const montoRecuperado = p.montoRecuperado || 0;
            const montoInicial = p.monto ?? 0;
            const montoFinal = p.montoFinal ?? montoInicial;

            const plazo = p.diasTotales ?? p.dias;
            const dineroRestante = Math.max(0, montoFinal - montoRecuperado);

            const mostrarHistorial = mostrarHistorialTerminados[p._id] || false;

            return (
              <React.Fragment key={p._id}>
                <tr className="bg-white">
                  <td className="px-4 py-2">${montoInicial.toFixed(2)}</td>
                  <td className="px-4 py-2">${montoFinal.toFixed(2)}</td>
                  <td className="px-4 py-2">{p.interesMensual.toFixed(3)}%</td>
                  <td className="px-4 py-2">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{plazo}</td>
                  <td className="px-4 py-2">${p.pagoDiarioTotal?.toFixed(2) ?? "-"}</td>
                  <td className="px-4 py-2">${montoRecuperado.toFixed(2)}</td>
                  <td className="px-4 py-2">${dineroRestante.toFixed(2)}</td>

                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        setMostrarHistorialTerminados((prev) => ({
                          ...prev,
                          [p._id]: !prev[p._id],
                        }))
                      }
                      className="bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      {mostrarHistorial ? "Ocultar Historial" : "Ver Historial"}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => eliminarPrestamo(p._id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>

                {mostrarHistorial && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="p-4">
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
                      >
                        {(p.historialPagos ?? Array(plazo).fill(false)).map((pagado, i) => {
                          const fechaDia = new Date(p.fechaInicio);
                          fechaDia.setDate(fechaDia.getDate() + i);
                          const fechaTexto = fechaDia.toLocaleDateString();
                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center justify-center border bg-white p-2"
                            >
                              <div className="text-xs font-medium text-gray-700 mb-1">{fechaTexto}</div>
                              <input type="checkbox" checked={!!pagado} disabled />
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
);


}
