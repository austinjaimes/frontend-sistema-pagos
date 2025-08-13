import React, { useState, useEffect, useCallback } from "react";
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

  // NUEVO: estado para clientes con pago hoy
  const [clientesPagoHoy, setClientesPagoHoy] = useState([]);
  const [clientesSinPagoHoy, setClientesSinPagoHoy] = useState([]);

  // Estado para cliente seleccionado
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const fetchData = useCallback(async () => {
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

      if (!Array.isArray(clientes))
        throw new Error("Datos inválidos: clientes no es un arreglo");

      setNumClientes(clientes.length);

      let activosCount = 0;
      let totalPrestamos = 0;

      for (const cliente of clientes) {
        const resPrestamos = await fetch(
          `${API_BASE_URL}/prestamos/cliente/${cliente._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!resPrestamos.ok) continue;
        const prestamosCliente = await resPrestamos.json();
        if (!Array.isArray(prestamosCliente)) continue;

        const hoy = new Date();

        for (const p of prestamosCliente) {
          const inicio = new Date(p.fechaInicio);
          const finPrestamo = new Date(inicio);
          finPrestamo.setDate(finPrestamo.getDate() + p.dias);
          if (hoy < finPrestamo) {
            activosCount++;
            totalPrestamos += p.monto || 0;
          }
        }
      }

      setPrestamosActivos(activosCount);
      setDineroTotal(totalPrestamos);

      // Obtener clientes por pago hoy
      const resPagoHoy = await fetch(`${API_BASE_URL}/clientes/pagoHoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resPagoHoy.ok)
        throw new Error("Error al cargar estado de pagos de hoy");
      const pagoHoyData = await resPagoHoy.json();

      // Ajuste de nombres según backend
      setClientesPagoHoy(
        Array.isArray(pagoHoyData.clientesPagaronHoy)
          ? pagoHoyData.clientesPagaronHoy
          : []
      );
      setClientesSinPagoHoy(
        Array.isArray(pagoHoyData.clientesNoPagaronHoy)
          ? pagoHoyData.clientesNoPagaronHoy
          : []
      );
    } catch (err) {
      setError(err.message);
      setNumClientes(0);
      setPrestamosActivos(0);
      setDineroTotal(0);
      setClientesPagoHoy([]);
      setClientesSinPagoHoy([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Funciones para refrescar listado o actualizar datos al crear o eliminar
  const refrescarDatosDashboard = () => {
    fetchData();
    setPagina("Dashboard");
  };

  const onClienteCreado = () => {
    alert("Cliente creado");
    refrescarDatosDashboard();
  };

  const onPrestamoCreado = () => {
    alert("Préstamo creado");
    fetchData(); // refrescar datos para actualizar UI
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

      <main className="p-6 max-w-6xl mx-auto">
        {loading && <p>Cargando datos...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && pagina === "Dashboard" && (
          <div className="p-6 bg-white rounded shadow-md max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-center">Dashboard</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center mb-8">
              <div className="p-4 border rounded bg-blue-100">
                <h2 className="text-lg font-semibold">Préstamos activos</h2>
                <p className="text-3xl font-bold">{prestamosActivos}</p>
              </div>
              <div className="p-4 border rounded bg-green-100">
                <h2 className="text-lg font-semibold">Dinero total prestado</h2>
                <p className="text-3xl font-bold">
                  ${dineroTotal.toFixed(2)}
                </p>
              </div>
              <div className="p-4 border rounded bg-yellow-100">
                <h2 className="text-lg font-semibold">Número de clientes</h2>
                <p className="text-3xl font-bold">{numClientes}</p>
              </div>
            </div>

            {/* Sección clientes que pagaron hoy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 border rounded bg-green-50">
                <h2 className="text-xl font-semibold mb-2 text-center text-green-700">
                  Clientes que pagaron hoy ({clientesPagoHoy.length})
                </h2>
                {clientesPagoHoy.length === 0 ? (
                  <p className="text-center">Ningún cliente ha pagado hoy.</p>
                ) : (
                  <ul className="list-disc list-inside max-h-48 overflow-auto">
                    {clientesPagoHoy.map((cliente) => (
                      <li
                        key={cliente._id}
                        className="truncate"
                        title={cliente.nombre}
                      >
                        {cliente.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 border rounded bg-red-50">
                <h2 className="text-xl font-semibold mb-2 text-center text-red-700">
                  Clientes sin pago hoy ({clientesSinPagoHoy.length})
                </h2>
                {clientesSinPagoHoy.length === 0 ? (
                  <p className="text-center">Todos los clientes han pagado hoy.</p>
                ) : (
                  <ul className="list-disc list-inside max-h-48 overflow-auto">
                    {clientesSinPagoHoy.map((cliente) => (
                      <li
                        key={cliente._id}
                        className="truncate"
                        title={cliente.nombre}
                      >
                        {cliente.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && pagina === "Nuevo Cliente" && (
          <NuevoCliente onClienteCreado={onClienteCreado} />
        )}

        {!loading && !error && pagina === "Lista Clientes" && (
          <div className="flex flex-col gap-6">
            <ClienteList onSelectCliente={setClienteSeleccionado} />

            {clienteSeleccionado ? (
              <div className="mt-6">
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
              </div>
            ) : (
              <p>Selecciona un cliente para ver detalles</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
