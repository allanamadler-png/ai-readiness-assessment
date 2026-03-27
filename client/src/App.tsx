import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import InterviewPage from "@/pages/interview";
import TranscriptPage from "@/pages/transcript";
import ScriptPage from "@/pages/script";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/interview/:id" component={InterviewPage} />
      <Route path="/transcript/:id" component={TranscriptPage} />
      <Route path="/script/:id" component={ScriptPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
