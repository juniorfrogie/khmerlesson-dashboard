import { User } from "@shared/schema";
import { createContext, useContext } from "react";

const UserContext = createContext<User | null | undefined>(null);

interface UserProviderProps {
  value: User | null | undefined;
  children: React.ReactNode;
}

export default function UserProvider({ value, children }: UserProviderProps) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);

  const getFullName = () => {
    return `${user?.firstName}\t${user?.lastName}`;
  };

  const getShortNameWith2Letter = () => {
    const firstName = user?.firstName;
    const lastName = user?.lastName;
    if (!firstName || !lastName) return "";
    return `${firstName.at(0)?.toUpperCase()}${lastName.at(0)?.toUpperCase()}`;
  };

  const isAuthenticated = () => user !== null && user !== undefined

  return {
    user,
    getFullName,
    getShortNameWith2Letter,
    isAuthenticated
  };
}
