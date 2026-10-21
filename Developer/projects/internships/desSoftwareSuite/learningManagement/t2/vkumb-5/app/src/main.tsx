import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import App from "./App.tsx";

// Single render - no StrictMode to avoid double renders in dev
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </BrowserRouter>
);
