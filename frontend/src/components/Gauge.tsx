interface Props {
  /** 0-100 */
  percent: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

const ARC_LENGTH = 283; // matches the fixed path length used below

export default function Gauge({ percent, size = 200, label, sublabel = 'paid off' }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = ARC_LENGTH - (ARC_LENGTH * clamped) / 100;
  const gradientId = `gauge-gradient-${size}`;

  return (
    <svg width={size} height={size * 0.59} viewBox="0 0 220 130">
      <path
        d="M 20 110 A 90 90 0 0 1 200 110"
        fill="none"
        stroke="#1c2230"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 20 110 A 90 90 0 0 1 200 110"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={ARC_LENGTH}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2ee6b8" />
          <stop offset="100%" stopColor="#69f0c8" />
        </linearGradient>
      </defs>
      <text x="110" y="95" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="24" fontWeight="600" fill="#e9ecf3">
        {label ?? `${Math.round(clamped)}%`}
      </text>
      <text x="110" y="114" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#8d94a8">
        {sublabel}
      </text>
    </svg>
  );
}