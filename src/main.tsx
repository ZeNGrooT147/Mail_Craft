import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import appStyles from "./index.css?inline";

const INLINE_STYLE_ID = "mailcraft-inline-styles";

if (!document.getElementById(INLINE_STYLE_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = INLINE_STYLE_ID;
  styleTag.textContent = appStyles;
  document.head.appendChild(styleTag);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" storageKey="mailcraft-theme">
    <App />
  </ThemeProvider>
);
