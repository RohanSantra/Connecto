// src/hooks/useGoogleIdsScript.js
import { useEffect, useState } from "react";

/**
 * Loads the Google Identity Services script and resolves when ready
 * @param {string} clientId
 */
export default function useLoadGoogleIds(clientId) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!clientId) {
            setError("Missing Google Client ID");
            return;
        }

        const id = "google-ids";
        if (document.getElementById(id)) {
            setReady(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.id = id;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setReady(true);
        };
        script.onerror = () => {
            setError("Failed to load Google script");
        };

        document.body.appendChild(script);

        return () => {
            // don't remove script — other components may use it
        };
    }, [clientId]);

    return { ready, error };
}
