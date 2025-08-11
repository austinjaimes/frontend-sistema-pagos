import React from "react";

export default function Navbar({ currentPage, onChangePage }) {
  return (
    <nav className="bg-gray-800 p-4 flex gap-6 justify-center">
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
    </nav>
  );
}
