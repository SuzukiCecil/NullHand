import { AnimatePresence, motion } from 'framer-motion'
import { CircleHelp, RotateCcw, Undo2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { LEVELS, type Level } from '../game/cpu'
import { CARD_NAME, SIDE_NAME } from '../game/engine'
import { useGame } from '../game/store'
import { CARDS, MAX_ROUNDS, START_HAND, WINS_TO_WIN, type RoundRecord } from '../game/types'
import { DEBUG } from '../debug'
import { CardFace } from './CardView'

function Modal({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onClose && (
              <button type="button" aria-label="閉じる" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 hover:bg-[var(--card)]">
                <X size={18} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Title({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  return (
    <span className="block leading-none">
      <span className={`font-mono font-black tracking-tight ${size === 'lg' ? 'text-4xl' : 'text-xl'}`}>
        NULL<span className="glow text-[var(--accent)]">-</span>HAND
      </span>
      {size === 'lg' && <span className="mt-1 block text-xs font-bold tracking-[0.3em] text-[var(--muted)]">ヌルハンド</span>}
    </span>
  )
}

export function StartModal({ onRules }: { onRules: () => void }) {
  const open = useGame((s) => s.setup)
  const settings = useGame((s) => s.settings)
  const update = useGame((s) => s.updateSettings)
  const start = useGame((s) => s.start)
  return (
    <Modal open={open}>
      <div className="text-center">
        <Title />
        <p className="mt-3 text-sm text-[var(--muted)]">2枚見せて、1枚で勝負。</p>
      </div>
      <p className="mb-1.5 mt-5 text-xs font-bold text-[var(--muted)]">CPUの強さ</p>
      <div role="radiogroup" aria-label="CPUの強さ" className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--card)] p-1">
        {(Object.keys(LEVELS) as Level[]).map((lv) => (
          <button
            key={lv}
            type="button"
            role="radio"
            aria-checked={settings.level === lv}
            onClick={() => update({ level: lv })}
            className={`rounded-lg py-2 text-sm font-bold transition ${settings.level === lv ? 'bg-[var(--text)] text-black shadow' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          >
            {LEVELS[lv].label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-[var(--muted)]">{LEVELS[settings.level].note}</p>
      <button type="button" onClick={start} className="mt-5 w-full rounded-xl bg-[var(--accent)] py-3 font-black text-black shadow hover:brightness-110">
        勝負を始める
      </button>
      <button type="button" onClick={onRules} className="mx-auto mt-3 flex items-center gap-1 text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]">
        <CircleHelp size={16} /> 遊び方
      </button>
    </Modal>
  )
}

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-3 text-lg font-black">遊び方</h2>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          手札から2枚を見せ合い、そのうち1枚で勝負する2人用のじゃんけん。<b>先に{WINS_TO_WIN}勝</b>した方の勝ち。
        </p>
        <div className="rounded-xl bg-[var(--card)] p-3">
          <p className="font-bold">手札（12枚・山札なし）</p>
          <ul className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
            {CARDS.map((c) => (
              <li key={c} className="flex flex-col items-center gap-1">
                <CardFace card={c} side="p1" size="sm" />
                {CARD_NAME[c]} ×{START_HAND[c]}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">ヌルはグー・チョキ・パーのすべてに負ける。ヌル同士・同じ手同士はあいこ。</p>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <b>セット</b>：手札から2枚を選んで伏せる（同じ種類の2枚でもよい）。
          </li>
          <li>
            <b>オープン</b>：お互いの2枚が同時に表になる。
          </li>
          <li>
            <b>チョイス</b>：見せた2枚のうち、勝負に使う1枚を同時に選んで判定。
          </li>
          <li>
            <b>トラッシュ</b>：選ばなかった札も含め、場の4枚はゲームから除外。
          </li>
        </ol>
        <p>
          1ラウンドで2枚ずつ使うので、{MAX_ROUNDS}ラウンドで手札を使い切る。{WINS_TO_WIN}勝に届かなければ勝ち数の多い方の勝ち（同じなら引き分け）。
        </p>
        <p className="text-xs text-[var(--muted)]">除外された札は表向きなので、相手の残り手札の内訳はいつでも画面で確かめられる。</p>
      </div>
    </Modal>
  )
}

const OUTCOME_MARK = { win: { mark: '○', tone: 'text-[var(--win)]' }, lose: { mark: '×', tone: 'text-[var(--lose)]' }, draw: { mark: '△', tone: 'text-[var(--draw)]' } } as const

/** ラウンドごとの勝敗の印（6つ） */
export function HistoryStrip({ history }: { history: RoundRecord[] }) {
  return (
    <ol aria-label="ラウンドの結果" className="flex gap-1">
      {Array.from({ length: MAX_ROUNDS }, (_, i) => {
        const r = history[i]
        return (
          <li
            key={i}
            title={r ? `R${r.round}：${CARD_NAME[r.pairs.p1[r.picks.p1]]} 対 ${CARD_NAME[r.pairs.cpu[r.picks.cpu]]}` : `R${i + 1}`}
            className={`flex h-5 w-5 items-center justify-center rounded border border-[var(--border)] text-xs font-black ${r ? OUTCOME_MARK[r.outcome].tone : 'text-[var(--muted)]/40'}`}
          >
            {r ? OUTCOME_MARK[r.outcome].mark : i + 1}
          </li>
        )
      })}
    </ol>
  )
}

export function ResultModal() {
  const open = useGame((s) => s.showResult && !s.setup)
  const game = useGame((s) => s.game)
  const start = useGame((s) => s.start)
  const reset = useGame((s) => s.reset)
  const undo = useGame((s) => s.undo)
  const close = () => useGame.setState({ showResult: false })
  const w = game.winner
  const head = w === 'p1' ? { text: 'YOU WIN', tone: 'glow text-[var(--win)]' } : w === 'cpu' ? { text: 'YOU LOSE', tone: 'text-[var(--lose)]' } : { text: 'DRAW', tone: 'text-[var(--draw)]' }
  return (
    <Modal open={open} onClose={close}>
      <div className="text-center">
        <p className={`font-mono text-4xl font-black ${head.tone}`}>{head.text}</p>
        <p className="mt-2 text-sm font-bold">
          {SIDE_NAME.p1} {game.wins.p1} − {game.wins.cpu} CPU
          <span className="ml-1 text-[var(--muted)]">（{game.history.length}ラウンド）</span>
        </p>
      </div>
      <table className="mt-4 w-full text-center text-xs">
        <thead className="text-[var(--muted)]">
          <tr>
            <th className="py-1 font-bold">R</th>
            <th className="font-bold">あなた（見せた2枚→勝負）</th>
            <th className="font-bold">CPU</th>
            <th className="font-bold">結果</th>
          </tr>
        </thead>
        <tbody>
          {game.history.map((r) => (
            <tr key={r.round} className="border-t border-[var(--border)]">
              <td className="py-1.5">{r.round}</td>
              <td>
                {r.pairs.p1.map((c, i) => (
                  <span key={i} className={i === r.picks.p1 ? 'font-black' : 'text-[var(--muted)]'}>
                    {i > 0 && '・'}
                    {CARD_NAME[c]}
                  </span>
                ))}
              </td>
              <td>
                {r.pairs.cpu.map((c, i) => (
                  <span key={i} className={i === r.picks.cpu ? 'font-black' : 'text-[var(--muted)]'}>
                    {i > 0 && '・'}
                    {CARD_NAME[c]}
                  </span>
                ))}
              </td>
              <td className={`font-black ${OUTCOME_MARK[r.outcome].tone}`}>{OUTCOME_MARK[r.outcome].mark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-center text-[10px] text-[var(--muted)]">太字が勝負に使った札</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={reset} className="rounded-xl bg-[var(--card)] py-3 text-sm font-bold hover:brightness-125">
          設定に戻る
        </button>
        <button type="button" onClick={start} className="flex items-center justify-center gap-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-black text-black hover:brightness-110">
          <RotateCcw size={16} /> もう一度
        </button>
      </div>
      {DEBUG && (
        <button type="button" onClick={undo} className="mx-auto mt-3 flex items-center gap-1 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]">
          <Undo2 size={14} /> 一手戻る（デバッグ）
        </button>
      )}
    </Modal>
  )
}
