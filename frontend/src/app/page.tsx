'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { WalletButton } from '@/components/wallet/WalletButton'
import { UsdcFaucetButton } from '@/components/UsdcFaucetButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { fetchLiveStats, type LiveStats } from '@/lib/api'

const BLUE       = '#0071E3'
const RED        = '#FF3B30'
const INK        = 'var(--mdd-ink)'
const MUTED      = 'var(--mdd-muted)'
const FAINT      = 'var(--mdd-faint)'
const GREEN      = '#34C759'
const GREEN_DARK = '#0A7A2D'
const BG = 'var(--mdd-bg)'

// ── Logo ──────────────────────────────────────────────────────────────
function MindDuelLogo({ size = 22 }: { size?: number }) {
  const imgSize = size + 6
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Image src="/icon-192.png" alt="MindDuel" width={imgSize} height={imgSize} style={{ borderRadius: 8 }} />
      <span style={{ fontSize: size * 0.82, fontWeight: 600, letterSpacing: -0.4, color: INK }}>MindDuel</span>
    </div>
  )
}

// ── Animated Demo Board ───────────────────────────────────────────────
type CellVal = 'X' | 'O' | null
const DEMO_SEQ: { index: number; mark: 'X' | 'O' }[] = [
  { index: 4, mark: 'X' }, { index: 0, mark: 'O' }, { index: 8, mark: 'X' },
  { index: 2, mark: 'O' }, { index: 6, mark: 'X' },
]

function DemoBoard() {
  const [board, setBoard] = useState<CellVal[]>(Array(9).fill(null))
  const step = useRef(0)
  useEffect(() => {
    const id = setInterval(() => {
      if (step.current < DEMO_SEQ.length) {
        const { index, mark } = DEMO_SEQ[step.current]
        setBoard(prev => { const next = [...prev]; next[index] = mark; return next })
        step.current++
      } else {
        step.current = 0
        setBoard(Array(9).fill(null))
      }
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {board.map((cell, i) => (
        <div key={i} style={{ aspectRatio: '1/1', borderRadius: 14, background: cell ? '#fff' : 'transparent', border: cell ? 'none' : '1.5px dashed #D1D1D6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: cell ? '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)' : 'none', transition: 'all 180ms ease' }}>
          {cell && (
            <motion.span
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              style={{ fontSize: 36, fontWeight: 700, color: cell === 'X' ? BLUE : RED, lineHeight: 1 }}
            >
              {cell}
            </motion.span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Animated Counter ──────────────────────────────────────────────────
function Counter({ to }: { to: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let cur = 0
    const step = to / 60
    const id = setInterval(() => { cur += step; if (cur >= to) { setVal(to); clearInterval(id) } else setVal(Math.floor(cur)) }, 20)
    return () => clearInterval(id)
  }, [inView, to])
  return <span ref={ref}>{val.toLocaleString()}</span>
}

// ── Feature Visuals ────────────────────────────────────────────────────
const DARK_SCENE: React.CSSProperties = {
  width: '100%', height: '100%',
  background: 'linear-gradient(145deg, #04091C 0%, #07102A 55%, #040B1C 100%)',
  position: 'relative', overflow: 'hidden',
}

function VisualSkillMoves() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v1g" cx="62%" cy="62%" r="52%">
            <stop offset="0%" stopColor="#0071E3" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#0071E3" stopOpacity="0"/>
          </radialGradient>
          <filter id="v1f"><feGaussianBlur stdDeviation="14"/></filter>
        </defs>
        <rect width="340" height="192" fill="url(#v1g)" filter="url(#v1f)"/>
        {/* TTT grid */}
        <g stroke="#1B3F80" strokeWidth="1.5" strokeLinecap="round">
          <line x1="215" y1="44" x2="215" y2="170"/>
          <line x1="260" y1="44" x2="260" y2="170"/>
          <line x1="170" y1="89" x2="305" y2="89"/>
          <line x1="170" y1="129" x2="305" y2="129"/>
        </g>
        {/* X pieces (blue) */}
        <text x="192" y="68" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="30" fontWeight="800">X</text>
        <text x="237" y="109" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="30" fontWeight="800">X</text>
        <text x="282" y="68" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="30" fontWeight="800" opacity="0.45">X</text>
        {/* O pieces (red) */}
        <text x="237" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FF6060" fontSize="30" fontWeight="800" opacity="0.8">O</text>
        <text x="192" y="149" textAnchor="middle" dominantBaseline="middle" fill="#FF6060" fontSize="30" fontWeight="800" opacity="0.55">O</text>
        {/* Placing ripple on next X spot */}
        <circle cx="282" cy="109" r="18" fill="none" stroke="#3B8AFF" strokeWidth="1.5">
          <animate attributeName="r" values="16;28;16" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        {/* Trivia question card */}
        <rect x="14" y="12" width="196" height="68" rx="13" fill="#081B30" stroke="#1B4080" strokeWidth="1.2"/>
        <text x="28" y="29" fill="#3A6AA0" fontSize="8" fontWeight="700" letterSpacing="2">TRIVIA</text>
        <text x="28" y="45" fill="#B8D5F8" fontSize="11" fontWeight="600">What is Solana&apos;s consensus?</text>
        <rect x="28" y="53" width="116" height="20" rx="6" fill="#03200E" stroke="#16A34A" strokeWidth="1"/>
        <text x="86" y="64" textAnchor="middle" dominantBaseline="middle" fill="#22C55E" fontSize="9.5" fontWeight="700">✓  Proof of History</text>
        <rect x="150" y="53" width="44" height="20" rx="6" fill="#0D1525" stroke="#1E2A42" strokeWidth="0.5"/>
        <text x="172" y="64" textAnchor="middle" dominantBaseline="middle" fill="#2E3D55" fontSize="9">PoW</text>
        {/* CORRECT badge */}
        <rect x="14" y="90" width="80" height="22" rx="7" fill="#03200E" stroke="#16A34A" strokeWidth="1">
          <animate attributeName="opacity" values="1;0.5;1" dur="2.8s" repeatCount="indefinite"/>
        </rect>
        <text x="54" y="102" textAnchor="middle" dominantBaseline="middle" fill="#22C55E" fontSize="10" fontWeight="700">✓ CORRECT!</text>
        {/* Your turn chip */}
        <rect x="14" y="162" width="82" height="20" rx="7" fill="#081830" stroke="#1A3870" strokeWidth="1"/>
        <text x="55" y="173" textAnchor="middle" dominantBaseline="middle" fill="#3A6AA0" fontSize="9" fontWeight="600">YOUR TURN</text>
      </svg>
    </div>
  )
}

function VisualTrustlessEscrow() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v2g" cx="50%" cy="52%" r="48%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
          </radialGradient>
          <filter id="v2f"><feGaussianBlur stdDeviation="16"/></filter>
          <linearGradient id="v2lock" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9D5FFF"/>
            <stop offset="100%" stopColor="#5B21B6"/>
          </linearGradient>
        </defs>
        <rect width="340" height="192" fill="url(#v2g)" filter="url(#v2f)"/>
        {/* Outer pulse rings */}
        <circle cx="170" cy="108" r="52" fill="none" stroke="#7C3AED" strokeWidth="1">
          <animate attributeName="r" values="48;62;48" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="170" cy="108" r="66" fill="none" stroke="#7C3AED" strokeWidth="0.5">
          <animate attributeName="r" values="64;76;64" dur="3s" begin="0.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" begin="0.6s" repeatCount="indefinite"/>
        </circle>
        {/* Padlock body */}
        <rect x="148" y="100" width="44" height="38" rx="9" fill="url(#v2lock)"/>
        {/* Shackle */}
        <path d="M158 100 L158 87 Q170 74 182 87 L182 100" stroke="#A78BFA" strokeWidth="5" fill="none" strokeLinecap="round"/>
        {/* Keyhole */}
        <circle cx="170" cy="116" r="5.5" fill="#04091C"/>
        <rect x="167.5" y="116" width="5" height="9" rx="1.5" fill="#04091C"/>
        {/* Left coin */}
        <circle cx="68" cy="98" r="20" fill="#120830" stroke="#7C3AED" strokeWidth="1.5"/>
        <text x="68" y="99" textAnchor="middle" dominantBaseline="middle" fill="#A855F7" fontSize="15" fontWeight="700">◎</text>
        <text x="68" y="128" textAnchor="middle" fill="#4A2A70" fontSize="8.5" fontWeight="600">0.05 SOL</text>
        {/* Right coin */}
        <circle cx="272" cy="98" r="20" fill="#120830" stroke="#7C3AED" strokeWidth="1.5"/>
        <text x="272" y="99" textAnchor="middle" dominantBaseline="middle" fill="#A855F7" fontSize="15" fontWeight="700">◎</text>
        <text x="272" y="128" textAnchor="middle" fill="#4A2A70" fontSize="8.5" fontWeight="600">0.05 SOL</text>
        {/* Flowing dashes toward lock */}
        <line x1="96" y1="102" x2="140" y2="110" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6">
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.2s" repeatCount="indefinite"/>
        </line>
        <line x1="244" y1="102" x2="200" y2="110" stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6">
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.2s" repeatCount="indefinite"/>
        </line>
        {/* PDA label */}
        <rect x="116" y="153" width="108" height="22" rx="7" fill="#0F0525" stroke="#5B21B6" strokeWidth="1"/>
        <text x="170" y="165" textAnchor="middle" dominantBaseline="middle" fill="#9D5FFF" fontSize="9.5" fontWeight="700">🔐  PROGRAM PDA</text>
        {/* Badges */}
        <rect x="12" y="14" width="96" height="21" rx="7" fill="#0A0220" stroke="#4C1D95" strokeWidth="1"/>
        <text x="60" y="26" textAnchor="middle" dominantBaseline="middle" fill="#7C3AED" fontSize="9" fontWeight="700">◎ NO RUG PULLS</text>
        <rect x="232" y="14" width="96" height="21" rx="7" fill="#0A0220" stroke="#4C1D95" strokeWidth="1"/>
        <text x="280" y="26" textAnchor="middle" dominantBaseline="middle" fill="#7C3AED" fontSize="9" fontWeight="700">TRUSTLESS ✓</text>
      </svg>
    </div>
  )
}

function VisualInstantSettlement() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v3g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0"/>
          </radialGradient>
          <filter id="v3f"><feGaussianBlur stdDeviation="15"/></filter>
          <linearGradient id="v3trail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0"/>
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8"/>
          </linearGradient>
        </defs>
        <rect width="340" height="192" fill="url(#v3g)" filter="url(#v3f)"/>
        {/* Subtle horizontal speed lines */}
        <line x1="0" y1="82" x2="340" y2="82" stroke="#071E28" strokeWidth="1"/>
        <line x1="0" y1="96" x2="340" y2="96" stroke="#071E28" strokeWidth="0.5"/>
        <line x1="0" y1="110" x2="340" y2="110" stroke="#071E28" strokeWidth="1"/>
        {/* Sender wallet */}
        <rect x="14" y="70" width="74" height="52" rx="13" fill="#071B24" stroke="#0A3D50" strokeWidth="1.5"/>
        <text x="51" y="88" textAnchor="middle" fill="#0E6070" fontSize="8" fontWeight="700" letterSpacing="0.8">SENDER</text>
        <text x="51" y="106" textAnchor="middle" fill="#0EA5C2" fontSize="11.5" fontWeight="700">0x44…</text>
        {/* Winner wallet */}
        <rect x="252" y="70" width="74" height="52" rx="13" fill="#071B24" stroke="#0A3D50" strokeWidth="1.5"/>
        <text x="289" y="88" textAnchor="middle" fill="#0E6070" fontSize="8" fontWeight="700" letterSpacing="0.8">WINNER</text>
        <text x="289" y="106" textAnchor="middle" fill="#0EA5C2" fontSize="11.5" fontWeight="700">0x9f…</text>
        {/* Speed trail */}
        <rect x="96" y="92" width="90" height="8" rx="4" fill="url(#v3trail)" opacity="0.5"/>
        {/* Moving SOL coin */}
        <g>
          <circle cx="200" cy="96" r="21" fill="#071E2A" stroke="#06B6D4" strokeWidth="1.8"/>
          <text x="200" y="97" textAnchor="middle" dominantBaseline="middle" fill="#06B6D4" fontSize="17" fontWeight="800">◎</text>
          <animateTransform attributeName="transform" type="translate" values="-116,0;0,0;0,0;0,0" dur="2.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.45;0.7;1" keySplines="0.25 0 0.75 1;0 0 1 1;0 0 1 1"/>
        </g>
        {/* 400ms badge */}
        <rect x="120" y="130" width="100" height="34" rx="11" fill="#04141E" stroke="#06B6D4" strokeWidth="1.5"/>
        <text x="170" y="142" textAnchor="middle" fill="#4A8A98" fontSize="8" fontWeight="600" letterSpacing="1">FINALITY</text>
        <text x="170" y="157" textAnchor="middle" fill="#22D3EE" fontSize="14" fontWeight="800">400ms FAST</text>
        {/* Settled pill — blinks in after coin arrives */}
        <rect x="220" y="138" width="82" height="20" rx="7" fill="#03200E" stroke="#16A34A" strokeWidth="1">
          <animate attributeName="opacity" values="0;0;1;1;0" dur="2.2s" repeatCount="indefinite" keyTimes="0;0.5;0.55;0.95;1"/>
        </rect>
        <text x="261" y="149" textAnchor="middle" dominantBaseline="middle" fill="#22C55E" fontSize="9.5" fontWeight="700">✓ SETTLED</text>
        {/* Top chips */}
        <rect x="14" y="16" width="108" height="21" rx="7" fill="#071822" stroke="#0A3040" strokeWidth="1"/>
        <text x="68" y="28" textAnchor="middle" dominantBaseline="middle" fill="#1C7090" fontSize="9" fontWeight="600">Solana · 65,000 TPS</text>
        <rect x="218" y="16" width="108" height="21" rx="7" fill="#03200E" stroke="#14532D" strokeWidth="1"/>
        <text x="272" y="28" textAnchor="middle" dominantBaseline="middle" fill="#22C55E" fontSize="9" fontWeight="600">+0.095 SOL 🎉</text>
      </svg>
    </div>
  )
}

function VisualAchievementNFTs() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v4g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </radialGradient>
          <filter id="v4f"><feGaussianBlur stdDeviation="16"/></filter>
          <linearGradient id="v4card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1C1006"/>
            <stop offset="100%" stopColor="#0D0806"/>
          </linearGradient>
          <linearGradient id="v4hdr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1A0E00"/>
            <stop offset="100%" stopColor="#2A1800"/>
          </linearGradient>
        </defs>
        <rect width="340" height="192" fill="url(#v4g)" filter="url(#v4f)"/>
        {/* NFT card, slightly tilted */}
        <g transform="rotate(-4, 170, 96)">
          <rect x="112" y="14" width="116" height="154" rx="16" fill="url(#v4card)" stroke="#78350F" strokeWidth="1.5"/>
          <rect x="112" y="14" width="116" height="84" rx="16" fill="url(#v4hdr)"/>
          <rect x="112" y="84" width="116" height="14" fill="url(#v4hdr)"/>
          {/* Trophy SVG */}
          <g transform="translate(144,38)">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M26 9h1.5a2.5 2.5 0 0 0 0-5H26M4 30h24M14 20.66V24c0 .55-.47.98-.97 1.21C11.85 25.75 11 27.24 11 30M18 20.66V24c0 .55.47.98.97 1.21C20.15 25.75 21 27.24 21 30M26 2H6v10a10 10 0 0 0 20 0V2Z" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          {/* Card labels */}
          <text x="170" y="110" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="800" letterSpacing="0.5">LEGENDARY</text>
          <text x="170" y="126" textAnchor="middle" fill="#78350F" fontSize="8.5" fontWeight="600">MIND DUEL · #0847</text>
          {/* Soulbound pill */}
          <rect x="134" y="140" width="72" height="18" rx="6" fill="#0D0806" stroke="#78350F" strokeWidth="1"/>
          <text x="170" y="150" textAnchor="middle" dominantBaseline="middle" fill="#92400E" fontSize="8.5" fontWeight="700">🔒 SOULBOUND</text>
        </g>
        {/* Sparkles */}
        {[[54,36,14],[296,28,11],[46,148,12],[302,152,13],[76,96,9],[268,90,10]].map(([x,y,sz],i)=>(
          <g key={i}>
            <animate attributeName="opacity" values="0.8;0.15;0.8" dur={`${1.4+i*0.35}s`} repeatCount="indefinite"/>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#F59E0B" fontSize={sz}>✦</text>
          </g>
        ))}
        {/* Win streak */}
        <rect x="12" y="68" width="88" height="30" rx="10" fill="#1A0800" stroke="#D97706" strokeWidth="1.2"/>
        <text x="56" y="79" textAnchor="middle" fill="#FB923C" fontSize="8.5" fontWeight="700">WIN STREAK</text>
        <text x="56" y="92" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="800">× 5</text>
        {/* Wallet chip */}
        <rect x="240" y="162" width="88" height="20" rx="7" fill="#0A0600" stroke="#3A2000" strokeWidth="1"/>
        <text x="284" y="173" textAnchor="middle" dominantBaseline="middle" fill="#6B3A0A" fontSize="8.5" fontWeight="600">Wallet: 0x44…</text>
      </svg>
    </div>
  )
}

function VisualHintSystem() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v5g" cx="50%" cy="42%" r="48%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </radialGradient>
          <filter id="v5f"><feGaussianBlur stdDeviation="14"/></filter>
        </defs>
        <rect width="340" height="192" fill="url(#v5g)" filter="url(#v5f)"/>
        {/* Question card header */}
        <rect x="22" y="10" width="296" height="46" rx="12" fill="#071E14" stroke="#134E38" strokeWidth="1.2"/>
        <text x="170" y="24" textAnchor="middle" fill="#065F46" fontSize="8" fontWeight="700" letterSpacing="1.5">QUESTION #3</text>
        <text x="170" y="40" textAnchor="middle" fill="#A7F3D0" fontSize="11" fontWeight="600">Which language for Solana programs?</text>
        {/* Option A - eliminated */}
        <rect x="22" y="68" width="138" height="32" rx="9" fill="#180A0A" stroke="#4A1A1A" strokeWidth="1" opacity="0.7"/>
        <text x="91" y="85" textAnchor="middle" dominantBaseline="middle" fill="#5A2828" fontSize="11" fontWeight="600">A.  JavaScript</text>
        <line x1="30" y1="84" x2="152" y2="84" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
        {/* Option B - eliminated */}
        <rect x="180" y="68" width="138" height="32" rx="9" fill="#180A0A" stroke="#4A1A1A" strokeWidth="1" opacity="0.7"/>
        <text x="249" y="85" textAnchor="middle" dominantBaseline="middle" fill="#5A2828" fontSize="11" fontWeight="600">B.  Python</text>
        <line x1="188" y1="84" x2="310" y2="84" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
        {/* Option C - correct (highlighted) */}
        <rect x="22" y="112" width="138" height="32" rx="9" fill="#04200F" stroke="#16A34A" strokeWidth="1.5"/>
        <text x="91" y="129" textAnchor="middle" dominantBaseline="middle" fill="#22C55E" fontSize="11" fontWeight="700">C.  Rust ✓</text>
        {/* Option D - neutral */}
        <rect x="180" y="112" width="138" height="32" rx="9" fill="#0A1410" stroke="#1A3020" strokeWidth="1"/>
        <text x="249" y="129" textAnchor="middle" dominantBaseline="middle" fill="#2A4030" fontSize="11">D.  C++</text>
        {/* Hint cost badge */}
        <rect x="22" y="158" width="108" height="24" rx="8" fill="#041A0E" stroke="#10B981" strokeWidth="1.2">
          <animate attributeName="opacity" values="1;0.55;1" dur="2.6s" repeatCount="indefinite"/>
        </rect>
        <text x="76" y="171" textAnchor="middle" dominantBaseline="middle" fill="#10B981" fontSize="9.5" fontWeight="700">◎ 0.001 SOL hint</text>
        {/* Eliminated badge */}
        <rect x="210" y="158" width="110" height="24" rx="8" fill="#1A0808" stroke="#EF4444" strokeWidth="1"/>
        <text x="265" y="171" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="9.5" fontWeight="700">✕ × 2 eliminated</text>
      </svg>
    </div>
  )
}

function VisualDramaScore() {
  return (
    <div style={DARK_SCENE}>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="192" viewBox="0 0 340 192" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="v6g" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
          </radialGradient>
          <filter id="v6f"><feGaussianBlur stdDeviation="14"/></filter>
          <linearGradient id="v6arc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6"/>
            <stop offset="45%" stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#EF4444"/>
          </linearGradient>
        </defs>
        <rect width="340" height="192" fill="url(#v6g)" filter="url(#v6f)"/>
        {/* Gauge track */}
        <path d="M 76 160 A 94 94 0 0 1 264 160" stroke="#160808" strokeWidth="18" fill="none" strokeLinecap="round"/>
        {/* Gauge fill — 9.8/10 (arc length ~295, show ~289) */}
        <path d="M 76 160 A 94 94 0 0 1 264 160" stroke="url(#v6arc)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="295" strokeDashoffset="7"/>
        {/* Tick marks */}
        {Array.from({length:11},(_,i)=>{
          const ang = Math.PI - (i/10)*Math.PI
          const cx=170,cy=160,r1=100,r2=90
          return <line key={i} x1={cx+r1*Math.cos(ang)} y1={cy-r1*Math.sin(ang)} x2={cx+r2*Math.cos(ang)} y2={cy-r2*Math.sin(ang)} stroke="#2A1010" strokeWidth="2"/>
        })}
        {/* Needle pointing to ~9.8 (rotate 86° from straight up) */}
        <g transform="rotate(85, 170, 160)">
          <line x1="170" y1="160" x2="170" y2="72" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <circle cx="170" cy="160" r="9" fill="#140808" stroke="#EF4444" strokeWidth="2.5"/>
        <circle cx="170" cy="160" r="4.5" fill="#EF4444"/>
        {/* Score display */}
        <text x="170" y="128" textAnchor="middle" fill="#EF4444" fontSize="34" fontWeight="800" letterSpacing="-1.5">9.8</text>
        <text x="170" y="146" textAnchor="middle" fill="#6A2020" fontSize="9" fontWeight="600">/ 10 DRAMA</text>
        {/* Flames at gauge ends — SVG flame paths */}
        <g opacity="0.5" transform="translate(49,150)">
          <path d="M11 21c-4.5 0-8-3-8-7 0-3.5 2.5-5.8 4.5-7 0 2.2 1.2 3 1.2 3C9 8 10 5.5 10 3c2.5 1.8 6 4.8 6 8.5 0 1-.2 2-.7 2.8.7-.9 1.2-2 1.2-3.3 0 0 1.3 1.3 1.3 4 0 3.5-3.2 6-6.8 6z" fill="#EF4444"/>
        </g>
        <g transform="translate(269,149)">
          <animate attributeName="opacity" values="1;0.6;1" dur="1.4s" repeatCount="indefinite"/>
          <path d="M11 21c-4.5 0-8-3-8-7 0-3.5 2.5-5.8 4.5-7 0 2.2 1.2 3 1.2 3C9 8 10 5.5 10 3c2.5 1.8 6 4.8 6 8.5 0 1-.2 2-.7 2.8.7-.9 1.2-2 1.2-3.3 0 0 1.3 1.3 1.3 4 0 3.5-3.2 6-6.8 6z" fill="#EF4444"/>
        </g>
        {/* Scale labels */}
        <text x="52" y="178" textAnchor="middle" fill="#1A3060" fontSize="8.5" fontWeight="600">LOW</text>
        <text x="170" y="185" textAnchor="middle" fill="#4A3010" fontSize="8.5" fontWeight="600">MED</text>
        <text x="288" y="178" textAnchor="middle" fill="#5A1010" fontSize="8.5" fontWeight="600">EPIC</text>
        {/* NFT unlock badge */}
        <rect x="220" y="12" width="108" height="22" rx="7" fill="#1A0808" stroke="#EF4444" strokeWidth="1">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
        </rect>
        <text x="274" y="24" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="9" fontWeight="700">🎖 NFT UNLOCKED</text>
        {/* Comeback chip */}
        <rect x="12" y="12" width="108" height="22" rx="7" fill="#1A0808" stroke="#7F1D1D" strokeWidth="1"/>
        <text x="66" y="24" textAnchor="middle" dominantBaseline="middle" fill="#DC2626" fontSize="9" fontWeight="600">🎭 EPIC COMEBACK</text>
      </svg>
    </div>
  )
}

// ── Feature icon set (Apple SF-style stroked SVGs) ────────────────────
function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5"/>
      <circle cx="10" cy="10" r="3.5"/>
      <line x1="10" y1="1" x2="10" y2="5.5"/>
      <line x1="10" y1="14.5" x2="10" y2="19"/>
      <line x1="1" y1="10" x2="5.5" y2="10"/>
      <line x1="14.5" y1="10" x2="19" y2="10"/>
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="9" width="13" height="10" rx="2.5"/>
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
      <circle cx="10" cy="14.5" r="1.3" fill={BLUE} stroke="none"/>
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4.5 11H10L8.5 18.5L16 9.5H10.5L12 2z"/>
    </svg>
  )
}
function IconMedal() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8" r="5.5"/>
      <path d="M6.2 12.5L4 18.5l6-2.5 6 2.5-2.2-6"/>
    </svg>
  )
}
function IconBulb() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2a6 6 0 0 1 4.2 10.2c-.6.6-.9 1.3-.9 2V15H6.7v-.8c0-.7-.3-1.4-.9-2A6 6 0 0 1 10 2z"/>
      <line x1="7.5" y1="17.5" x2="12.5" y2="17.5"/>
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={BLUE} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="11" width="4" height="7" rx="1.2"/>
      <rect x="8" y="6" width="4" height="12" rx="1.2"/>
      <rect x="14" y="2.5" width="4" height="15.5" rx="1.2"/>
    </svg>
  )
}

// ── Feature card with illustration ────────────────────────────────────
function FeatureCard({ visual, icon, title, desc, delay }: {
  visual: React.ReactNode; icon: React.ReactNode; title: string; desc: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className="glass-panel glass-shimmer"
      style={{
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 192, position: 'relative', overflow: 'hidden' }}>{visual}</div>
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#E5F0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: INK, margin: 0, letterSpacing: -0.3 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.56, margin: 0 }}>{desc}</p>
      </div>
    </motion.div>
  )
}

// ── Mode Visuals ──────────────────────────────────────────────────────
function ModeVisualClassic() {
  return (
    <svg style={{ display: 'block' }} width="100%" height="160" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="mc1" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#0D2A5A" stopOpacity="1"/>
          <stop offset="100%" stopColor="#04091C" stopOpacity="1"/>
        </radialGradient>
        <filter id="mc1g"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <rect width="480" height="160" fill="url(#mc1)"/>
      <ellipse cx="240" cy="110" rx="140" ry="70" fill="#0060D0" opacity="0.22" filter="url(#mc1g)"/>
      {/* Board */}
      <g stroke="#1A3F80" strokeWidth="1.5" strokeLinecap="round">
        <line x1="212" y1="28" x2="212" y2="132"/>
        <line x1="268" y1="28" x2="268" y2="132"/>
        <line x1="156" y1="66" x2="324" y2="66"/>
        <line x1="156" y1="104" x2="324" y2="104"/>
      </g>
      {/* Pieces */}
      <text x="184" y="49" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="28" fontWeight="800">X</text>
      <text x="240" y="49" textAnchor="middle" dominantBaseline="middle" fill="#FF6060" fontSize="28" fontWeight="800" opacity="0.9">O</text>
      <text x="240" y="86" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="28" fontWeight="800">X</text>
      <text x="296" y="86" textAnchor="middle" dominantBaseline="middle" fill="#FF6060" fontSize="28" fontWeight="800" opacity="0.8">O</text>
      <g>
        <animate attributeName="opacity" values="0;1;1" dur="2s" repeatCount="indefinite"/>
        <text x="296" y="122" textAnchor="middle" dominantBaseline="middle" fill="#3B8AFF" fontSize="28" fontWeight="800">X</text>
      </g>
      {/* Win line */}
      <line x1="184" y1="49" x2="296" y2="122" stroke="#3B8AFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
      {/* Ripple */}
      <circle cx="296" cy="122" r="18" fill="none" stroke="#3B8AFF" strokeWidth="1.5">
        <animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
      </circle>
      {/* SOL wager badge */}
      <rect x="18" y="16" width="90" height="22" rx="7" fill="rgba(0,0,0,0.4)" stroke="#1A3F80" strokeWidth="1"/>
      <text x="63" y="28" textAnchor="middle" dominantBaseline="middle" fill="#60A5FA" fontSize="9.5" fontWeight="600">◎ 0.05 SOL</text>
      {/* VS badge */}
      <rect x="374" y="16" width="88" height="22" rx="7" fill="rgba(0,0,0,0.4)" stroke="#1A3F80" strokeWidth="1"/>
      <text x="418" y="28" textAnchor="middle" dominantBaseline="middle" fill="#60A5FA" fontSize="9.5" fontWeight="600">1v1 DUEL</text>
    </svg>
  )
}

function ModeVisualShifting() {
  return (
    <svg style={{ display: 'block' }} width="100%" height="160" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="ms1" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#2A1500" stopOpacity="1"/>
          <stop offset="100%" stopColor="#04091C" stopOpacity="1"/>
        </radialGradient>
        <filter id="ms1g"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <rect width="480" height="160" fill="url(#ms1)"/>
      <ellipse cx="240" cy="100" rx="130" ry="65" fill="#C05000" opacity="0.2" filter="url(#ms1g)"/>
      {/* Board grid */}
      <g stroke="#4A2800" strokeWidth="1.5" strokeLinecap="round">
        <line x1="212" y1="20" x2="212" y2="140"/>
        <line x1="268" y1="20" x2="268" y2="140"/>
        <line x1="156" y1="60" x2="324" y2="60"/>
        <line x1="156" y1="100" x2="324" y2="100"/>
      </g>
      {/* Pieces */}
      <text x="184" y="42" textAnchor="middle" dominantBaseline="middle" fill="#FB923C" fontSize="24" fontWeight="800">X</text>
      <text x="240" y="42" textAnchor="middle" dominantBaseline="middle" fill="#FB6060" fontSize="24" fontWeight="800" opacity="0.85">O</text>
      <text x="240" y="80" textAnchor="middle" dominantBaseline="middle" fill="#FB923C" fontSize="24" fontWeight="800" opacity="0.7">X</text>
      {/* Row shift arrows */}
      <g fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
        <path d="M330 42 L350 42"><animate attributeName="stroke-dashoffset" values="0;-16" dur="1.2s" repeatCount="indefinite"/></path>
        <path d="M342 36 L350 42 L342 48"/>
        <path d="M150 80 L130 80"><animate attributeName="stroke-dashoffset" values="0;-16" dur="1.2s" begin="0.4s" repeatCount="indefinite"/></path>
        <path d="M138 74 L130 80 L138 86"/>
        <path d="M330 120 L350 120"><animate attributeName="stroke-dashoffset" values="0;-16" dur="1.2s" begin="0.8s" repeatCount="indefinite"/></path>
        <path d="M342 114 L350 120 L342 126"/>
      </g>
      {/* "SHIFTS EVERY 3 ROUNDS" label */}
      <rect x="140" y="136" width="200" height="18" rx="6" fill="rgba(0,0,0,0.5)" stroke="#4A2800" strokeWidth="1"/>
      <text x="240" y="146" textAnchor="middle" dominantBaseline="middle" fill="#FB923C" fontSize="9" fontWeight="600" letterSpacing="0.5">SHIFTS EVERY 3 ROUNDS</text>
      <rect x="18" y="16" width="88" height="22" rx="7" fill="rgba(0,0,0,0.4)" stroke="#4A2800" strokeWidth="1"/>
      <text x="62" y="28" textAnchor="middle" dominantBaseline="middle" fill="#FB923C" fontSize="9.5" fontWeight="600">DYNAMIC BOARD</text>
    </svg>
  )
}

function ModeVisualScaleUp() {
  return (
    <svg style={{ display: 'block' }} width="100%" height="160" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="msu1" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#1A0505" stopOpacity="1"/>
          <stop offset="100%" stopColor="#04091C" stopOpacity="1"/>
        </radialGradient>
        <filter id="msu1g"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <rect width="480" height="160" fill="url(#msu1)"/>
      <ellipse cx="260" cy="100" rx="130" ry="65" fill="#A00000" opacity="0.2" filter="url(#msu1g)"/>
      {/* 3×3 board (small, left) */}
      <g stroke="#4A1010" strokeWidth="1.2" opacity="0.8">
        <line x1="116" y1="30" x2="116" y2="110"/>
        <line x1="140" y1="30" x2="140" y2="110"/>
        <line x1="92" y1="56" x2="164" y2="56"/>
        <line x1="92" y1="82" x2="164" y2="82"/>
      </g>
      <text x="104" y="44" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="16" fontWeight="700" opacity="0.7">X</text>
      <text x="128" y="70" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="16" fontWeight="700" opacity="0.7">O</text>
      {/* Arrow */}
      <text x="188" y="72" textAnchor="middle" dominantBaseline="middle" fill="#6B1A1A" fontSize="18" fontWeight="700">→</text>
      {/* 4×4 board (medium, center) */}
      <g stroke="#6B2020" strokeWidth="1.3" opacity="0.9">
        <line x1="224" y1="22" x2="224" y2="118"/>
        <line x1="252" y1="22" x2="252" y2="118"/>
        <line x1="280" y1="22" x2="280" y2="118"/>
        <line x1="196" y1="50" x2="308" y2="50"/>
        <line x1="196" y1="78" x2="308" y2="78"/>
        <line x1="196" y1="106" x2="308" y2="106"/>
      </g>
      <text x="210" y="37" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="14" fontWeight="700">X</text>
      <text x="238" y="65" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="14" fontWeight="700">O</text>
      <text x="266" y="93" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="14" fontWeight="700">X</text>
      {/* Arrow */}
      <text x="334" y="72" textAnchor="middle" dominantBaseline="middle" fill="#6B1A1A" fontSize="18" fontWeight="700">→</text>
      {/* 5×5 indicator (right edge, partially visible) */}
      <g stroke="#A03030" strokeWidth="1.4">
        <line x1="368" y1="16" x2="368" y2="140"/>
        <line x1="392" y1="16" x2="392" y2="140"/>
        <line x1="416" y1="16" x2="416" y2="140"/>
        <line x1="440" y1="16" x2="440" y2="140"/>
        <line x1="356" y1="40" x2="462" y2="40"/>
        <line x1="356" y1="64" x2="462" y2="64"/>
        <line x1="356" y1="88" x2="462" y2="88"/>
        <line x1="356" y1="112" x2="462" y2="112"/>
      </g>
      <text x="380" y="52" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="12" fontWeight="700">X</text>
      <text x="404" y="76" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="12" fontWeight="700">O</text>
      {/* Labels */}
      <text x="128" y="128" textAnchor="middle" fill="#6B2020" fontSize="9" fontWeight="700">3×3</text>
      <text x="252" y="128" textAnchor="middle" fill="#8B3030" fontSize="9" fontWeight="700">4×4</text>
      <text x="410" y="128" textAnchor="middle" fill="#A03030" fontSize="9" fontWeight="700">5×5</text>
      <rect x="18" y="16" width="60" height="22" rx="7" fill="rgba(0,0,0,0.5)" stroke="#5A1010" strokeWidth="1"/>
      <text x="48" y="28" textAnchor="middle" dominantBaseline="middle" fill="#F87171" fontSize="9.5" fontWeight="600">EVOLVING</text>
    </svg>
  )
}

function ModeVisualBlitz() {
  return (
    <svg style={{ display: 'block' }} width="100%" height="160" viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="mb1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1A0505" stopOpacity="1"/>
          <stop offset="100%" stopColor="#04091C" stopOpacity="1"/>
        </radialGradient>
        <filter id="mb1g"><feGaussianBlur stdDeviation="20"/></filter>
      </defs>
      <rect width="480" height="160" fill="url(#mb1)"/>
      <ellipse cx="240" cy="90" rx="110" ry="60" fill="#CC0000" opacity="0.25" filter="url(#mb1g)"/>
      {/* Timer display */}
      <rect x="148" y="28" width="184" height="80" rx="16" fill="rgba(0,0,0,0.5)" stroke="#4A0808" strokeWidth="1.5"/>
      <text x="240" y="58" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600" letterSpacing="2" opacity="0.7">TIME LEFT</text>
      <g>
        <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
        <text x="240" y="97" textAnchor="middle" fill="#EF4444" fontSize="42" fontWeight="800" letterSpacing="-2" fontFamily="ui-monospace,monospace">00:05</text>
      </g>
      {/* Urgency tick marks */}
      {[0,1,2,3,4,5,6,7,8,9].map((i)=>(
        <rect key={i} x={148 + i*20} y={118} width="12" height="8" rx="2"
          fill={i < 4 ? '#EF4444' : '#2A0808'}
          opacity={i < 4 ? 1 : 0.5}
        />
      ))}
      {/* Warning label */}
      <rect x="18" y="16" width="72" height="22" rx="7" fill="rgba(0,0,0,0.5)" stroke="#5A0808" strokeWidth="1"/>
      <text x="54" y="28" textAnchor="middle" dominantBaseline="middle" fill="#EF4444" fontSize="9.5" fontWeight="700">BLITZ</text>
      {/* "NO MERCY" badge */}
      <rect x="372" y="16" width="90" height="22" rx="7" fill="rgba(0,0,0,0.5)" stroke="#5A0808" strokeWidth="1"/>
      <text x="417" y="28" textAnchor="middle" dominantBaseline="middle" fill="#EF4444" fontSize="9.5" fontWeight="700">5s / ANSWER</text>
      {/* Bottom text */}
      <text x="240" y="148" textAnchor="middle" fill="#5A1010" fontSize="10" fontWeight="600" letterSpacing="1">ANSWER OR LOSE YOUR TURN</text>
    </svg>
  )
}

// ── Mode Card (redesigned with visual) ────────────────────────────────
function ModeCard({ visual, name, desc, tag, tagBg, tagColor, available, accentColor, delay = 0 }: {
  visual: React.ReactNode; name: string; desc: string
  tag: string; tagBg: string; tagColor: string
  available: boolean; accentColor: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className="glass-panel"
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        opacity: available ? 1 : 0.72,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Visual */}
      <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {visual}
        {!available && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,9,28,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', border: '0.5px solid rgba(255,255,255,0.15)', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>COMING SOON</span>
          </div>
        )}
      </div>

      {/* Content — column flex so the CTA pins to the bottom regardless of description length */}
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, margin: 0, letterSpacing: -0.3 }}>{name}</h3>
          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, background: tagBg, color: tagColor }}>{tag}</span>
        </div>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: 0 }}>{desc}</p>
        {available ? (
          <Link href="/lobby" style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accentColor, borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: `0 3px 10px ${accentColor}44` }}>
              Play Now
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10"/></svg>
            </div>
          </Link>
        ) : (
          <div style={{ fontSize: 12, color: FAINT, fontWeight: 500, marginTop: 'auto', paddingTop: 16 }}>In development — drops soon</div>
        )}
      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)

  useEffect(() => {
    fetchLiveStats().then(s => setLiveStats(s)).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", color: INK }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="lp-nav-inner" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <MindDuelLogo size={22} />
          <div className="lp-nav-right" style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {/* Links — hidden on mobile */}
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <a href="#how" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>How It Works</a>
              <a href="#modes" style={{ fontSize: 13, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>Game Modes</a>
            </div>
            <ThemeToggle />
            <WalletButton />
            {/* Play Now — always visible */}
            <Link href="/lobby" className="lp-play-now">
              <button style={{ appearance: 'none', border: 'none', background: BLUE, color: '#fff', padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,113,227,0.22)', whiteSpace: 'nowrap' }}>
                Play Now
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="lp-hero" style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 28px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--mdd-card)', borderRadius: 999, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)', alignSelf: 'flex-start' }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: GREEN }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Solana · PvP · On-Chain</span>
          </div>

          <div>
            <h1 className="lp-hero-h1" style={{ fontSize: 58, fontWeight: 700, letterSpacing: -2, lineHeight: 1.04, margin: 0 }}>
              Prove Your Mind.<br />
              <span style={{ color: BLUE }}>Win On-Chain.</span>
            </h1>
          </div>

          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.55, margin: 0, maxWidth: 440 }}>
            Trivia-gated Tic Tac Toe with real SOL at stake. Answer correctly to move. Think fast. Win bigger.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/lobby">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ appearance: 'none', border: 'none', padding: '14px 28px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(0,113,227,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                ▶ Start Playing
              </motion.button>
            </Link>
            <a href="#how" style={{ textDecoration: 'none' }}>
              <button style={{ appearance: 'none', border: '1.5px solid rgba(0,0,0,0.10)', padding: '14px 24px', background: 'var(--mdd-card)', color: INK, borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                How It Works
              </button>
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: FAINT }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: GREEN }} />Built on Solana</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: BLUE }} />Zero custody</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: '#AF52DE' }} />Instant settle</div>
          </div>

          {/* Mock USDC faucet — promotional CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <UsdcFaucetButton variant="pill" />
            <span style={{ fontSize: 11.5, color: FAINT, lineHeight: 1.4, maxWidth: 360 }}>
              Devnet only · Use Mock USDC to try staking without spending real tokens.
            </span>
          </div>
        </motion.div>

        {/* Demo board — hidden on mobile */}
        <motion.div
          className="lp-hero-demo"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ background: 'var(--mdd-card)', borderRadius: 24, padding: 24, boxShadow: '0 4px 32px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.05)', maxWidth: 340, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: '#E5F0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: BLUE }}>X</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Player X</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: GREEN, background: '#E8F7EE', padding: '3px 8px', borderRadius: 999 }}>LIVE DEMO</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Player O</span>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: '#FFE5E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: RED }}>O</div>
              </div>
            </div>
            <DemoBoard />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: MUTED, fontWeight: 500 }}>
              <span>Pot</span>
              <span style={{ color: GREEN_DARK, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>0.200 SOL</span>
              <span>Devnet</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--mdd-card)', borderTop: '0.5px solid rgba(0,0,0,0.06)', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div className="lp-stats" style={{ maxWidth: 1120, margin: '0 auto', padding: '28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
          {([
            { label: 'Matches Settled', value: liveStats?.finishedTotal ?? null },
            { label: 'USDC Wagered (24h)', value: liveStats ? Math.round(liveStats.wageredLast24hUsdc) : null },
            { label: 'Live Matches', value: liveStats ? liveStats.activeMatches + liveStats.waitingMatches : null },
          ] as { label: string; value: number | null }[]).map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="lp-stat-num" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: INK }}>
                {s.value === null ? <span style={{ color: MUTED }}>—</span> : <Counter to={s.value} />}
              </div>
              <div className="lp-stat-lbl" style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 28px' }}>
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1.2, margin: '0 0 10px' }}>Not Just Another Game</h2>
          <p style={{ fontSize: 15, color: MUTED, margin: 0 }}>Every mechanic is trustless, skill-based, and provably fair — settled on Solana.</p>
        </motion.div>
        <div className="lp-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <FeatureCard delay={0}    visual={<VisualSkillMoves/>}        icon={<IconTarget/>}   title="Skill-Based Moves"   desc="You can only place a piece if you answer the trivia correctly. Strategy alone isn't enough." />
          <FeatureCard delay={0.08} visual={<VisualTrustlessEscrow/>}   icon={<IconLock/>}     title="Trustless Escrow"    desc="SOL is locked in a program-controlled PDA. No rug pulls — funds release automatically." />
          <FeatureCard delay={0.16} visual={<VisualInstantSettlement/>} icon={<IconZap/>}      title="Instant Settlement"  desc="Solana's 400ms finality means winners receive SOL the same moment the game ends." />
          <FeatureCard delay={0.24} visual={<VisualAchievementNFTs/>}   icon={<IconMedal/>}    title="Achievement NFTs"    desc="Win streaks mint soulbound badge NFTs to your wallet. Prove dominance on-chain, forever." />
          <FeatureCard delay={0.32} visual={<VisualHintSystem/>}        icon={<IconBulb/>}     title="Hint System"         desc="Stuck on a question? Spend micro-SOL for hints. Eliminate options, reveal categories." />
          <FeatureCard delay={0.40} visual={<VisualDramaScore/>}        icon={<IconBarChart/>} title="Drama Score"         desc="Epic comebacks and nail-biter finishes generate a drama score. High-drama games mint NFTs." />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how" style={{ background: 'var(--mdd-card)', borderTop: '0.5px solid rgba(0,0,0,0.06)', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div className="lp-how" style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>

          {/* ── Left: steps with timeline ── */}
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: BLUE, letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase' }}>Step by step</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.3, margin: '0 0 10px', lineHeight: 1.08 }}>How It Works</h2>
            <p style={{ fontSize: 15, color: MUTED, margin: '0 0 48px', lineHeight: 1.55 }}>From wallet connection to SOL in your wallet in under 5 minutes.</p>

            {/* Timeline */}
            <div style={{ position: 'relative' }}>
              {/* Connector line */}
              <div style={{ position: 'absolute', left: 21, top: 44, bottom: 24, width: 1.5, background: 'linear-gradient(to bottom, #C7DFF7 0%, #EAF3FE 100%)', zIndex: 0 }}/>

              {[
                { num: '1', title: 'Connect Your Wallet', desc: 'Phantom or Backpack. No account needed — your wallet is your identity.', active: true },
                { num: '2', title: 'Set Your Stake',      desc: 'Choose your wager. SOL is locked in escrow the moment the game starts.', active: false },
                { num: '3', title: 'Answer to Move',      desc: 'Each turn, answer a trivia question correctly to place your piece on the board.', active: false },
                { num: '4', title: 'Win & Collect',       desc: 'First to align 3 wins. Settlement is automatic — SOL lands in your wallet instantly.', active: false },
              ].map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 + i * 0.1 }}
                  style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1, marginBottom: i < 3 ? 32 : 0 }}
                >
                  {/* Step circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: s.active ? BLUE : '#fff',
                    border: `2px solid ${s.active ? BLUE : '#D1E8FB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    color: s.active ? '#fff' : BLUE,
                    boxShadow: s.active ? '0 4px 14px rgba(0,113,227,0.28)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}>{s.num}</div>

                  <div style={{ paddingTop: 9 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 5, letterSpacing: -0.2 }}>{s.title}</div>
                    <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55 }}>{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: dark terminal card ── */}
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div style={{
              background: '#04091C',
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: '0 8px 48px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(255,255,255,0.04)',
            }}>
              {/* Terminal title bar */}
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }}/>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }}/>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }}/>
                </div>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'rgba(255,255,255,0.28)', marginLeft: 8, letterSpacing: 0.2 }}>mind_duel.rs · devnet</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#28C840', animation: 'liveDotPulse 2s ease-in-out infinite' }}/>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#28C840', letterSpacing: 0.5 }}>LIVE</span>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ padding: '6px 0 6px' }}>
                {[
                  { label: 'initialize_game', desc: 'Creates PDA, locks escrow',              color: '#34D399', accent: '#064E3B' },
                  { label: 'commit_answer',   desc: 'Stores hash(answer + nonce)',             color: '#60A5FA', accent: '#1E3A5F' },
                  { label: 'reveal_answer',   desc: 'Verifies hash, executes move if correct', color: '#C084FC', accent: '#3B1F5E' },
                  { label: 'settle_game',     desc: 'Distributes pot, triggers NFT mint',      color: '#FBBF24', accent: '#451A03' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: 0.12 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '15px 20px',
                      borderBottom: i < 3 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                      borderLeft: `3px solid ${item.accent}`,
                    }}
                  >
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, fontWeight: 600, color: item.color, flexShrink: 0, minWidth: 136 }}>{item.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.16)', fontSize: 13, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>{item.desc}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── Game Modes ───────────────────────────────────────────────── */}
      <section id="modes" style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 28px' }}>
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: BLUE, letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase' }}>Multiplayer</div>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.3, margin: '0 0 10px' }}>Game Modes</h2>
          <p style={{ fontSize: 15, color: MUTED }}>Classic strategy meets dynamic chaos — all settled on-chain.</p>
        </motion.div>
        <div className="lp-modes" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <ModeCard visual={<ModeVisualClassic/>}  name="Classic Duel"   desc="Standard 3×3 Tic Tac Toe. Answer trivia to place your piece — first to align 3 wins the pot."    tag="EASY"      tagBg="#E8F7EE" tagColor={GREEN_DARK} available accentColor={BLUE} delay={0} />
          <ModeCard visual={<ModeVisualShifting/>} name="Shifting Board" desc="Every 3 rounds the board shifts — cells rotate and change position, forcing you to adapt your strategy." tag="MEDIUM"    tagBg="#FFF4E0" tagColor="#8A5A00"    available accentColor={BLUE} delay={0.1} />
          <ModeCard visual={<ModeVisualScaleUp/>}  name="Scale Up"       desc="The board grows as the game progresses: 3×3 opens, earns moves unlock 4×4, then 5×5 — more pieces, more chaos."   tag="HARD"      tagBg="#FDECEB" tagColor="#A81C13"    available accentColor={BLUE} delay={0.2} />
          <ModeCard visual={<ModeVisualBlitz/>}    name="Blitz"          desc="5 seconds to answer per turn. No extensions, no mercy. One wrong move and your opponent owns the board."            tag="INTENSE"   tagBg="#FDECEB" tagColor="#A81C13"    available accentColor={BLUE} delay={0.3} />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px 80px' }}>
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: 'var(--mdd-dark-surface)', borderRadius: 24, padding: '60px 40px', textAlign: 'center' }}
        >
          <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, color: '#fff', margin: '0 0 12px' }}>Ready to Duel?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 32px', lineHeight: 1.5 }}>
            Connect your wallet and prove your mind is worth more than your opponent&apos;s.
          </p>
          <Link href="/lobby">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ appearance: 'none', border: 'none', padding: '15px 36px', background: BLUE, color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,113,227,0.35)' }}
            >
              Start Playing Now
            </motion.button>
          </Link>
        </motion.div>
      </section>


    </div>
  )
}
