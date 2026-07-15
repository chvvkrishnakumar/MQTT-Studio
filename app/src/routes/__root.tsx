import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";

import type { AuthUser } from "@/lib/auth-storage";

interface RouterContext {
  auth: {
    isAuthenticated: boolean;
    user: AuthUser | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <Toaster />
      <Outlet />
    </React.Fragment>
  );
}
