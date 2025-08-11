import React, { useEffect, useState } from "react";

export default function ListaPrestamos() {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No autorizado. Por favor inicia sesión.");
      setLoading(false);
      return;
    }

    fetch("http://localhost:5000/api/prestamos", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar préstamos");
        return res.json();
      })
      .then((data) => {
        setPrestamos(data);
      })
      .catch((error) => alert(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando préstamos...</p>;

  return (
    <div>
      <h2>Lista de Préstamos</h2>
      {prestamos.length === 0 ? (
        <p>No hay préstamos aún.</p>
      ) : (
        <ul>
          {prestamos.map((p) => (
            <li key={p._id}>
              Cliente: {p.cliente?.nombre || "Desconocido"} - Monto: {p.monto} - Interés diario: {p.interesDiario ?? "N/A"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
