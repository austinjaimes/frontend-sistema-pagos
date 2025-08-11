import React, { useState, useEffect } from "react";
import NuevoCliente from "./NuevoCliente";
import ClienteList from "./ClienteList";
import ClienteDetalle from "./ClienteDetalle";
import NuevoPrestamo from "./NuevoPrestamo";
import ListaPrestamos from "./ListaPrestamos";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

function Navbar({ currentPage, onChangePage, onLogout }) {
  return (
    <nav className="bg-gray-800 p-4 flex gap-6 justify-center items-center">
      {["Dashboard", "Nuevo Cliente", "Lista Clientes"].map((page) => (
        <button
          key={page}
          onClick={() => onChangePage(page)}
          className={`text-white px-3 py-2 rounded ${
            currentPage === page ? "bg-blue-600" : "hover:bg-blue-500"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={onLogout}
        className="ml-auto bg-red-600 px-3 py-2 rounded text-white hover:bg-red-700"
      >
        Logout
      </button>
    </nav>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [pagina, setPagina] = useState("Dashboard");
  const [numClientes, setNumClientes] = useState(0);
  const [prestamosActivos, setPrestamosActivos] = useState(0);
  const [dineroTotal, setDineroTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado para cliente seleccionado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Función para obtener todos los datos necesarios para el dashboard
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (!token) throw new Error("No autorizado. Por favor inicia sesión.");

      // Obtener clientes
      const resClientes = await fetch(`${API_BASE_URL}/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resClientes.ok) throw new Error("Error al cargar clientes");
      const clientes = await resClientes.json();
      setNumClientes(clientes.length);

      let activosCount = 0;
      let totalPrestamos = 0;

      // Calcular préstamos activos y total
      for (const cliente of clientes) {
        const resPrestamos = await fetch(`${API_BASE_URL}/prestamos/cliente/${cliente._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resPrestamos.ok) continue;
        const prestamosCliente = await resPrestamos.json();
        const hoy = new Date();

        prestamosCliente.forEach((p) => {
          const inicio = new Date(p.fechaInicio);
          const finPrestamo = new Date(inicio);
          finPrestamo.setDate(finPrestamo.getDate() + p.dias);
          if (hoy < finPrestamo) {
            activosCount++;
            totalPrestamos += p.monto;
          }
        });
      }

      setPrestamosActivos(activosCount);
      setDineroTotal(totalPrestamos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Actualiza datos después de crear o actualizar clientes o préstamos
  const onPrestamoCreado = () => {
    alert("Préstamo creado");
    fetchData();
  };

  const onClienteCreado = () => {
    alert("Cliente creado");
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        currentPage={pagina}
        onChangePage={(page) => {
          setPagina(page);
          setClienteSeleccionado(null);
        }}
        onLogout={onLogout}
      />

      <main className="p-6 max-w-5xl mx-auto">
        {loading && <p>Cargando datos...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && pagina === "Dashboard" && (
          <div className="p-6 bg-white rounded shadow-md max-w-2xl mx-auto">
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
        )}

        {!loading && !error && pagina === "Nuevo Cliente" && (
          <NuevoCliente onClienteCreado={onClienteCreado} />
        )}

        {!loading && !error && pagina === "Lista Clientes" && (
          <div className="flex gap-8">
            <div className="flex-1">
              <ClienteList onSelectCliente={setClienteSeleccionado} />
            </div>

            <div className="flex-1">
              {clienteSeleccionado ? (
                <>
                  <ClienteDetalle
                    cliente={clienteSeleccionado}
                    onClienteActualizado={(clienteActualizado) =>
                      setClienteSeleccionado(clienteActualizado)
                    }
                    onClienteEliminado={() => setClienteSeleccionado(null)}
                  />
                  <NuevoPrestamo
                    clienteId={clienteSeleccionado._id}
                    onPrestamoCreado={onPrestamoCreado}
                  />
                  <ListaPrestamos clienteId={clienteSeleccionado._id} />
                </>
              ) : (
                <p>Selecciona un cliente para ver detalles</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
