import { create } from 'zustand'
import { cpuChoose, cpuSet, LEVELS, type Level } from './cpu'
import { choose, createGame, nextRound, setPairs } from './engine'
import { type Card, type GameState, type Hand, type Pair, type Pick } from './types'

/** 演出の待ち時間（ms） */
export const TIMING = { open: 700, clash: 900 }

export interface Settings {
  level: Level
}

/** 手札の並び：ヌルを先頭（上の段）に、続けてグー→チョキ→パー */
const HAND_ORDER: Card[] = ['null', 'rock', 'scissors', 'paper']

/** 手札を1枚ずつの並びにする */
export const handCards = (h: Hand): Card[] => HAND_ORDER.flatMap((c) => Array<Card>(h[c]).fill(c))

interface Store {
  game: GameState
  /** 開始画面を表示中 */
  setup: boolean
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
  /** CPUがこのラウンドに伏せる2枚（プレイヤーが決める前に決めておく） */
  cpuPair: Pair | null
  /** 手札で選んでいる札（handCards の並びの番号） */
  selected: number[]
  toggle: (i: number) => void
  /** 見せ合ったあとに選んでいる1枚 */
  pick: Pick | null
  setPick: (p: Pick) => void
  /** 演出中（めくる・ぶつける）。この間は操作できない */
  busy: 'open' | 'clash' | null
  start: () => void
  reset: () => void
  /** 選んだ2枚を伏せる */
  commitSet: () => void
  /** 選んだ1枚で勝負する */
  commitPick: () => void
  next: () => void
  /** 結果画面 */
  showResult: boolean
  /** デバッグ用：自分の操作の直前の局面 */
  history: { game: GameState; cpuPair: Pair | null }[]
  undo: () => void
}

const SETTINGS_KEY = 'nullhand.settings'
const DEFAULT_SETTINGS: Settings = { level: 'normal' }

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { level: s.level in LEVELS ? s.level : DEFAULT_SETTINGS.level }
  } catch {
    return DEFAULT_SETTINGS
  }
}
function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // 保存できない環境でも遊べる
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const useGame = create<Store>((set, get) => {
  /** 新しいラウンドの始め：CPUは先に伏せる2枚を決めておく */
  const roundStart = (game: GameState) => ({ game, cpuPair: cpuSet(game, 'cpu', get().settings.level), selected: [], pick: null, busy: null })
  const remember = () => {
    const { game, cpuPair, history } = get()
    return { history: [...history, { game, cpuPair }] }
  }

  return {
    game: createGame(),
    setup: true,
    settings: loadSettings(),
    updateSettings: (s) => {
      const settings = { ...get().settings, ...s }
      saveSettings(settings)
      set({ settings })
    },
    cpuPair: null,
    selected: [],
    pick: null,
    busy: null,
    showResult: false,
    history: [],

    toggle: (i) => {
      const { game, selected, busy } = get()
      if (game.phase !== 'set' || busy) return
      if (selected.includes(i)) set({ selected: selected.filter((x) => x !== i) })
      else if (selected.length < 2) set({ selected: [...selected, i] })
      else set({ selected: [selected[1], i] })
    },
    setPick: (p) => {
      const { game, busy } = get()
      if (game.phase === 'choose' && !busy) set({ pick: p })
    },

    start: () => set({ ...roundStart(createGame()), setup: false, showResult: false, history: [] }),
    reset: () => set({ setup: true, showResult: false, busy: null, history: [] }),

    commitSet: async () => {
      const { game, selected, cpuPair, busy } = get()
      if (game.phase !== 'set' || selected.length !== 2 || !cpuPair || busy) return
      const cards = handCards(game.hands.p1)
      const pair = [...selected].sort((a, b) => a - b).map((i) => cards[i]) as Pair
      const next = setPairs(game, { p1: pair, cpu: cpuPair })
      if (next === game) return
      set({ ...remember(), game: next, selected: [], pick: null, busy: 'open' })
      await wait(TIMING.open)
      if (get().game === next) set({ busy: null })
    },

    commitPick: async () => {
      const { game, pick, busy } = get()
      if (game.phase !== 'choose' || pick === null || busy) return
      // CPUも同時に選ぶ（プレイヤーの選んだ札は見ない）
      const next = choose(game, { p1: pick, cpu: cpuChoose(game, 'cpu') })
      set({ ...remember(), game: next, busy: 'clash' })
      await wait(TIMING.clash)
      if (get().game !== next) return
      set({ busy: null, showResult: next.phase === 'gameover' })
    },

    next: () => {
      const { game } = get()
      if (game.phase !== 'result') return
      set(roundStart(nextRound(game)))
    },

    undo: () => {
      const prev = get().history.at(-1)
      if (!prev) return
      set({ game: prev.game, cpuPair: prev.cpuPair, history: get().history.slice(0, -1), selected: [], pick: null, busy: null, showResult: false })
    },
  }
})

if (import.meta.env.DEV) Object.assign(window, { __nullhand: useGame })
