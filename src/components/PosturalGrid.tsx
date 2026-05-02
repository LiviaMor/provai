/**
 * Grade postural sobreposta às fotos para análise visual de simetria,
 * alinhamento de ombros/quadris/joelhos e referência de proporção.
 * Inspirada nos quadros quadriculados usados em avaliação física presencial.
 */
type PosturalGridProps = {
  variant?: "front" | "side";
  label?: string;
};

export const PosturalGrid = ({ variant = "front", label }: PosturalGridProps) => {
  // Linhas anatômicas de referência (em % da altura da foto, do topo)
  // Baseadas em proporções clássicas de avaliação postural.
  const refLines =
    variant === "front"
      ? [
          { y: 12, name: "Olhos" },
          { y: 22, name: "Ombros" },
          { y: 42, name: "Cintura" },
          { y: 52, name: "Quadril" },
          { y: 75, name: "Joelhos" },
          { y: 96, name: "Tornozelos" },
        ]
      : [
          { y: 12, name: "Cabeça" },
          { y: 22, name: "Ombro" },
          { y: 42, name: "Lombar" },
          { y: 52, name: "Quadril" },
          { y: 75, name: "Joelho" },
          { y: 96, name: "Tornozelo" },
        ];

  // Grid quadriculado: 10 colunas × 14 linhas
  const cols = 10;
  const rows = 14;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        {/* Grade fina */}
        <g stroke="hsl(var(--primary))" strokeOpacity="0.25" strokeWidth="0.15">
          {Array.from({ length: cols - 1 }, (_, i) => {
            const x = ((i + 1) * 100) / cols;
            return <line key={`v-${i}`} x1={x} y1="0" x2={x} y2="100" />;
          })}
          {Array.from({ length: rows - 1 }, (_, i) => {
            const y = ((i + 1) * 100) / rows;
            return <line key={`h-${i}`} x1="0" y1={y} x2="100" y2={y} />;
          })}
        </g>

        {/* Linha central vertical (eixo de simetria / fio de prumo) */}
        <line
          x1="50"
          y1="0"
          x2="50"
          y2="100"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.85"
          strokeWidth="0.35"
          strokeDasharray="1.2 0.8"
        />

        {/* Linhas anatômicas horizontais de referência */}
        {refLines.map((line) => (
          <g key={line.name}>
            <line
              x1="0"
              y1={line.y}
              x2="100"
              y2={line.y}
              stroke="hsl(var(--primary))"
              strokeOpacity="0.55"
              strokeWidth="0.25"
              strokeDasharray="0.8 0.6"
            />
          </g>
        ))}

        {/* Bordas reforçadas */}
        <rect
          x="0.2"
          y="0.2"
          width="99.6"
          height="99.6"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.5"
          strokeWidth="0.3"
        />
      </svg>

      {/* Etiquetas anatômicas (HTML para nitidez tipográfica) */}
      <div className="absolute inset-0">
        {refLines.map((line) => (
          <span
            key={line.name}
            className="absolute -translate-y-1/2 rounded-sm bg-card/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground shadow-sm"
            style={{ top: `${line.y}%`, left: "4px" }}
          >
            {line.name}
          </span>
        ))}
        {label && (
          <span className="absolute right-1 top-1 rounded bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
