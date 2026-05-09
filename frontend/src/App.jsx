import { useEffect } from "react";
import { useAuth } from "./lib/AuthContext";
import { useHashRoute, navigate } from "./lib/router";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Booking from "./pages/Booking";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

export default function App() {
  const { user } = useAuth();
  const { path } = useHashRoute();

  // Default + auth-required route logic
  useEffect(() => {
    const isAuthPage = path === "/login" || path === "/signup";
    const isProtected = !isAuthPage && path !== "/";

    if (path === "/" || path === "") {
      navigate(user ? (user.role === "admin" ? "/admin" : "/booking") : "/login");
      return;
    }
    if (isProtected && !user) {
      navigate("/login");
      return;
    }
    if (path === "/admin" && user?.role !== "admin") {
      navigate("/booking");
      return;
    }
  }, [path, user]);

  switch (path) {
    case "/login":     return <Login />;
    case "/signup":    return <Signup />;
    case "/booking":   return user ? <Booking /> : null;
    case "/dashboard": return user ? <Dashboard /> : null;
    case "/admin":     return user?.role === "admin" ? <Admin /> : null;
    default:           return null;
  }
}
