import React, { useState } from "react";

const API_BASE_URL = "https://backend-sistema-prestamos-production.up.railway.app/api";

export default function Auth({ onLogin }) {
  const [modo, setModo] = useState("login"); // 'login' o 'register'
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url =
        modo === "login" ? `${API_BASE_URL}/auth/login` : `${API_BASE_URL}/auth/register`;

      const bodyData =
        modo === "login"
          ? { email: formData.email, password: formData.password }
          : formData; // para register incluye nombre

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || "Error en la autenticación");

      // Si es login, guardamos token
      if (modo === "login") {
        localStorage.setItem("token", data.token);
        onLogin(data.token);
      } else {
        // En registro, mostrar mensaje o directamente hacer login automático
        alert("Registro exitoso, ya puedes iniciar sesión");
        setModo("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 border rounded shadow">
      <div className="mb-4 flex justify-center gap-4">
        <button
          onClick={() => {
            setError("");
            setModo("login");
          }}
          className={`px-4 py-2 rounded ${
            modo === "login" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => {
            setError("");
            setModo("register");
          }}
          className={`px-4 py-2 rounded ${
            modo === "register" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Registrarse
        </button>
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit}>
        {modo === "register" && (
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="mb-2 w-full p-2 border rounded"
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          required
          className="mb-2 w-full p-2 border rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          required
          className="mb-4 w-full p-2 border rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 w-full"
        >
          {loading
            ? "Cargando..."
            : modo === "login"
            ? "Iniciar sesión"
            : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
