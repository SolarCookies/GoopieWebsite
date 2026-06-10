
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Self-heal after a deploy: when a lazily-imported route chunk fails to load
  // (its hashed filename no longer exists on the server), reload once to fetch a
  // fresh index.html and the current chunk names. The sessionStorage guard stops
  // reload loops if the failure persists for some other reason.
  window.addEventListener("vite:preloadError", () => {
    const KEY = "vite-preload-reloaded-at";
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  