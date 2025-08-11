import React, { useState, useEffect } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function ClienteDetalle({ cliente, onClienteActualizado, onClienteEliminado }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(cliente?.nombre || "");
  const [telefono, setTelefono] = useState(cliente?.telefono || "");
  const [direccion, setDireccion] = useState(cliente?.direccion || "");
  const [loading, setLoading] = useState(false);

  // Actualizar los campos cuando cambie el cliente
  useEffect(() => {
    setNombre(cliente?.nombre || "");
    setTelefono(cliente?.telefono || "");
    setDireccion(cliente?.direccion || "");
    setEditando(false);
  }, [cliente]);

  if (!cliente) return <p className="p-4">Selecciona un cliente para ver detalles</p>;

  const token = localStorage.getItem("token");

  const handleActualizar = async () => {
    setLoading(true);
    try {
      if (!token) throw new Error("No autorizado. Por favor inicia sesión.");

      const res = await fetch(`${API_BASE_URL}/clientes/${cliente._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, telefono, direccion }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || "Error al actualizar cliente");
      }
      const clienteActualizado = await res.json();
      onClienteActualizado(clienteActualizado);
      setEditando(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm("¿Seguro que quieres eliminar este cliente?")) return;

    setLoading(true);
    try {
      if (!token) throw new Error("No autorizado. Por favor inicia sesión.");

      const res = await fetch(`${API_BASE_URL}/clientes/${cliente._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || "Error al eliminar cliente");
      }
      onClienteEliminado(cliente._id);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow mb-6">
      <h2 className="text-xl font-bold mb-4">Detalles de {cliente.nombre}</h2>

      {editando ? (
        <>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border p-2 mb-2 w-full rounded"
          />
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="border p-2 mb-2 w-full rounded"
          />
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="border p-2 mb-4 w-full rounded"
          />
          <button
            onClick={handleActualizar}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded mr-2 hover:bg-blue-700"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => setEditando(false)}
            disabled={loading}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <p><strong>Nombre:</strong> {nombre}</p>
          <p><strong>Teléfono:</strong> {telefono}</p>
          <p><strong>Dirección:</strong> {direccion}</p>

          <div className="mt-4">
            <button
              onClick={() => setEditando(true)}
              className="bg-yellow-500 text-white px-4 py-2 rounded mr-2 hover:bg-yellow-600"
            >
              Editar
            </button>
            <button
              onClick={handleEliminar}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
