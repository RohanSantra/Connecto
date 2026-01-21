import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import App from "./App";

// Main css file
import "./styles/index.css";

// All Themes
import "./styles/themes/default.css"
import "./styles/themes/amberMinimal.css"



createRoot(document.getElementById("root")).render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <App />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
    </ThemeProvider>
);
