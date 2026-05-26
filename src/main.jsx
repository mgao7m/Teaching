import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import Instructions from './Instructions.jsx'
import ExploreGame from './explore_game.jsx'
import NoisyGame from './noisy_game.jsx'
import Game from './game.jsx'
import TeachMode from './teach_mode.jsx'
import SolutionKey from './solution_visualizer.jsx'

function Root() {
  const [page, setPage] = useState('instructions')

  const nav = (p) => {
    window.location.hash = p
    setPage(p)
  }

  const navBtn = (id, label) => (
    <button
      onClick={() => nav(id)}
      style={{
        background: page===id ? '#fff' : 'transparent',
        color: page===id ? '#0f172a' : '#94a3b8',
        border: 'none',
        borderRadius: 5,
        padding: '5px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div style={{
        background: '#0f172a',
        padding: '8px 20px',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <span style={{
          color:'#475569', fontSize:12, fontWeight:600,
          marginRight:12, letterSpacing:-0.2, flexShrink:0,
        }}>
          DAG Detective
        </span>
        {navBtn('instructions', 'How to Use')}
        {navBtn('explore',      'Explore Game')}
        {navBtn('noisy',        'Noisy Game')}
        {navBtn('game',         'Min Game')}
        {navBtn('teach',        'Teach')}
        {navBtn('solutions',    'Solution Key')}
      </div>

      {page === 'instructions' && <Instructions />}
      {page === 'explore'      && <ExploreGame />}
      {page === 'noisy'        && <NoisyGame />}
      {page === 'game'         && <Game />}
      {page === 'teach'        && <TeachMode />}
      {page === 'solutions'    && <SolutionKey />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
