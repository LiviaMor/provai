// Silhueta guia para captura de foto — overlay transparente que mostra
// onde a pessoa deve posicionar cabeça, ombros, cintura, quadril, joelhos e pés.
// Garante enquadramento correto para detecção precisa de landmarks.

type Props = {
  variant: "front" | "side";
  className?: string;
};

export function CameraSilhouette({ variant, className = "" }: Props) {
  if (variant === "front") {
    return (
      <svg
        viewBox="0 0 300 500"
        className={`pointer-events-none ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Guias de margem */}
        <rect x="20" y="10" width="260" height="480" rx="12" stroke="currentColor" opacity="0.15" strokeWidth="1" strokeDasharray="8 4" />

        {/* Cabeça */}
        <ellipse cx="150" cy="52" rx="22" ry="28" stroke="currentColor" opacity="0.5" strokeWidth="1.5" />

        {/* Pescoço */}
        <line x1="150" y1="80" x2="150" y2="95" stroke="currentColor" opacity="0.3" strokeWidth="1" />

        {/* Ombros */}
        <line x1="105" y1="100" x2="195" y2="100" stroke="currentColor" opacity="0.5" strokeWidth="1.5" />
        <circle cx="105" cy="100" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="195" cy="100" r="3" fill="currentColor" opacity="0.6" />

        {/* Tronco */}
        <path d="M 115 100 Q 120 160 125 200 Q 130 230 135 250 L 165 250 Q 170 230 175 200 Q 180 160 185 100" stroke="currentColor" opacity="0.35" strokeWidth="1.2" />

        {/* Cintura (ponto mais estreito) */}
        <line x1="125" y1="175" x2="175" y2="175" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="125" cy="175" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="175" cy="175" r="3" fill="currentColor" opacity="0.6" />
        <text x="180" y="178" fontSize="9" fill="currentColor" opacity="0.5">cintura</text>

        {/* Quadril */}
        <line x1="120" y1="230" x2="180" y2="230" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="120" cy="230" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="180" cy="230" r="3" fill="currentColor" opacity="0.6" />
        <text x="185" y="233" fontSize="9" fill="currentColor" opacity="0.5">quadril</text>

        {/* Pernas */}
        <line x1="135" y1="250" x2="130" y2="370" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />
        <line x1="165" y1="250" x2="170" y2="370" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />

        {/* Joelhos */}
        <circle cx="132" cy="340" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="168" cy="340" r="3" fill="currentColor" opacity="0.6" />
        <text x="173" y="343" fontSize="9" fill="currentColor" opacity="0.5">joelhos</text>

        {/* Canelas */}
        <line x1="130" y1="370" x2="128" y2="450" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />
        <line x1="170" y1="370" x2="172" y2="450" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />

        {/* Pés */}
        <ellipse cx="128" cy="458" rx="12" ry="6" stroke="currentColor" opacity="0.4" strokeWidth="1" />
        <ellipse cx="172" cy="458" rx="12" ry="6" stroke="currentColor" opacity="0.4" strokeWidth="1" />

        {/* Braços (levemente afastados ~15°) */}
        <line x1="105" y1="100" x2="85" y2="240" stroke="currentColor" opacity="0.25" strokeWidth="1" />
        <line x1="195" y1="100" x2="215" y2="240" stroke="currentColor" opacity="0.25" strokeWidth="1" />

        {/* Labels de posição */}
        <text x="150" y="490" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">Alinhe seu corpo com a silhueta</text>
      </svg>
    );
  }

  // Lateral
  return (
    <svg
      viewBox="0 0 300 500"
      className={`pointer-events-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Guias de margem */}
      <rect x="40" y="10" width="220" height="480" rx="12" stroke="currentColor" opacity="0.15" strokeWidth="1" strokeDasharray="8 4" />

      {/* Cabeça (perfil) */}
      <ellipse cx="155" cy="52" rx="20" ry="26" stroke="currentColor" opacity="0.5" strokeWidth="1.5" />

      {/* Pescoço */}
      <line x1="150" y1="78" x2="148" y2="95" stroke="currentColor" opacity="0.3" strokeWidth="1" />

      {/* Tronco (perfil — mostra profundidade) */}
      <path d="M 130 95 Q 125 140 128 175 Q 130 210 135 250" stroke="currentColor" opacity="0.35" strokeWidth="1.2" />
      <path d="M 170 95 Q 175 130 172 160 Q 168 200 165 250" stroke="currentColor" opacity="0.35" strokeWidth="1.2" />

      {/* Cintura */}
      <line x1="128" y1="175" x2="168" y2="175" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="172" y="178" fontSize="9" fill="currentColor" opacity="0.5">cintura</text>

      {/* Quadril */}
      <line x1="130" y1="230" x2="175" y2="230" stroke="currentColor" opacity="0.5" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="180" y="233" fontSize="9" fill="currentColor" opacity="0.5">quadril</text>

      {/* Pernas (perfil) */}
      <line x1="140" y1="250" x2="138" y2="370" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />
      <line x1="155" y1="250" x2="153" y2="370" stroke="currentColor" opacity="0.3" strokeWidth="1.2" />

      {/* Joelhos */}
      <circle cx="139" cy="340" r="3" fill="currentColor" opacity="0.6" />
      <text x="148" y="343" fontSize="9" fill="currentColor" opacity="0.5">joelho</text>

      {/* Pés */}
      <ellipse cx="138" cy="458" rx="18" ry="6" stroke="currentColor" opacity="0.4" strokeWidth="1" />

      {/* Linha de alinhamento vertical */}
      <line x1="150" y1="15" x2="150" y2="480" stroke="currentColor" opacity="0.1" strokeWidth="1" strokeDasharray="2 6" />

      {/* Labels */}
      <text x="150" y="490" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">Perfil 90° — ombros e quadris alinhados</text>
    </svg>
  );
}
