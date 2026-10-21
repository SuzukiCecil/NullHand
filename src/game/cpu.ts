import { cpuPairsOf } from './engine'

export { isDoubleHand } from './engine'
import { chooseGame, setGame, spreadRow } from './solver'
import type { GameState, Pair, Pick, Rng, Side } from './types'

/**
 * CPUの思考。同時に出し合うゲームなので、相手の手を読むのではなく、読まれても損をしない混ぜ方（均衡戦略）を基準にする。
 * 強さが効くのは伏せる2枚の選び方だけ。均衡戦略はもともと確率で混ぜるので、つよいでも毎回同じ組にはならない。
 */

export type Level = 'easy' | 'normal' | 'hard'
export const LEVELS: Record<Level, { label: string; note: string }> = {
  easy: { label: 'やさしい', note: 'ほぼ気まぐれ' },
  normal: { label: 'ふつう', note: 'ときどき読み違える' },
  hard: { label: 'つよい', note: '読み切って隙を見せない' },
}

/** 伏せる2枚の選び方で、均衡戦略に混ぜる「気まぐれ（一様ランダム）」の割合 */
const WHIM: Record<Level, number> = { easy: 1, normal: 0.35, hard: 0 }

const other = (s: Side): Side => (s === 'p1' ? 'cpu' : 'p1')

function sample(probs: number[], rng: Rng): number {
  let r = rng() * probs.reduce((t, p) => t + p, 0)
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r <= 0) return i
  }
  return probs.length - 1
}

const blend = (eq: number[], whim: number) => eq.map((p) => (1 - whim) * p + whim / eq.length)

/** 伏せる2枚を選ぶ。どの強さでも、同じ手の2枚（グー・グーなど）はそれしか作れないときだけ */
export function cpuSet(state: GameState, side: Side, level: Level, rng: Rng = Math.random): Pair {
  const me = state.hands[side]
  if (level === 'easy') {
    const all = cpuPairsOf(me)
    return all[Math.floor(rng() * all.length)]
  }
  const op = other(side)
  const g = setGame(me, state.hands[op], state.wins[side], state.wins[op], true)
  // 同じくらい良い組が複数あれば散らして出す（特定の札ばかり出して読まれやすくならないように）
  const eq = g.myPairs.length > 1 && g.opPairs.length > 1 ? spreadRow(g.matrix, rng) : g.row
  return g.myPairs[sample(blend(eq, WHIM[level]), rng)]
}

/**
 * 見せ合った2枚から、勝負に使う1枚を選ぶ。強さによらず共通で、均衡戦略どおりに選ぶ。
 * 片方が明らかに良ければ（グーとヌルなど）必ずそちらを選び、読み合いになる場面だけ確率で混ぜる。
 */
export function cpuChoose(state: GameState, side: Side, rng: Rng = Math.random): Pick {
  const pairs = state.pairs!
  const op = other(side)
  const g = chooseGame(state.hands[side], state.hands[op], pairs[side], pairs[op], state.wins[side], state.wins[op], true)
  return sample(g.row, rng) as Pick
}
