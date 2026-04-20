import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Activity, ArrowRight, Camera, CheckCircle2, Ruler, ScanLine, Shirt, Sparkles, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type ClothingTip = {
  category: string;
  size: string;
  fitTip: string;
};

type Analysis = {
  confidence: number;
  disclaimer: string;
  measurements: Record<string, number | string>;
  fitProfile: string;
  clothing: ClothingTip[];
  adjustments: string[];
  nutritionNotes: string[];
};

const measureLabels: Record<string, string> = {
  height_cm: "Altura",
  estimated_weight_kg: "Peso estimado",
  bust_cm: "Busto/tórax",
  waist_cm: "Cintura",
  hip_cm: "Quadril",
  inseam_cm: "Entrepernas",
  outseam_cm: "Lateral da perna",
  arm_length_cm: "Braço",
  shoulder_width_cm: "Ombros",
  thigh_cm: "Coxa",
};

const references = [
  "Foto frontal, corpo inteiro, câmera na altura do peito e boa iluminação.",
  "Altura e peso informados funcionam como escala para reduzir erro visual.",
  "A compra deve cruzar medidas estimadas com a tabela específica da marca.",
];

const Index = () => {
  const [imagePreview, setImagePreview] = useState<string>("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [shoppingGoal, setShoppingGoal] = useState("Comprar roupas online com menos troca");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const confidenceTone = useMemo(() => {
    if (!analysis) return "Aguardando imagem";
    if (analysis.confidence >= 75) return "Alta confiança";
    if (analysis.confidence >= 55) return "Confiança moderada";
    return "Estimativa inicial";
  }, [analysis]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem válida.");
      return;
    }

    if (file.size > 7 * 1024 * 1024) {
      toast.error("Use uma foto de até 7MB para análise mais rápida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const numberOrUndefined = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const analyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imagePreview) {
      toast.error("Adicione uma foto frontal de corpo inteiro.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    const { data, error } = await supabase.functions.invoke("analyze-body", {
      body: {
        imageDataUrl: imagePreview,
        heightCm: numberOrUndefined(heightCm),
        weightKg: numberOrUndefined(weightKg),
        age: numberOrUndefined(age),
        gender: gender.trim() || undefined,
        shoppingGoal: shoppingGoal.trim() || undefined,
      },
    });

    setIsAnalyzing(false);

    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível concluir a análise.");
      return;
    }

    setAnalysis(data as Analysis);
    toast.success("Análise virtual concluída.");
  };

  return (
    <main className="min-h-screen bg-app-radial text-foreground">
      <section className="container grid min-h-screen gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-10">
        <div className="animate-reveal space-y-6">
          <nav className="flex items-center justify-between rounded-md border bg-card/70 px-4 py-3 shadow-panel backdrop-blur">
            <div className="flex items-center gap-2 font-display font-extrabold">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-glow">
                <ScanLine className="size-5" />
              </span>
              MedidaCerta AI
            </div>
            <span className="hidden items-center gap-2 rounded-md bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground sm:flex">
              <Sparkles className="size-3.5" /> análise virtual
            </span>
          </nav>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card/70 px-3 py-2 text-sm font-bold text-muted-foreground shadow-panel backdrop-blur">
              <Wand2 className="size-4 text-primary" /> Medidas, tamanho e ajustes por IA
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-normal text-balance sm:text-5xl lg:text-6xl">
              Avaliação física virtual para comprar roupa com mais precisão.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Envie uma foto de corpo inteiro e adicione altura/peso quando tiver. A IA estima busto, cintura, quadril, pernas, braços, peso e transforma isso em recomendações de tamanho, barra e punho.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {references.map((item) => (
              <div key={item} className="rounded-md border bg-card/70 p-4 text-sm font-semibold text-card-foreground shadow-panel backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                <CheckCircle2 className="mb-3 size-5 text-success" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={analyze} className="animate-reveal rounded-md border bg-panel-glow p-4 shadow-panel backdrop-blur [animation-delay:120ms] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold">Captura corporal</h2>
                <p className="text-sm text-muted-foreground">Quanto melhor a escala, melhor a estimativa.</p>
              </div>
              <Camera className="size-5 text-primary" />
            </div>

            <Label htmlFor="photo" className="group relative mb-4 flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-secondary text-center shadow-inner transition-transform duration-300 hover:-translate-y-1">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Foto enviada para análise corporal virtual" className="h-full w-full object-cover" />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-scanner-line animate-scan" />
                  <span className="absolute inset-0 scan-grid opacity-60" />
                </>
              ) : (
                <span className="flex max-w-56 flex-col items-center gap-3 p-6 text-muted-foreground">
                  <Upload className="size-9 text-primary" />
                  Toque para enviar foto frontal de corpo inteiro
                </span>
              )}
            </Label>
            <Input id="photo" type="file" accept="image/*" onChange={onImageChange} className="sr-only" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input id="height" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="172" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="68" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input id="age" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="32" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Modelagem</Label>
                <Input id="gender" value={gender} onChange={(event) => setGender(event.target.value)} placeholder="fem., masc..." maxLength={40} />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <Label htmlFor="goal">Objetivo</Label>
              <Textarea id="goal" value={shoppingGoal} onChange={(event) => setShoppingGoal(event.target.value)} maxLength={220} />
            </div>

            <Button type="submit" variant="hero" size="lg" disabled={isAnalyzing} className="mt-4 w-full">
              {isAnalyzing ? "Analisando medidas..." : "Analisar medidas"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <aside className="animate-reveal space-y-4 [animation-delay:220ms]">
            <div className="rounded-md border bg-card/80 p-5 shadow-panel backdrop-blur">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-normal text-primary">Resultado</p>
                  <h2 className="font-display text-2xl font-extrabold">{confidenceTone}</h2>
                </div>
                <div className="grid size-14 place-items-center rounded-md bg-secondary font-display text-lg font-extrabold text-secondary-foreground">
                  {analysis ? `${Math.round(analysis.confidence)}%` : <Ruler className="size-6" />}
                </div>
              </div>

              {analysis ? (
                <div className="space-y-5">
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{analysis.disclaimer}</p>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(analysis.measurements ?? {}).map(([key, value]) => (
                      <div key={key} className="rounded-md border bg-background/70 p-3">
                        <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">{measureLabels[key] ?? key}</p>
                        <p className="font-display text-xl font-extrabold">{String(value)}{key.includes("cm") ? " cm" : key.includes("kg") ? " kg" : ""}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border bg-secondary p-4 text-secondary-foreground">
                    <div className="mb-2 flex items-center gap-2 font-display font-extrabold">
                      <Activity className="size-5" /> Perfil de caimento
                    </div>
                    <p className="text-sm leading-6">{analysis.fitProfile}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-muted/70 p-6 text-center text-muted-foreground">
                  <ScanLine className="mx-auto mb-3 size-10 animate-float text-primary" />
                  O painel mostrará medidas estimadas, tamanhos compatíveis e alertas de ajuste.
                </div>
              )}
            </div>

            <div className="rounded-md border bg-card/80 p-5 shadow-panel backdrop-blur">
              <div className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold">
                <Shirt className="size-5 text-primary" /> Recomendações
              </div>
              {analysis ? (
                <div className="space-y-3">
                  {analysis.clothing?.map((item) => (
                    <div key={`${item.category}-${item.size}`} className="rounded-md border bg-background/70 p-4 transition-transform duration-300 hover:-translate-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold">{item.category}</h3>
                        <span className="rounded-md bg-accent px-3 py-1 text-sm font-extrabold text-accent-foreground">{item.size}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.fitTip}</p>
                    </div>
                  ))}
                  <div className="grid gap-2 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                    {[...(analysis.adjustments ?? []), ...(analysis.nutritionNotes ?? [])].slice(0, 5).map((note) => (
                      <p key={note} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {note}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">Após a análise, o app sugere tamanho de camiseta, calça, vestido e ajustes como barra da calça e punho da manga.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default Index;
