import { useEffect, useState } from "react";

// Tiny hash router so we don't need react-router (out of course scope).
// Routes look like #/login, #/booking, #/admin
export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function parseHash() {
  const h = window.location.hash || "#/";
  const [path, query = ""] = h.slice(1).split("?");
  const params = Object.fromEntries(new URLSearchParams(query));
  return { path: path || "/", params };
}

export function navigate(path) {
  window.location.hash = "#" + path;
}
