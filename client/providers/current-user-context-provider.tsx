"use client";

import type { UserPayload } from "@venuepass/common/client";
import { createContext, useContext, type ReactNode } from "react";

interface CurrentUserContextValue {
  currentUser: UserPayload | null;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(
  undefined,
);

interface CurrentUserProviderProps {
  currentUser: UserPayload | null;
  children: ReactNode;
}

export function CurrentUserProvider({
  currentUser,
  children,
}: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={{ currentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }

  return context;
}
