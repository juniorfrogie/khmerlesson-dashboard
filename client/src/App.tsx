import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import ResetPassword from "./pages/reset-password";
import Login from "./pages/login";
import { useAuth } from "./hooks/use-auth";
import PaymentComplete from "./pages/payment-complete";
import PaymentCancel from "./pages/payment-cancel";

function Router() {

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    // <Switch>
    //   <Route path="/" component={Dashboard} />
    //   <Route path="/reset-password/:token" component={ResetPassword} />
    //   <Route component={NotFound} />
    // </Switch>

    <Switch>
      <Route path="/" component={isAuthenticated ? Dashboard : Login} />
      <Route path="/dashboard" component={isAuthenticated ? Dashboard : Login} />
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
