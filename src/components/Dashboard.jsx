import React, { useState } from "react";
import NuevoCliente from "./NuevoCliente";
import ClienteList from "./ClienteList";
import ClienteDetalle from "./ClienteDetalle";
import ListaPrestamos from "./ListaPrestamos";
import NuevoPrestamo from "./NuevoPrestamo";

export default function Dashboard({ onLogout }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientesActualizados, setClientesActualizados] = useState(false);
  const [prestamosActualizados, setPrestamosActualizados] = useState(false);

  // Refrescar lista de clientes
  const refrescarClientes = () => setClientesActualizados((prev) => !prev);

  // Refrescar lista de préstamos
  const refrescarPrestamos = () => setPrestamosActualizados((prev) => !prev);

  // Actualizar cliente
  const handleClienteActualizado = (clienteActualizado) => {
    if (clienteSeleccionado && clienteActualizado._id === clienteSeleccionado._id) {
      setClienteSeleccionado(clienteActualizado);
    }
    refrescarClientes();
  };

  // Eliminar cliente
  const handleClienteEliminado = (clienteId) => {
    if (clienteSeleccionado && clienteSeleccionado._id === clienteId) {
      setClienteSeleccionado(null);
    }
    refrescarClientes();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Gestión</h1>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Nueva sección de cliente */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Registrar nuevo cliente
        </h2>
        <NuevoCliente onClienteCreado={refrescarClientes} />
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Clientes</h2>
          <ClienteList
            key={clientesActualizados}
            onSelectCliente={setClienteSeleccionado}
          />
        </div>

        {/* Detalle de cliente y préstamos */}
        <div className="md:col-span-2 space-y-6">
          {/* Detalle cliente */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Detalle del cliente
            </h2>
            <ClienteDetalle
              cliente={clienteSeleccionado}
              onClienteActualizado={handleClienteActualizado}
              onClienteEliminado={handleClienteEliminado}
            />
          </div>

          {/* Lista y nuevo préstamo */}
          {clienteSeleccionado && (
            <>
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  Préstamos del cliente
                </h2>
                <ListaPrestamos
                  clienteId={clienteSeleccionado._id}
                  key={prestamosActualizados}
                />
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  Agregar nuevo préstamo
                </h2>
                <NuevoPrestamo
                  clienteId={clienteSeleccionado._id}
                  onPrestamoCreado={refrescarPrestamos}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
