import { NavLink } from "react-router-dom";

function Navbar() {
  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/vehicles", label: "Vehicles" },
    { to: "/drivers", label: "Drivers" },
    { to: "/trips", label: "Trips" },
  ];

  return (
    <nav className="bg-slate-900 text-white px-6 py-4 flex items-center gap-6">
      <span className="font-bold text-lg mr-4">TransitOps</span>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `text-sm font-medium px-3 py-1 rounded ${
              isActive ? "bg-slate-700" : "hover:bg-slate-800"
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navbar;