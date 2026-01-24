import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import App from "./App";

/* Base styles */
import "./styles/index.css";

/* Theme styles */
import "./styles/themes/default.css";
import "./styles/themes/amberMinimal.css";
import "./styles/themes/amethystHaze.css";
import "./styles/themes/aurora.css";
import "./styles/themes/boldTech.css";
import "./styles/themes/bubblegum.css";
import "./styles/themes/caffeine.css";
import "./styles/themes/candyland.css";
import "./styles/themes/catppuccin.css";
import "./styles/themes/claude.css";
import "./styles/themes/claymorphism.css";
import "./styles/themes/cleanSlate.css";
import "./styles/themes/cosmicNight.css";
import "./styles/themes/cyberpunk.css";
import "./styles/themes/darkmatter.css";
import "./styles/themes/doom64.css";
import "./styles/themes/elegantLuxury.css";
import "./styles/themes/graphite.css";
import "./styles/themes/kodamaGrove.css";
import "./styles/themes/midnight.css";
import "./styles/themes/midnightBloom.css";
import "./styles/themes/mint.css";
import "./styles/themes/mochaMousse.css";
import "./styles/themes/modernMinimal.css";
import "./styles/themes/mono.css";
import "./styles/themes/nature.css";
import "./styles/themes/neoBrutalism.css";
import "./styles/themes/northernLights.css";
import "./styles/themes/notebook.css";
import "./styles/themes/ocean.css";
import "./styles/themes/oceanBreeze.css";
import "./styles/themes/pastelDreams.css";
import "./styles/themes/perpetuity.css";
import "./styles/themes/quantumRose.css";
import "./styles/themes/retroArcade.css";
import "./styles/themes/sageGarden.css";
import "./styles/themes/softPop.css";
import "./styles/themes/solarDusk.css";
import "./styles/themes/starryNight.css";
import "./styles/themes/sunset.css";
import "./styles/themes/sunsetHorizon.css";
import "./styles/themes/supabase.css";
import "./styles/themes/t3Chat.css";
import "./styles/themes/tangerine.css";
import "./styles/themes/twitter.css";
import "./styles/themes/vercel.css";
import "./styles/themes/vintagePaper.css";
import "./styles/themes/violetBloom.css";




createRoot(document.getElementById("root")).render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <App />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
    </ThemeProvider>
);
