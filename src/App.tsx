import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import Landing from "./pages/Landing.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ColoracaoHome from "./pages/coloracao/Home.tsx";
import ColoracaoUpload from "./pages/coloracao/Upload.tsx";
import ColoracaoProcessing from "./pages/coloracao/Processing.tsx";
import ColoracaoReport from "./pages/coloracao/Report.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Auth from "./pages/Auth.tsx";
import Planos from "./pages/Planos.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/analise" element={<Index />} />
        <Route path="/coloracao" element={<ColoracaoHome />} />
        <Route path="/coloracao/upload" element={<ColoracaoUpload />} />
        <Route path="/coloracao/processando" element={<ColoracaoProcessing />} />
        <Route path="/coloracao/relatorio" element={<ColoracaoReport />} />
        <Route path="/coloracao/exemplo" element={<ColoracaoReport demo />} />
        <Route path="/painel" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/planos" element={<Planos />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
