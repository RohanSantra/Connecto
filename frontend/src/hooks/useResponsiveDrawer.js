import { useEffect, useState } from "react";

export function useResponsiveDrawer() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check(); // initialize on mount
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    return { isMobile };
}

export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [query]);

    return matches;
}
