import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import * as auth from "./auth/auth";
import { AdminPage } from "./pages/AdminPage";
import { JuradoPage } from "./pages/JuradoPage";
import { LoginPage } from "./pages/LoginPage";
import { EventReportPage } from "./pages/EventReportPage";
import type { TipoUsuario } from "./types/Auth";
import "./App.css";

function RotaProtegida({ tipo, children }: { tipo: TipoUsuario; children: ReactNode }) {
  const sessao = auth.obterSessao();
  if (!sessao) return <Navigate to="/login" replace />;
  if (sessao.tipo !== tipo) return <Navigate to={sessao.tipo === "ADMIN" ? "/admin" : "/jurado"} replace />;
  return children;
}

export default function App() {
  const sessao = auth.obterSessao();
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin" element={<RotaProtegida tipo="ADMIN"><AdminPage /></RotaProtegida>} />
    <Route path="/admin/eventos/:id/relatorio" element={<RotaProtegida tipo="ADMIN"><EventReportPage /></RotaProtegida>} />
    <Route path="/jurado" element={<RotaProtegida tipo="JURADO"><JuradoPage /></RotaProtegida>} />
    <Route path="*" element={<Navigate to={sessao ? (sessao.tipo === "ADMIN" ? "/admin" : "/jurado") : "/login"} replace />} />
  </Routes>;
}
