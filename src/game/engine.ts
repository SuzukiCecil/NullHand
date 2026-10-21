import { CARDS, MAX_ROUNDS, START_HAND, WINS_TO_WIN, type Card, type GameState, type Hand, type Outcome, type Pair, type Pick, type Side } from './types'

/**
 * NULL-HAND のルール（純粋関数）。
 * ラウンド：2枚ずつ伏せる（set）→ 同時に表にして1枚ずつ選ぶ（choose）→ 判定して4枚を除外（result）。
 */

export const CARD_NAME: Record<Card, string> = { rock: 'グー', scissors: 'チョキ', paper: 'パー', null: 'ヌル' }
export const SIDE_NAME: Record<Side, string> = { p1: 'あなた', cpu: 'CPU' }

const BEATS: Record<Exclude<Card, 'null'>, Card> = { rock: 'scissors', scissors: 'paper', paper: 'rock' }

/** a から見た勝負の結果。ヌルはグー・チョキ・パーのすべてに負け、ヌル同士と同じ手同士はあいこ */
export function judge(a: Card, b: Card): Outcome {
  if (a === b) return 'draw'
  if (a === 'null') return 'lose'
  if (b === 'null') return 'win'
  return BEATS[a] === b ? 'win' : 'lose'
}

export const handSize = (h: Hand) => CARDS.reduce((t, c) => t + h[c], 0)

/** 手札から伏せられる2枚の組（同じ種類の2枚も含む。並び順は区別しない） */
export function pairsOf(h: Hand): Pair[] {
  const out: Pair[] = []
  CARDS.forEach((a, i) => {
    CARDS.slice(i).forEach((b) => {
      if (a === b ? h[a] >= 2 : h[a] >= 1 && h[b] >= 1) out.push([a, b])
    })
  })
  return out
}

/** グー・チョキ・パーの同じ2枚（グー・グーなど） */
export const isDoubleHand = ([a, b]: Pair) => a === b && a !== 'null'

/** CPUが伏せる組：同じ手の2枚は、それしか作れないときだけ */
export function cpuPairsOf(h: Hand): Pair[] {
  const all = pairsOf(h)
  const ok = all.filter((p) => !isDoubleHand(p))
  return ok.length > 0 ? ok : all
}

export function canPlay(h: Hand, pair: Pair): boolean {
  const [a, b] = pair
  return a === b ? h[a] >= 2 : h[a] >= 1 && h[b] >= 1
}

export function removePair(h: Hand, [a, b]: Pair): Hand {
  const next = { ...h }
  next[a]--
  next[b]--
  return next
}

export function createGame(): GameState {
  return {
    round: 1,
    phase: 'set',
    hands: { p1: { ...START_HAND }, cpu: { ...START_HAND } },
    wins: { p1: 0, cpu: 0 },
    pairs: null,
    picks: null,
    history: [],
    winner: null,
  }
}

/** お互いの2枚を伏せて、同時に表にする */
export function setPairs(state: GameState, pairs: Record<Side, Pair>): GameState {
  if (state.phase !== 'set') return state
  if (!canPlay(state.hands.p1, pairs.p1) || !canPlay(state.hands.cpu, pairs.cpu)) return state
  return { ...state, phase: 'choose', pairs }
}

/** 勝負に使う1枚を同時に指定して判定し、場の4枚を除外する */
export function choose(state: GameState, picks: Record<Side, Pick>): GameState {
  if (state.phase !== 'choose' || !state.pairs) return state
  const { pairs } = state
  const outcome = judge(pairs.p1[picks.p1], pairs.cpu[picks.cpu])
  const wins = {
    p1: state.wins.p1 + (outcome === 'win' ? 1 : 0),
    cpu: state.wins.cpu + (outcome === 'lose' ? 1 : 0),
  }
  const hands = { p1: removePair(state.hands.p1, pairs.p1), cpu: removePair(state.hands.cpu, pairs.cpu) }
  const history = [...state.history, { round: state.round, pairs, picks, outcome }]
  const winner = winnerOf(wins, state.round)
  return { ...state, phase: winner ? 'gameover' : 'result', wins, hands, picks, history, winner }
}

/** 3勝で即決着。6ラウンドを終えたら勝ち数で決める */
export function winnerOf(wins: Record<Side, number>, round: number): Side | 'draw' | null {
  if (wins.p1 >= WINS_TO_WIN) return 'p1'
  if (wins.cpu >= WINS_TO_WIN) return 'cpu'
  if (round < MAX_ROUNDS) return null
  return wins.p1 > wins.cpu ? 'p1' : wins.p1 < wins.cpu ? 'cpu' : 'draw'
}

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'result') return state
  return { ...state, round: state.round + 1, phase: 'set', pairs: null, picks: null }
}
