import { useAuth } from "../lib/AuthContext";
import { navigate } from "../lib/router";

export default function Navbar({ active }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const linkClass = (key) => "navlink" + (active === key ? " active" : "");

  return (
    <nav className="navbar">
      <a className="brand" href={user ? "#/booking" : "#/login"}>🎾 CourtBook</a>

      {user && (
        <>
          <a className={linkClass("booking")} href="#/booking">Book</a>
          <a className={linkClass("dashboard")} href="#/dashboard">My Bookings</a>
          {isAdmin && <a className={linkClass("admin")} href="#/admin">Admin</a>}
        </>
      )}

      {user ? (
        <>
          <span className="user-info">
            {user.name}
            {isAdmin && <span className="badge badge-admin" style={{ marginLeft: 6 }}>admin</span>}
          </span>
          <button className="btn btn-sm" onClick={() => { logout(); }}>Logout</button>
        </>
      ) : (
        <>
          <a className={linkClass("login")} href="#/login">Login</a>
          <a className={linkClass("signup")} href="#/signup">Sign up</a>
        </>
      )}
    </nav>
  );
}
