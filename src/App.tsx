import { motion } from 'framer-motion'
import { Bot, CircleHelp, RotateCcw, Undo2, User } from 'lucide-react'
import { useState } from 'react'
import { CardFace, CardSlot, FlipCard, CARD_ICON } from './components/CardView'
import { HistoryStrip, ResultModal, RulesModal, StartModal, Title } from './components/Modals'
import { DEBUG } from './debug'
import { LEVELS } from './game/cpu'
import { CARD_NAME, judge, removePair } from './game/engine'
import { handCards, useGame } from './game/store'
import { CARDS, MAX_ROUNDS, WINS_TO_WIN, type Card, type Hand, type Side } from './game/types'
import { useFitZoom } from './useFitZoom'

export default function App() {
  const game = useGame((s) => s.game)
  const setup = useGame((s) => s.setup)
  const reset = useGame((s) => s.reset)
  const undo = useGame((s) => s.undo)
  const canUndo = useGame((s) => !s.setup && s.history.length > 0)
  const [rulesOpen, setRulesOpen] = useState(false)
  // PCでは画面に合わせて拡大する（モーダルは画面全体を覆うので拡大しない）
  const zoom = useFitZoom()

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-4" style={zoom > 1 ? { maxWidth: `${36 * zoom}rem` } : undefined}>
      <header
        className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between gap-2 bg-[var(--bg)]/85 px-4 py-2 backdrop-blur"
        style={zoom > 1 ? { zoom } : undefined}
      >
        <h1>
          <Title size="sm" />
        </h1>
        <div className="flex items-center gap-0.5">
          {!setup && (
            <span className="whitespace-nowrap rounded-full bg-[var(--card)] px-2.5 py-1 text-xs font-bold">
              R{Math.min(game.round, MAX_ROUNDS)}/{MAX_ROUNDS}
            </span>
          )}
          {DEBUG && (
            <button type="button" aria-label="一手戻る（デバッグ用）" title="一手戻る（デバッグ用）" disabled={!canUndo} onClick={undo} className="rounded-full p-1.5 hover:bg-[var(--panel)] disabled:opacity-30">
              <Undo2 size={20} />
            </button>
          )}
          <button type="button" aria-label="遊び方" onClick={() => setRulesOpen(true)} className="rounded-full p-1.5 hover:bg-[var(--panel)]">
            <CircleHelp size={20} />
          </button>
          <button
            type="button"
            aria-label="リセット"
            onClick={() => {
              if (setup || game.phase === 'gameover' || confirm('勝負をやめて最初の画面に戻りますか？')) reset()
            }}
            className="rounded-full p-1.5 hover:bg-[var(--panel)]"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-2" style={zoom > 1 ? { zoom } : undefined}>
        <SeatBar side="cpu" />
        <Field />
        <SeatBar side="p1" />
        <MyHand />
        <Controls />
      </main>

      <StartModal onRules={() => setRulesOpen(true)} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <ResultModal />
    </div>
  )
}

/** 席の帯：名前・勝ち数・残り手札の内訳 */
function SeatBar({ side }: { side: Side }) {
  const game = useGame((s) => s.game)
  const level = useGame((s) => s.settings.level)
  // 場に伏せた札はまだ手札から除外されていないので、内訳からは除いて見せる
  const hand = game.phase === 'choose' && game.pairs ? removePair(game.hands[side], game.pairs[side]) : game.hands[side]
  const Icon = side === 'p1' ? User : Bot
  return (
    <section aria-label={side === 'p1' ? 'あなた' : 'CPU'} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${side === 'p1' ? 'border-zinc-300 bg-[var(--white-card)] text-zinc-900' : 'border-zinc-600 bg-[var(--black-card)] text-zinc-100'}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-black">{side === 'p1' ? 'あなた' : 'CPU'}</span>
        <span className="block text-[10px] text-[var(--muted)]">{side === 'p1' ? 'White' : `Black・${LEVELS[level].label}`}</span>
      </span>
      <WinLamps wins={game.wins[side]} />
      <Counts hand={hand} />
    </section>
  )
}

function WinLamps({ wins }: { wins: number }) {
  return (
    <span aria-label={`${wins}勝`} className="flex gap-1">
      {Array.from({ length: WINS_TO_WIN }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full border ${i < wins ? 'pulse-ring border-[var(--win)] bg-[var(--win)]' : 'border-zinc-500 bg-transparent'}`} />
      ))}
    </span>
  )
}

/** 残り手札の内訳 */
function Counts({ hand }: { hand: Hand }) {
  return (
    <ul aria-label="残り手札" className="ml-auto flex gap-1">
      {CARDS.map((c) => {
        const Icon = CARD_ICON[c]
        return (
          <li key={c} title={`${CARD_NAME[c]} 残り${hand[c]}枚`} className={`flex items-center gap-0.5 rounded-md bg-[var(--card)] px-1.5 py-1 text-xs font-black tabular-nums ${hand[c] === 0 ? 'opacity-30' : ''}`}>
            <Icon size={13} className={c === 'null' ? 'opacity-60' : ''} />
            {hand[c]}
          </li>
        )
      })}
    </ul>
  )
}

/** 場：CPUの2枚、結果、あなたの2枚 */
function Field() {
  const game = useGame((s) => s.game)
  const selected = useGame((s) => s.selected)
  const pick = useGame((s) => s.pick)
  const setPick = useGame((s) => s.setPick)
  const busy = useGame((s) => s.busy)
  const { phase, pairs, picks } = game
  const cards = handCards(game.hands.p1)
  const open = phase !== 'set' && !!pairs
  const decided = (phase === 'result' || phase === 'gameover') && !!picks && !!pairs
  const last = decided ? game.history.at(-1)! : null

  const row = (side: Side) => (
    <div className="flex justify-center gap-3">
      {[0, 1].map((i) => {
        if (!open) {
          if (side === 'cpu') return <FlipCard key={i} card={null} side="cpu" open={false} />
          const c = selected[i] !== undefined ? cards[[...selected].sort((a, b) => a - b)[i]] : null
          return c ? <CardFace key={i} card={c} side="p1" /> : <CardSlot key={i} label="?" />
        }
        const card = pairs![side][i]
        const chosen = decided && picks![side] === i
        const dim = decided && !chosen
        const mine = side === 'p1' && phase === 'choose'
        const body = (
          <motion.div animate={{ opacity: dim ? 0.25 : 1, scale: chosen ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
            <FlipCard card={card} side={side} open />
          </motion.div>
        )
        if (!mine) return <div key={i}>{body}</div>
        return (
          <button
            key={i}
            type="button"
            aria-pressed={pick === i}
            aria-label={`${CARD_NAME[card]}で勝負する`}
            disabled={!!busy}
            onClick={() => setPick(i as 0 | 1)}
            className={`rounded-xl transition ${pick === i ? 'ring-4 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--panel)]' : 'hover:-translate-y-0.5'}`}
          >
            {body}
          </button>
        )
      })}
    </div>
  )

  return (
    <section aria-label="場" className="field flex flex-col gap-2 rounded-2xl px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--muted)]">ラウンド {Math.min(game.round, MAX_ROUNDS)}</span>
        <HistoryStrip history={game.history} />
      </div>
      {row('cpu')}
      <Message last={last} />
      {row('p1')}
    </section>
  )
}

function Message({ last }: { last: { outcome: 'win' | 'lose' | 'draw'; pairs: Record<Side, [Card, Card]>; picks: Record<Side, 0 | 1> } | null }) {
  const game = useGame((s) => s.game)
  const selected = useGame((s) => s.selected)
  const busy = useGame((s) => s.busy)
  let text = ''
  let tone = 'text-[var(--muted)]'
  if (game.phase === 'set') text = selected.length < 2 ? `手札から2枚選んで伏せよう（${selected.length}/2）` : 'この2枚で伏せる？'
  else if (game.phase === 'choose') text = busy === 'open' ? 'オープン！' : '勝負に使う1枚を選ぼう'
  else if (last && busy === 'clash') text = `${CARD_NAME[last.pairs.p1[last.picks.p1]]} 対 ${CARD_NAME[last.pairs.cpu[last.picks.cpu]]}`
  else if (last) {
    const mine = last.pairs.p1[last.picks.p1]
    const theirs = last.pairs.cpu[last.picks.cpu]
    const o = judge(mine, theirs)
    text = `${CARD_NAME[mine]} 対 ${CARD_NAME[theirs]}　${o === 'win' ? '勝ち！' : o === 'lose' ? '負け…' : 'あいこ'}`
    tone = o === 'win' ? 'glow text-[var(--win)]' : o === 'lose' ? 'text-[var(--lose)]' : 'text-[var(--text)]'
  }
  return (
    <motion.p key={text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`min-h-6 text-center text-sm font-black ${tone}`} role="status" aria-live="polite">
      {text}
    </motion.p>
  )
}

/** 自分の手札（セットのときに2枚選ぶ） */
function MyHand() {
  const game = useGame((s) => s.game)
  const selected = useGame((s) => s.selected)
  const toggle = useGame((s) => s.toggle)
  const busy = useGame((s) => s.busy)
  const choosing = game.phase === 'set' && !busy
  const hand = game.phase === 'choose' && game.pairs ? removePair(game.hands.p1, game.pairs.p1) : game.hands.p1
  const cards = choosing ? handCards(game.hands.p1) : handCards(hand)
  return (
    <section aria-label="あなたの手札" className="grid min-h-[140px] grid-cols-6 content-start justify-items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-2">
      {cards.map((c, i) =>
        choosing ? (
          <button
            key={`${c}-${i}`}
            type="button"
            aria-pressed={selected.includes(i)}
            aria-label={CARD_NAME[c]}
            onClick={() => toggle(i)}
            className={`rounded-lg transition ${selected.includes(i) ? '-translate-y-1 ring-4 ring-[var(--accent)]' : 'hover:-translate-y-0.5'}`}
          >
            <CardFace card={c} side="p1" size="sm" />
          </button>
        ) : (
          <div key={`${c}-${i}`} className="opacity-60">
            <CardFace card={c} side="p1" size="sm" />
          </div>
        ),
      )}
      {cards.length === 0 && <p className="col-span-6 self-center text-xs text-[var(--muted)]">手札はもうない</p>}
    </section>
  )
}

function Controls() {
  const game = useGame((s) => s.game)
  const selected = useGame((s) => s.selected)
  const pick = useGame((s) => s.pick)
  const busy = useGame((s) => s.busy)
  const commitSet = useGame((s) => s.commitSet)
  const commitPick = useGame((s) => s.commitPick)
  const next = useGame((s) => s.next)
  const start = useGame((s) => s.start)
  const btn = 'w-full rounded-xl py-3.5 font-black shadow transition disabled:opacity-30'
  if (game.phase === 'set')
    return (
      <button type="button" disabled={selected.length !== 2 || !!busy} onClick={commitSet} className={`${btn} bg-[var(--text)] text-black hover:brightness-90`}>
        2枚を伏せる
      </button>
    )
  if (game.phase === 'choose')
    return (
      <button type="button" disabled={pick === null || !!busy} onClick={commitPick} className={`${btn} bg-[var(--accent)] text-black hover:brightness-110`}>
        この1枚で勝負
      </button>
    )
  if (game.phase === 'result')
    return (
      <button type="button" disabled={!!busy} onClick={next} className={`${btn} bg-[var(--card)] text-[var(--text)] hover:brightness-125`}>
        次のラウンドへ
      </button>
    )
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={!!busy} onClick={() => useGame.setState({ showResult: true })} className={`${btn} bg-[var(--card)] text-[var(--text)]`}>
        結果を見る
      </button>
      <button type="button" disabled={!!busy} onClick={start} className={`${btn} bg-[var(--accent)] text-black`}>
        もう一度
      </button>
    </div>
  )
}

