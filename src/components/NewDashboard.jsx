import React, { useEffect, useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function Dashboard() {
  const [numClientes, setNumClientes] = useState(0);
  const [prestamosActivos, setPrestamosActivos] = useState(0);
  const [dineroTotal, setDineroTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No autorizado. Por favor inicia sesión.");

        // Obtener clientes
        const resClientes = await fetch(`${API_BASE_URL}/clientes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resClientes.ok) throw new Error("Error al cargar clientes");
        const clientes = await resClientes.json();
        setNumClientes(clientes.length);

        // Para obtener préstamos activos y dinero total, obtenemos todos los préstamos (o por cliente)
        // Pero aquí haremos fetch de todos los préstamos (si tu API lo permite) o iteramos por clientes

        let totalPrestamos = 0;
        let activosCount = 0;

        // Opción 1: si tienes endpoint para todos los préstamos (mejor)
        const resPrestamos = await fetch(`${API_BASE_URL}/prestamos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resPrestamos.ok) throw new Error("Error al cargar préstamos");
        const prestamos = await resPrestamos.json();

        const hoy = new Date();
        prestamos.forEach((p) => {
          const inicio = new Date(p.fechaInicio);
          const finPrestamo = new Date(inicio);
          finPrestamo.setDate(finPrestamo.getDate() + p.dias);
          if (hoy < finPrestamo) {
            activosCount++;
            totalPrestamos += p.monto;
          }
        });

        setPrestamosActivos(activosCount);
        setDineroTotal(totalPrestamos);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <p>Cargando dashboard...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-white rounded shadow-md max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
        <div className="p-4 border rounded bg-blue-100">
          <h2 className="text-lg font-semibold">Préstamos activos</h2>
          <p className="text-3xl font-bold">{prestamosActivos}</p>
        </div>
        <div className="p-4 border rounded bg-green-100">
          <h2 className="text-lg font-semibold">Dinero total prestado</h2>
          <p className="text-3xl font-bold">${dineroTotal.toFixed(2)}</p>
        </div>
        <div className="p-4 border rounded bg-yellow-100">
          <h2 className="text-lg font-semibold">Número de clientes</h2>
          <p className="text-3xl font-bold">{numClientes}</p>
        </div>
      </div>
    </div>
  );
}
