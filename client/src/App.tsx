import { Switch, Route, Redirect } from "wouter";
import { apiRequest, queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import ResetPassword from "./pages/reset-password";
import Login from "./pages/login";
import PaymentComplete from "./pages/payment-complete";
import PaymentCancel from "./pages/payment-cancel";
import { User } from "@shared/schema";
import UserProvider from "./contexts/user-context";
import { GraduationCapIcon, Loader2Icon } from "lucide-react";

function Router() {

  const getMe = async ({ queryKey }: any) => {
    const [_, params] = queryKey;
    const response = await apiRequest("GET", "/api/v1/me");
    return await response.json();
  };

  const { data: user, isFetching } = useQuery<User>({
    queryKey: ["get-me"],
    queryFn: getMe,
    // enabled: window.location.pathname === "/dashboard",
  });

  if (isFetching) {
    return (
      <>
        <div className="flex flex-col gap-2 justify-center items-center h-screen">
          <div className="p-6 border-gray-200">
            <h1 className="text-xl font-semibold neutral-dark flex items-center">
              <GraduationCapIcon className="fluent-blue mr-3" size={24} />
              Khmer Learning Admin
            </h1>
          </div>
          <div className="animate-spin">
            <Loader2Icon />
          </div>
          <span className="text-muted-foreground text-xs">Loading...</span>
        </div>
      </>
    );
  }

  return (
    <Switch>
      <UserProvider value={user}>
        <Route path="/" component={user ? Dashboard : Login} />
        <Route path="/dashboard" component={user ? Dashboard : Login} />
      </UserProvider>
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/complete" component={PaymentComplete} />
      <Route path="/cancel" component={PaymentCancel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
