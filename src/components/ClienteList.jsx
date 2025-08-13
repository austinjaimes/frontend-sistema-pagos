import React, { useEffect, useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";
export default function ClienteList({ onSelectCliente }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No autorizado. Por favor inicia sesión.");

        const res = await fetch(`${API_BASE_URL}/clientes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.msg || "Error al cargar clientes");
        }

        const data = await res.json();
        setClientes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  if (loading) return <p>Cargando clientes...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (clientes.length === 0) return <p>No hay clientes aún.</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Clientes</h2>
      <input
        type="text"
        placeholder="Buscar clientes por nombre..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="border p-2 mb-4 w-full rounded"
      />
      <ul className="space-y-2 max-h-[400px] overflow-auto">
        {clientesFiltrados.length > 0 ? (
          clientesFiltrados.map((cliente) => (
            <li
              key={cliente._id}
              onClick={() => onSelectCliente(cliente)}
              className="cursor-pointer p-2 border rounded hover:bg-gray-100"
            >
              <div className="font-bold">{cliente.nombre}</div>
              <div>Teléfono: {cliente.telefono}</div>
              <div>Dirección: {cliente.direccion}</div>
            </li>
          ))
        ) : (
          <li>No se encontraron clientes.</li>
        )}
      </ul>
    </div>
  );
}
