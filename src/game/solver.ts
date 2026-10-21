import { cpuPairsOf, handSize, judge, pairsOf, removePair } from './engine'
import { WINS_TO_WIN, type Hand, type Pair } from './types'

/**
 * 最後まで読み切った勝率（引き分けは0.5）と、読まれても損をしない混ぜ方（零和ゲームの均衡）を求める。
 * 局面は「自分の手札・相手の手札・お互いの勝ち数」で決まる（ラウンドは手札の枚数から分かる）。
 * cpu=true のときは、自分（CPU）が同じ手の2枚を伏せない前提で最後まで読む（相手＝プレイヤーは何でも出せる）。
 */

export interface MatrixSolution {
  /** 行（自分）から見たゲームの値 */
  value: number
  /** 行の混ぜ方 */
  row: number[]
  /** 列（相手）の混ぜ方 */
  col: number[]
}

const EPS = 1e-12

/** 2×2 の零和ゲーム（行が最大化）。純粋戦略の鞍点があればそれ、なければ混合戦略 */
export function solve2x2(a: number, b: number, c: number, d: number): MatrixSolution {
  const maximin = Math.max(Math.min(a, b), Math.min(c, d))
  const minimax = Math.min(Math.max(a, c), Math.max(b, d))
  if (maximin >= minimax - EPS) {
    // 鞍点：行は最小値が大きい方、列は最大値が小さい方。同じなら合計で比べる
    // （相手が何を選んでも損をしない方＝弱く支配する方を選ぶ。例：グーとヌルなら、相手がパーで負けが決まっていてもグー）
    const minA = Math.min(a, b) - Math.min(c, d)
    const r = minA > EPS ? 0 : minA < -EPS ? 1 : a + b >= c + d ? 0 : 1
    const maxD = Math.max(a, c) - Math.max(b, d)
    const k = maxD < -EPS ? 0 : maxD > EPS ? 1 : a + c <= b + d ? 0 : 1
    return { value: maximin, row: r === 0 ? [1, 0] : [0, 1], col: k === 0 ? [1, 0] : [0, 1] }
  }
  const den = a - b - c + d
  const p = (d - c) / den
  const q = (d - b) / den
  return { value: (a * d - b * c) / den, row: [p, 1 - p], col: [q, 1 - q] }
}

/** m×n の零和ゲームを線形計画（単体法）で解く（行が最大化） */
export function solveMatrix(M: number[][]): MatrixSolution {
  const m = M.length
  const n = M[0].length
  if (m === 2 && n === 2) return solve2x2(M[0][0], M[0][1], M[1][0], M[1][1])
  // 全要素を正にずらす：P = M + k
  let min = Infinity
  for (const row of M) for (const v of row) min = Math.min(min, v)
  const k = 1 - min
  // 列の側：maximize Σy  s.t.  P y ≤ 1, y ≥ 0（スラック付きの表）
  const W = n + m + 1
  const T: Float64Array[] = []
  for (let i = 0; i < m; i++) {
    const r = new Float64Array(W)
    for (let j = 0; j < n; j++) r[j] = M[i][j] + k
    r[n + i] = 1
    r[W - 1] = 1
    T.push(r)
  }
  const obj = new Float64Array(W)
  for (let j = 0; j < n; j++) obj[j] = -1
  const basis = Array.from({ length: m }, (_, i) => n + i)
  for (let iter = 0; iter < 500; iter++) {
    // Bland の規則（巡回しない）
    let e = -1
    for (let j = 0; j < W - 1; j++)
      if (obj[j] < -1e-10) {
        e = j
        break
      }
    if (e < 0) break
    let l = -1
    let best = Infinity
    for (let i = 0; i < m; i++) {
      if (T[i][e] > 1e-10) {
        const ratio = T[i][W - 1] / T[i][e]
        if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && basis[i] < basis[l])) {
          best = ratio
          l = i
        }
      }
    }
    const pr = T[l]
    const pv = pr[e]
    for (let j = 0; j < W; j++) pr[j] /= pv
    for (let i = 0; i < m; i++) {
      if (i === l) continue
      const f = T[i][e]
      if (f !== 0) for (let j = 0; j < W; j++) T[i][j] -= f * pr[j]
    }
    const f = obj[e]
    for (let j = 0; j < W; j++) obj[j] -= f * pr[j]
    basis[l] = e
  }
  const total = obj[W - 1]
  const col = new Array(n).fill(0)
  basis.forEach((b, i) => {
    if (b < n) col[b] = T[i][W - 1] / total
  })
  const row = Array.from({ length: m }, (_, i) => Math.max(0, obj[n + i]) / total)
  return { value: 1 / total - k, row, col }
}

// ---- 局面の値 ----

/** 手札を 0〜188 の番号にする（グー・チョキ・パーは0〜2枚、ヌルは0〜6枚） */
const handIndex = (h: Hand) => ((h.rock * 3 + h.scissors) * 3 + h.paper) * 7 + h.null
const memo = new Float64Array(189 * 189 * 9 * 2).fill(NaN)

/**
 * 自分の手札 me・相手の手札 op・勝ち数のとき、ラウンドの始め（伏せる前）から最後まで最善を尽くした自分の勝率。
 * 引き分けは0.5。お互いの手札は同じ枚数。
 */
export function value(me: Hand, op: Hand, myWins: number, opWins: number, cpu = false): number {
  if (myWins >= WINS_TO_WIN) return 1
  if (opWins >= WINS_TO_WIN) return 0
  if (handSize(me) === 0) return myWins > opWins ? 1 : myWins < opWins ? 0 : 0.5
  const key = (((handIndex(me) * 189 + handIndex(op)) * 3 + myWins) * 3 + opWins) * 2 + (cpu ? 1 : 0)
  const hit = memo[key]
  if (!Number.isNaN(hit)) return hit
  const v = setGame(me, op, myWins, opWins, cpu).value
  memo[key] = v
  return v
}

/** 伏せた2枚どうしを見せ合ったあとの、1枚を選ぶ勝負（2×2） */
export function chooseGame(me: Hand, op: Hand, myPair: Pair, opPair: Pair, myWins: number, opWins: number, cpu = false): MatrixSolution {
  const nextMe = removePair(me, myPair)
  const nextOp = removePair(op, opPair)
  const after = {
    win: value(nextMe, nextOp, myWins + 1, opWins, cpu),
    draw: value(nextMe, nextOp, myWins, opWins, cpu),
    lose: value(nextMe, nextOp, myWins, opWins + 1, cpu),
  }
  const v = (i: number, j: number) => after[judge(myPair[i], opPair[j])]
  return solve2x2(v(0, 0), v(0, 1), v(1, 0), v(1, 1))
}

/** どの2枚を伏せるかの勝負（行＝自分の組、列＝相手の組） */
export function setGame(
  me: Hand,
  op: Hand,
  myWins: number,
  opWins: number,
  cpu = false,
): MatrixSolution & { myPairs: Pair[]; opPairs: Pair[]; matrix: number[][] } {
  const myPairs = cpu ? cpuPairsOf(me) : pairsOf(me)
  const opPairs = pairsOf(op)
  const M = myPairs.map((mp) => opPairs.map((pp) => chooseGame(me, op, mp, pp, myWins, opWins, cpu).value))
  if (myPairs.length === 1 && opPairs.length === 1) return { value: M[0][0], row: [1], col: [1], myPairs, opPairs, matrix: M }
  if (myPairs.length === 1 || opPairs.length === 1) {
    // 片方に選択肢がない：もう片方は最善の1つを選ぶ
    const flat = myPairs.length === 1 ? M[0] : M.map((r) => r[0])
    const pickBest = myPairs.length === 1 ? Math.min(...flat) : Math.max(...flat)
    const idx = flat.indexOf(pickBest)
    const onehot = flat.map((_, i) => (i === idx ? 1 : 0))
    return myPairs.length === 1
      ? { value: pickBest, row: [1], col: onehot, myPairs, opPairs, matrix: M }
      : { value: pickBest, row: onehot, col: [1], myPairs, opPairs, matrix: M }
  }
  return { ...solveMatrix(M), myPairs, opPairs, matrix: M }
}

/**
 * 行の均衡戦略を、なるべく多くの手に散らして求める。
 * 均衡が複数あるとき、単体法は端の1つ（少ない手に偏ったもの）を返すので、
 * 行と列の並びを変えて何度か解き、平均をとる（均衡どうしの平均も均衡なので、強さは変わらない）。
 */
export function spreadRow(M: number[][], rng: () => number, tries = 24): number[] {
  const m = M.length
  const n = M[0].length
  const acc = new Array(m).fill(0)
  const shuffle = (k: number) => {
    const a = Array.from({ length: k }, (_, i) => i)
    for (let i = k - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  for (let t = 0; t < tries; t++) {
    const rows = shuffle(m)
    const cols = shuffle(n)
    const s = solveMatrix(rows.map((i) => cols.map((j) => M[i][j])))
    rows.forEach((i, k) => (acc[i] += s.row[k] / tries))
  }
  return acc
}
