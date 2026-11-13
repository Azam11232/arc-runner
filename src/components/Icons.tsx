import { useId } from 'react'

export function CoinIcon({ size = 24 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#5aa6f2" />
          <stop offset="1" stopColor="#2775ca" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15.5" fill="#dfeaf8" />
      <circle cx="16" cy="16" r="14.2" fill={`url(#${id})`} />
      <circle cx="16" cy="16" r="12.2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <text x="16" y="21.4" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="'Space Grotesk', sans-serif">
        $
      </text>
    </svg>
  )
}

export function ArcMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="9" fill="#122d45" />
      <path d="M6.5 21.5C7 13 10 7 14 7s7 6 7.5 14.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.4 21.5c.3-3.4 1.6-6.2 3.6-6.2s3.3 2.8 3.6 6.2" stroke="#59e6ff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
