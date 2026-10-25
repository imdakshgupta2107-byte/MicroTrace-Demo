import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Guard navigation happens after commit, never during render. */
export function RouteRedirect({ to, replace = true }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return <span role="status" className="sr-only">Opening MicroTrace…</span>;
}
