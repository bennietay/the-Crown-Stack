import { Link } from "@/src/lib/router";
import { Button } from "@/src/components/ui/button";

export function NotFound() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center text-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-800">Page not found</h2>
      <p className="mt-4 text-slate-500">Sorry, we couldn't find the page you're looking for.</p>
      <div className="mt-8">
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
