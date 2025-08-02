import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    console.error("Root element not found");
  }
} catch (error) {
  console.error("Failed to initialize app:", error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px;">
        <h1>Loading Error</h1>
        <p>Please refresh the page or try again later.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px;">Refresh</button>
      </div>
    </div>
  `;
}
