import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STAGES = [
  "Detectando rosto e iluminação...",
  "Analisando subtom de pele...",
  "Calculando contraste e profundidade...",
  "Identificando estação cromática...",
  "Montando sua cartela ideal...",
  "Selecionando makeup, cabelo e metais...",
  "Finalizando seu relatório premium...",
];

export default function Processing() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(4);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const raw = sessionStorage.getItem("coloracao_photos");
    if (!raw) {
      navigate("/coloracao/upload", { replace: true });
      return;
    }
    const photos: string[] = JSON.parse(raw);

    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
      setProgress((p) => Math.min(p + 12, 92));
    }, 2200);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("color-analysis", { body: { images: photos } });
        clearInterval(interval);
        if (error || !data?.analysis) {
          throw new Error(data?.error || error?.message || "Falha na análise.");
        }
        setProgress(100);
        sessionStorage.setItem("coloracao_result", JSON.stringify({ analysis: data.analysis, images: photos }));
        // Salva no histórico se usuário estiver logado
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("color_analyses").insert({
              user_id: user.id,
              title: `Coloração ${data.analysis?.season ?? ""}`.trim(),
              season: data.analysis?.season ?? null,
              analysis: data.analysis,
              reference_photo: photos[0] ?? null,
            });
          }
        } catch (err) {
          console.warn("Falha ao salvar histórico de coloração", err);
        }
        setTimeout(() => navigate("/coloracao/relatorio"), 600);
      } catch (e: unknown) {
        clearInterval(interval);
        const msg = e instanceof Error ? e.message : "Erro inesperado";
        toast({ title: "Não foi possível analisar", description: msg, variant: "destructive" });
        setTimeout(() => navigate("/coloracao/upload", { replace: true }), 1500);
      }
    })();

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-app-radial grid place-items-center p-6">
      <div className="w-full max-w-xl">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-primary text-primary-foreground grid place-items-center shadow-panel">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
            <Sparkles className="h-8 w-8" />
          </motion.div>
        </div>
        <p className="mt-8 text-center uppercase tracking-[0.25em] text-xs text-muted-foreground">Inteligência Cromática</p>
        <h1 className="mt-3 text-center font-display text-3xl sm:text-4xl">Analisando sua coloração pessoal</h1>

        <div className="mt-10 rounded-3xl border border-border bg-card/80 backdrop-blur p-8 shadow-panel">
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
          </div>
          <div className="mt-6 h-12 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="font-display text-xl text-center"
              >
                {STAGES[stage]}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Isso pode levar até 30 segundos.</p>
        </div>
      </div>
    </div>
  );
}
