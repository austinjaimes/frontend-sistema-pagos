import React, { useEffect, useState } from "react";

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No autorizado. Por favor inicia sesión.");
      setLoading(false);
      return;
    }

    fetch("http://localhost:5000/api/clientes", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar clientes");
        return res.json();
      })
      .then((data) => {
        setClientes(data);
      })
      .catch((error) => alert(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando clientes...</p>;

  return (
    <div>
      <h2>Lista de Clientes</h2>
      {clientes.length === 0 ? (
        <p>No hay clientes aún.</p>
      ) : (
        <ul>
          {clientes.map((cliente) => (
            <li key={cliente._id}>
              {cliente.nombre} - {cliente.telefono} - {cliente.direccion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
