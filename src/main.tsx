import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./config/sentry";
import { reportWebVitals } from "./utils/performanceMonitor";

const shouldSilenceConsole = import.meta.env.VITE_DISABLE_CONSOLE !== "false";

if (shouldSilenceConsole && typeof window !== "undefined") {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Initialize Sentry error tracking
initSentry();

// Report Web Vitals for performance monitoring
if (
  typeof window !== "undefined" &&
  import.meta.env.VITE_LOG_WEB_VITALS === "true"
) {
  reportWebVitals();
}

createRoot(document.getElementById("root")!).render(<App />);
