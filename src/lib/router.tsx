import { AnchorHTMLAttributes, createContext, MouseEvent, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type RouterValue = {
  pathname: string;
  navigate: (destination: string | number) => void;
};

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const value = useMemo<RouterValue>(() => ({
    pathname,
    navigate(destination) {
      if (typeof destination === "number") {
        window.history.go(destination);
        return;
      }
      if (destination === window.location.pathname) return;
      window.history.pushState({}, "", destination);
      setPathname(window.location.pathname);
      window.scrollTo({ top: 0 });
    },
  }), [pathname]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useLocation() {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useLocation must be used inside RouterProvider");
  return { pathname: router.pathname };
}

export function useNavigate() {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useNavigate must be used inside RouterProvider");
  return router.navigate;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };

export function Link({ to, onClick, children, ...props }: LinkProps) {
  const navigate = useNavigate();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...props}>{children}</a>;
}
