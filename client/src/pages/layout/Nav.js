import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

import AuthFetch from "../../services/AuthFetch";
import "../../css/Nav.css";

const Nav = () => {
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  const [me, setMe] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setMe(null);
        return;
      }

      try {
        const res = await AuthFetch("/me");
        if (!res || res.status !== 200) {
          setMe(null);
          return;
        }

        const user = await res.json();
        setMe(user);
      } catch {
        setMe(null);
      }
    };

    loadMe();
  }, [token]);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 850) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isAdmin = me?.role === "admin";
  const isUser = isLoggedIn && !isAdmin;

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="navbar">
      {/* ================= LEFT SIDE LINKS ================= */}
      <div className="nav-left">
        {/* Logo now clickable -> /home */}
        <NavLink to="/home" className="nav-logo" onClick={closeMobile}>
          🎮 GameVault
        </NavLink>

        {/* Desktop links */}
        <div className="nav-desktop-links">
          <NavLink to="/home" className="nav-link">
            Home
          </NavLink>

          {!isAdmin && (
            <NavLink to="/games" className="nav-link">
              Games
            </NavLink>
          )}

          <NavLink to="/feed" className="nav-link">
            NewsFeed
          </NavLink>

          {isUser && (
            <NavLink to="/profile" className="nav-link">
              Profile
            </NavLink>
          )}

          {isLoggedIn && (
            <NavLink to="/my-posts" className="nav-link">
              My Posts
            </NavLink>
          )}

          {isAdmin && (
            <>
              <NavLink to="/dashboard" className="nav-link">
                Dashboard
              </NavLink>
              <NavLink to="/add" className="nav-link">
                Add
              </NavLink>
              <NavLink to="/update" className="nav-link">
                Manage
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* ================= RIGHT SIDE BUTTONS ================= */}
      <div className="nav-right">
        {/* Desktop buttons */}
        <div className="nav-desktop-actions">
          {!isLoggedIn ? (
            <>
              <NavLink to="/signup" className="nav-btn outline">
                Sign Up
              </NavLink>
              <NavLink to="/login" className="nav-btn solid">
                Login
              </NavLink>
            </>
          ) : (
            <>
              {isUser && (
                <NavLink to="/cart" className="nav-btn cart">
                  Cart
                </NavLink>
              )}
              <NavLink to="/logout" className="nav-btn danger">
                Logout
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {/* ================= MOBILE MENU ================= */}
      <div className={`nav-mobile-menu ${mobileOpen ? "open" : ""}`}>
        <NavLink to="/home" className="nav-link" onClick={closeMobile}>
          Home
        </NavLink>

        {!isAdmin && (
          <NavLink to="/games" className="nav-link" onClick={closeMobile}>
            Games
          </NavLink>
        )}

        <NavLink to="/feed" className="nav-link" onClick={closeMobile}>
          NewsFeed
        </NavLink>

        {isUser && (
          <NavLink to="/profile" className="nav-link" onClick={closeMobile}>
            Profile
          </NavLink>
        )}

        {isLoggedIn && (
          <NavLink to="/my-posts" className="nav-link" onClick={closeMobile}>
            My Posts
          </NavLink>
        )}

        {isAdmin && (
          <>
            <NavLink to="/dashboard" className="nav-link" onClick={closeMobile}>
              Dashboard
            </NavLink>
            <NavLink to="/add" className="nav-link" onClick={closeMobile}>
              Add
            </NavLink>
            <NavLink to="/update" className="nav-link" onClick={closeMobile}>
              Manage
            </NavLink>
          </>
        )}

        <div className="nav-mobile-actions">
          {!isLoggedIn ? (
            <>
              <NavLink to="/signup" className="nav-btn outline" onClick={closeMobile}>
                Sign Up
              </NavLink>
              <NavLink to="/login" className="nav-btn solid" onClick={closeMobile}>
                Login
              </NavLink>
            </>
          ) : (
            <>
              {isUser && (
                <NavLink to="/cart" className="nav-btn cart" onClick={closeMobile}>
                  Cart
                </NavLink>
              )}
              <NavLink to="/logout" className="nav-btn danger" onClick={closeMobile}>
                Logout
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* Optional overlay to close menu when tapping outside */}
      {mobileOpen && <div className="nav-overlay" onClick={closeMobile} />}
    </nav>
  );
};

export default Nav;
