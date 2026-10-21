import { motion } from 'framer-motion'
import { CircleOff, Hand, HandFist, Scissors, type LucideIcon } from 'lucide-react'
import { CARD_NAME } from '../game/engine'
import type { Card, Side } from '../game/types'

export const CARD_ICON: Record<Card, LucideIcon> = { rock: HandFist, scissors: Scissors, paper: Hand, null: CircleOff }

/** セットの色：あなたは White（白地に黒）、CPUは Black（黒地に白） */
const SET_STYLE: Record<Side, { face: string; back: string }> = {
  p1: { face: 'bg-[var(--white-card)] text-zinc-900 border-zinc-300', back: 'bg-[var(--white-card)] border-zinc-300' },
  cpu: { face: 'bg-[var(--black-card)] text-zinc-100 border-zinc-600', back: 'bg-[var(--black-card)] border-zinc-600' },
}

export type CardSize = 'sm' | 'md' | 'lg'
const SIZE: Record<CardSize, { box: string; icon: number; label: string }> = {
  sm: { box: 'h-[64px] w-[46px] rounded-lg', icon: 20, label: 'text-[9px]' },
  md: { box: 'h-[88px] w-[63px] rounded-xl', icon: 28, label: 'text-[10px]' },
  lg: { box: 'h-[112px] w-[80px] rounded-xl', icon: 36, label: 'text-xs' },
}

/** 札の表 */
export function CardFace({ card, side, size = 'md' }: { card: Card; side: Side; size?: CardSize }) {
  const s = SIZE[size]
  const Icon = CARD_ICON[card]
  return (
    <div
      aria-label={CARD_NAME[card]}
      className={`relative flex flex-col items-center justify-center gap-1 border-2 shadow-[0_3px_0_rgba(0,0,0,0.5)] ${s.box} ${SET_STYLE[side].face}`}
    >
      <Icon size={s.icon} strokeWidth={2.2} />
      <span className={`font-black tracking-wider ${s.label}`}>{card === 'null' ? 'NULL' : CARD_NAME[card]}</span>
    </div>
  )
}

/** 札の裏（伏せた札） */
export function CardBack({ side, size = 'md' }: { side: Side; size?: CardSize }) {
  const s = SIZE[size]
  return (
    <div aria-label="伏せた札" className={`relative flex items-center justify-center overflow-hidden border-2 shadow-[0_3px_0_rgba(0,0,0,0.5)] ${s.box} ${SET_STYLE[side].back}`}>
      <span className={`font-mono text-lg font-black ${side === 'p1' ? 'text-zinc-400' : 'text-zinc-500'}`}>∅</span>
    </div>
  )
}

/** 空き枠（まだ伏せていない場所） */
export function CardSlot({ size = 'md', label }: { size?: CardSize; label?: string }) {
  return (
    <div className={`flex items-center justify-center border-2 border-dashed border-[var(--border)] text-[10px] font-bold text-[var(--muted)] ${SIZE[size].box}`}>{label}</div>
  )
}

/** 伏せた状態から表へめくる札 */
export function FlipCard({ card, side, open, size = 'md' }: { card: Card | null; side: Side; open: boolean; size?: CardSize }) {
  return (
    <motion.div
      key={open ? `open-${card}` : 'back'}
      initial={open ? { rotateY: 90 } : false}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.25 }}
      style={{ transformPerspective: 600 }}
    >
      {open && card ? <CardFace card={card} side={side} size={size} /> : <CardBack side={side} size={size} />}
    </motion.div>
  )
}
