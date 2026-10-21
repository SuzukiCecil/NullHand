import { describe, expect, it } from 'vitest'
import { choose, createGame, judge, nextRound, pairsOf, setPairs, winnerOf } from './engine'
import { cpuChoose, cpuSet, isDoubleHand } from './cpu'
import { setGame, solveMatrix, spreadRow } from './solver'
import { START_HAND, type GameState, type Pair, type Pick } from './types'

const play = (g: GameState, p1: Pair, cpu: Pair, picks: [Pick, Pick] = [0, 0]) => choose(setPairs(g, { p1, cpu }), { p1: picks[0], cpu: picks[1] })

describe('勝敗判定', () => {
  it('じゃんけんとヌル', () => {
    expect(judge('rock', 'scissors')).toBe('win')
    expect(judge('scissors', 'paper')).toBe('win')
    expect(judge('paper', 'rock')).toBe('win')
    expect(judge('rock', 'paper')).toBe('lose')
    expect(judge('null', 'rock')).toBe('lose')
    expect(judge('paper', 'null')).toBe('win')
    expect(judge('null', 'null')).toBe('draw')
    expect(judge('rock', 'rock')).toBe('draw')
  })
})

describe('進行', () => {
  it('伏せられる組は最初10通り（同じ種類の2枚も含む）', () => {
    expect(pairsOf(START_HAND)).toHaveLength(10)
  })

  it('持っていない札は伏せられない', () => {
    let g = createGame()
    g = play(g, ['rock', 'rock'], ['null', 'null'])
    expect(nextRound(g).hands.p1.rock).toBe(0)
    expect(setPairs(nextRound(g), { p1: ['rock', 'null'], cpu: ['null', 'null'] }).phase).toBe('set')
  })

  it('選ばなかった札も含め、場の4枚は除外される', () => {
    const g = play(createGame(), ['rock', 'null'], ['paper', 'null'], [1, 0])
    expect(g.hands.p1).toEqual({ rock: 1, scissors: 2, paper: 2, null: 5 })
    expect(g.hands.cpu).toEqual({ rock: 2, scissors: 2, paper: 1, null: 5 })
    expect(g.wins).toEqual({ p1: 0, cpu: 1 })
    expect(g.history[0].outcome).toBe('lose')
  })

  it('先に3勝で即決着', () => {
    let g = createGame()
    g = nextRound(play(g, ['rock', 'null'], ['scissors', 'null']))
    g = nextRound(play(g, ['scissors', 'null'], ['paper', 'null']))
    g = nextRound(play(g, ['paper', 'null'], ['rock', 'null']))
    expect(g.phase).toBe('gameover')
    expect(g.winner).toBe('p1')
    expect(g.round).toBe(3)
  })

  it('6ラウンドで手札を使い切り、勝ち数で決まる（同じなら引き分け）', () => {
    let g = createGame()
    for (let i = 0; i < 3; i++) g = nextRound(play(g, ['null', 'null'], ['null', 'null']))
    for (const c of ['rock', 'scissors', 'paper'] as const) g = nextRound(play(g, [c, c], [c, c]))
    expect(g.phase).toBe('gameover')
    expect(g.round).toBe(6)
    expect(g.winner).toBe('draw')
    expect(g.hands.p1).toEqual({ rock: 0, scissors: 0, paper: 0, null: 0 })
    expect(winnerOf({ p1: 2, cpu: 1 }, 6)).toBe('p1')
    expect(winnerOf({ p1: 2, cpu: 1 }, 5)).toBeNull()
  })
})

describe('均衡の計算', () => {
  it('じゃんけんの行列は1/3ずつ・値0', () => {
    const s = solveMatrix([
      [0, -1, 1],
      [1, 0, -1],
      [-1, 1, 0],
    ])
    expect(s.value).toBeCloseTo(0)
    s.row.forEach((p) => expect(p).toBeCloseTo(1 / 3))
  })

  it('初期局面は対称なので勝率0.5', () => {
    expect(setGame(START_HAND, START_HAND, 0, 0).value).toBeCloseTo(0.5)
  })

  it('勝ち越しているほど勝率が高い', () => {
    expect(setGame(START_HAND, START_HAND, 2, 0).value).toBeGreaterThan(setGame(START_HAND, START_HAND, 1, 0).value)
  })
})

describe('均衡の散らし方', () => {
  it('散らした混ぜ方も均衡のまま（相手がどの組を出しても勝率が下がらない）', () => {
    const me = { rock: 2, scissors: 2, paper: 2, null: 4 }
    const g = setGame(me, me, 1, 0)
    const x = spreadRow(g.matrix, Math.random)
    const worst = Math.min(...g.opPairs.map((_, j) => g.matrix.reduce((t, row, i) => t + x[i] * row[j], 0)))
    expect(worst).toBeGreaterThan(g.value - 1e-9)
    // 単体法の解より多くの組を使う
    expect(x.filter((p) => p > 0.01).length).toBeGreaterThan(g.row.filter((p) => p > 0.01).length)
  })
})

describe('CPU', () => {
  it('どの強さでも、持っている札で組を作る', () => {
    const g = createGame()
    for (const lv of ['easy', 'normal', 'hard'] as const) {
      const pair = cpuSet(g, 'cpu', lv)
      expect(setPairs(g, { p1: ['null', 'null'], cpu: pair }).phase).toBe('choose')
    }
  })

  it('グーとヌルを見せたら、相手の札によらず必ずグーで勝負する', () => {
    for (const op of [['null', 'null'], ['paper', 'null'], ['scissors', 'rock']] as Pair[]) {
      const g = setPairs(createGame(), { p1: op, cpu: ['null', 'rock'] })
      for (let i = 0; i < 20; i++) expect(cpuChoose(g, 'cpu')).toBe(1)
    }
  })

  it('読み合いになる場面では確率で混ぜる（グー・パー 対 チョキ・グー）', () => {
    const g = setPairs(createGame(), { p1: ['scissors', 'rock'], cpu: ['rock', 'paper'] })
    const picks = new Set(Array.from({ length: 50 }, (_, i) => cpuChoose(g, 'cpu', () => (i + 0.5) / 50)))
    expect(picks.size).toBe(2)
  })

  it('グー・チョキ・パーの同じ2枚は、それしか出せないとき以外は伏せない', () => {
    const g = createGame()
    // グー2・チョキ1・パー1・ヌル2（同じ2枚はグー・グーだけ出せる）
    const hand = { rock: 2, scissors: 1, paper: 1, null: 2 }
    const s = { ...g, hands: { p1: hand, cpu: hand } }
    for (const lv of ['easy', 'normal', 'hard'] as const)
      for (let i = 0; i < 40; i++) expect(isDoubleHand(cpuSet(s, 'cpu', lv, () => (i + 0.5) / 40))).toBe(false)
    // 残りがグー2枚だけなら出す
    const last = { ...g, hands: { p1: { rock: 0, scissors: 0, paper: 0, null: 2 }, cpu: { rock: 2, scissors: 0, paper: 0, null: 0 } } }
    expect(cpuSet(last, 'cpu', 'hard')).toEqual(['rock', 'rock'])
  })
})
