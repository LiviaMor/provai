import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, X, ArrowLeft, Sun, Camera as CamIcon, Eye, Glasses, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const MAX = 5;

const tips = [
  { icon: Sun, label: "Luz natural" },
  { icon: CamIcon, label: "Sem filtro" },
  { icon: Eye, label: "Rosto visível" },
  { icon: Glasses, label: "Sem óculos" },
];

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

export default function UploadPage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const remaining = MAX - photos.length;
    if (remaining <= 0) {
      toast({ title: "Limite atingido", description: `Máximo ${MAX} fotos.` });
      return;
    }
    const accepted = arr.slice(0, remaining);
    const urls = await Promise.all(accepted.map(fileToDataUrl));
    setPhotos((p) => [...p, ...urls]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void addFiles(e.target.files);
    e.target.value = "";
  };

  const remove = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const submit = () => {
    if (photos.length === 0) {
      toast({ title: "Envie ao menos 1 foto", description: "Precisamos do seu rosto para a análise." });
      return;
    }
    sessionStorage.setItem("coloracao_photos", JSON.stringify(photos));
    navigate("/coloracao/processando");
  };

  return (
    <div className="min-h-screen bg-app-radial">
      <nav className="container flex items-center justify-between py-6">
        <Link to="/coloracao" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Etapa 1 de 3</span>
      </nav>

      <section className="container max-w-3xl pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Upload</p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-balance">Envie de 1 a 5 fotos do seu rosto</h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Quanto mais natural a foto, mais precisa será a análise. Frente é obrigatória, perfil é opcional.</p>
        </motion.div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tips.map((t) => (
            <div key={t.label} className="rounded-2xl border border-border bg-card/70 p-4 flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><t.icon className="h-4 w-4" /></span>
              <span className="text-sm">{t.label}</span>
            </div>
          ))}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${drag ? "border-accent bg-accent/5" : "border-border bg-card/50 hover:bg-card"}`}
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center"><Upload className="h-6 w-6" /></div>
          <p className="mt-4 font-display text-lg">Arraste suas fotos ou clique para selecionar</p>
          <p className="mt-1 text-sm text-muted-foreground">JPG, PNG · até {MAX} imagens · {photos.length}/{MAX} enviadas</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
        </div>

        {photos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {photos.map((src, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border shadow-panel group">
                <img src={src} alt={`Foto ${i+1}`} className="h-full w-full object-cover" />
                <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 text-foreground grid place-items-center opacity-0 group-hover:opacity-100 transition">
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground text-[10px] uppercase tracking-wider px-2 py-1">
                    <Check className="h-3 w-3" /> Principal
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Button size="lg" onClick={submit} className="rounded-full px-8 gap-2">
            <Sparkles className="h-4 w-4" /> Gerar Minha Análise
          </Button>
          <p className="text-xs text-muted-foreground">Suas fotos são processadas com privacidade e não são armazenadas.</p>
        </div>
      </section>
    </div>
  );
}
