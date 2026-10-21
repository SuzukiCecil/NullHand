// CPU同士の対戦： npx tsx scripts/simulate.ts [局数]
// 強さの組み合わせごとに、先に書いた方（White の席）の勝率・引き分け率・平均ラウンド数・ヌルで勝負した割合を出す
import { choose, createGame, nextRound, setPairs } from '../src/game/engine'
import { cpuChoose, cpuSet, type Level } from '../src/game/cpu'

const n = Number(process.argv[2] ?? 2000)
function seeded(seed: number) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const levels: Level[] = ['easy', 'normal', 'hard']
for (const a of levels)
  for (const b of levels) {
    let win = 0, draw = 0, rounds = 0, picks = 0, nulls = 0
    for (let i = 0; i < n; i++) {
      const rng = seeded(i * 7919 + 13)
      let g = createGame()
      while (g.phase !== 'gameover') {
        g = setPairs(g, { p1: cpuSet(g, 'p1', a, rng), cpu: cpuSet(g, 'cpu', b, rng) })
        const pk = { p1: cpuChoose(g, 'p1', rng), cpu: cpuChoose(g, 'cpu', rng) }
        for (const s of ['p1', 'cpu'] as const) {
          picks++
          if (g.pairs![s][pk[s]] === 'null') nulls++
        }
        g = choose(g, pk)
        if (g.phase === 'result') g = nextRound(g)
      }
      if (g.winner === 'p1') win++
      if (g.winner === 'draw') draw++
      rounds += g.round
    }
    console.log(`${a} vs ${b}\t勝ち${((win / n) * 100).toFixed(1)}%\t引分${((draw / n) * 100).toFixed(1)}%\t負け${(((n - win - draw) / n) * 100).toFixed(1)}%\tラウンド${(rounds / n).toFixed(2)}\tヌルで勝負${((nulls / picks) * 100).toFixed(0)}%`)
  }
