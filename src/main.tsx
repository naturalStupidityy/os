import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Single render - no StrictMode to avoid double renders in dev
createRoot(document.getElementById("root")!).render(<App />);
