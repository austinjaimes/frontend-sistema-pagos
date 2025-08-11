import React, { useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function NuevoCliente({ onClienteCreado }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No autorizado. Por favor inicia sesión.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, telefono, direccion }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || "Error al crear cliente");
      }

      await res.json();
      onClienteCreado();

      setNombre("");
      setTelefono("");
      setDireccion("");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white rounded shadow-md max-w-md mx-auto"
    >
      <h3 className="text-xl font-bold mb-4">Nuevo Cliente</h3>
      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="border border-gray-300 rounded p-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        required
        className="border border-gray-300 rounded p-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="Dirección"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        className="border border-gray-300 rounded p-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Agregar Cliente
      </button>
    </form>
  );
}
