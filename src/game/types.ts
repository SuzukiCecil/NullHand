export type Card = 'rock' | 'scissors' | 'paper' | 'null'
export const CARDS: Card[] = ['rock', 'scissors', 'paper', 'null']

export type Side = 'p1' | 'cpu'
export const SIDES: Side[] = ['p1', 'cpu']

/** 手札（種類ごとの枚数） */
export type Hand = Record<Card, number>
/** 伏せる2枚（同じ種類の2枚でもよい） */
export type Pair = [Card, Card]
/** 2枚のうち勝負に使う方 */
export type Pick = 0 | 1

export type Outcome = 'win' | 'lose' | 'draw'

export interface RoundRecord {
  round: number
  pairs: Record<Side, Pair>
  picks: Record<Side, Pick>
  /** p1 から見た結果 */
  outcome: Outcome
}

/**
 * set：お互いに2枚を選んで伏せる
 * choose：2枚ずつ表になり、勝負に使う1枚を選ぶ
 * result：勝負の結果を見せている（次のラウンドへ進む前）
 * gameover：決着
 */
export type Phase = 'set' | 'choose' | 'result' | 'gameover'

export interface GameState {
  round: number
  phase: Phase
  hands: Record<Side, Hand>
  wins: Record<Side, number>
  /** このラウンドに伏せた2枚（set のあいだは null） */
  pairs: Record<Side, Pair> | null
  /** このラウンドに選んだ1枚（result 以降） */
  picks: Record<Side, Pick> | null
  history: RoundRecord[]
  /** 決着したときの勝者（引き分けは draw） */
  winner: Side | 'draw' | null
}

export type Rng = () => number

/** 1セットの内訳 */
export const START_HAND: Hand = { rock: 2, scissors: 2, paper: 2, null: 6 }
export const WINS_TO_WIN = 3
export const MAX_ROUNDS = 6
