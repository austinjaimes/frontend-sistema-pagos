import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import NewDashboard from "./components/NewDashboard";

export default function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const tokenGuardado = localStorage.getItem("token");
    if (tokenGuardado) setToken(tokenGuardado);
  }, []);

  const handleLogin = (tokenRecibido) => {
    localStorage.setItem("token", tokenRecibido);
    setToken(tokenRecibido);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) return <Auth onLogin={handleLogin} />;

  return <Dashboard onLogout={handleLogout} token={token} />;
}
