import React, { useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function NuevoPrestamo({ clienteId, onPrestamoCreado }) {
  const [monto, setMonto] = useState("");
  const [interesMensual, setInteresMensual] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [dias, setDias] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No autorizado. Por favor inicia sesión.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/prestamos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clienteId,
          monto: parseFloat(monto),
          interesMensual: parseFloat(interesMensual),
          fechaInicio,
          dias: parseInt(dias),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || "Error al crear préstamo");
      }

      const prestamoNuevo = await res.json();
      onPrestamoCreado(prestamoNuevo);

      // Limpiar campos
      setMonto("");
      setInteresMensual("");
      setFechaInicio("");
      setDias("");
    } catch (error) {
      alert(error.message);
    }
  }

  if (!clienteId) return null; // No mostrar si no hay cliente seleccionado

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded mt-4">
      <h3 className="font-bold mb-2">Nuevo Préstamo para Cliente</h3>
      <input
        type="number"
        step="0.01"
        placeholder="Monto"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        required
        className="border p-2 w-full mb-2"
      />
      <input
        type="number"
        step="0.01"
        placeholder="Interés mensual (ej. 1.5)"
        value={interesMensual}
        onChange={(e) => setInteresMensual(e.target.value)}
        required
        className="border p-2 w-full mb-2"
      />
      <input
        type="date"
        placeholder="Fecha de inicio"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        required
        className="border p-2 w-full mb-2"
      />
      <input
        type="number"
        placeholder="Días"
        value={dias}
        onChange={(e) => setDias(e.target.value)}
        required
        className="border p-2 w-full mb-2"
      />
      <button
        type="submit"
        className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Agregar Préstamo
      </button>
    </form>
  );
}
