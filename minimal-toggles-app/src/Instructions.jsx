import React from 'react';

// ─── Mini SVG helpers ─────────────────────────────────────────────────────────

const NS = {
  'F-on':  {bg:'#dcfce7', bdr:'#16a34a', txt:'#14532d'},
  'F-off': {bg:'#fee2e2', bdr:'#dc2626', txt:'#7f1d1d'},
  'on':    {bg:'#1e293b', bdr:'#0f172a', txt:'#f1f5f9'},
  'off':   {bg:'#f8fafc', bdr:'#e2e8f0', txt:'#cbd5e1'},
  'free':  {bg:'#f1f5f9', bdr:'#94a3b8', txt:'#64748b'},
};

function INode({x, y, r=11, state, label}) {
  const s = NS[state] || NS.free;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={s.bg} stroke={s.bdr} strokeWidth={2}/>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="800" fill={s.txt} fontFamily="system-ui,sans-serif">
        {label}
      </text>
    </g>
  );
}

function IArrow({x1, y1, x2, y2, r=11}) {
  const dx=x2-x1, dy=y2-y1, d=Math.sqrt(dx*dx+dy*dy);
  if (d<1) return null;
  const nx=dx/d, ny=dy/d, px=-ny, py=nx, hl=5, hw=2.8;
  const sx=x1+nx*r, sy=y1+ny*r, tx=x2-nx*r, ty=y2-ny*r;
  const bx=tx-nx*hl, by=ty-ny*hl;
  return (
    <g>
      <line x1={sx} y1={sy} x2={bx} y2={by} stroke="#64748b" strokeWidth={1.5}/>
      <polygon points={`${tx},${ty} ${bx+px*hw},${by+py*hw} ${bx-px*hw},${by-py*hw}`} fill="#64748b"/>
    </g>
  );
}

function Diagram({positions, edges, vw, vh, scale=1.6}) {
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={vw*scale} height={vh*scale} style={{display:'block'}}>
      {edges.map(([f,t],i) => (
        <IArrow key={i}
          x1={positions[f].x} y1={positions[f].y}
          x2={positions[t].x} y2={positions[t].y}
        />
      ))}
      {positions.map((p,i) => (
        <INode key={i} x={p.x} y={p.y} label={p.label} state={p.state}/>
      ))}
    </svg>
  );
}

function SetObserve({title, note, before, after, edges, vw, vh}) {
  return (
    <div style={{
      background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8,
      padding:'10px 14px',
    }}>
      {title && (
        <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:2}}>{title}</div>
      )}
      {note && (
        <div style={{fontSize:11,color:'#64748b',marginBottom:8,lineHeight:1.6}}>{note}</div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',
            letterSpacing:0.5,marginBottom:3}}>You set</div>
          <Diagram positions={before} edges={edges} vw={vw} vh={vh}/>
        </div>
        <div style={{fontSize:18,color:'#cbd5e1',fontWeight:300,lineHeight:1}}>→</div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',
            letterSpacing:0.5,marginBottom:3}}>You observe</div>
          <Diagram positions={after} edges={edges} vw={vw} vh={vh}/>
        </div>
      </div>
    </div>
  );
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

const AB_POS = [
  {x:22, y:22, label:'A'},
  {x:78, y:22, label:'B'},
];
const AB_EDGES = [[0,1]];

const CHAIN_POS = [
  {x:18,  y:22, label:'A'},
  {x:56,  y:22, label:'B'},
  {x:94,  y:22, label:'C'},
  {x:130, y:22, label:'D'},
];
const CHAIN_EDGES = [[0,1],[1,2],[2,3]];

const CONV_POS = [
  {x:20, y:20, label:'A'},
  {x:80, y:20, label:'B'},
  {x:50, y:72, label:'C'},
];
const CONV_EDGES = [[0,2],[1,2]];

// ─── Instructions ─────────────────────────────────────────────────────────────

export default function Instructions() {
  const h2 = {fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 8px'};
  const p  = {fontSize:13,color:'#374151',lineHeight:1.8,margin:'0 0 10px'};
  const tag = {
    display:'inline-block', borderRadius:4, padding:'2px 8px',
    fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6,
    marginBottom:8,
  };
  const card = {
    background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10,
    padding:'14px 18px', marginBottom:10,
  };

  return (
    <div style={{
      maxWidth:720, margin:'0 auto', padding:'32px 24px',
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
      color:'#0f172a',
    }}>
      <h1 style={{fontSize:24,fontWeight:800,margin:'0 0 6px',letterSpacing:-0.4}}>
        How to Use
      </h1>
      <p style={{...p, color:'#64748b', marginBottom:20}}>
        Each page is a different tool for exploring how people learn hidden causal networks.
      </p>

      {/* Page summaries */}
      <div style={{marginBottom:32}}>
        <div style={card}>
          <div style={{...tag, background:'#dcfce7', color:'#166534'}}>Explore Game</div>
          <p style={{...p, margin:0}}>
            The player reverse-engineers a hidden 4-node DAG by designing their own experiments — choosing which nodes to force on or off, running them, and observing all four outputs. Once confident, they draw their guess. Scored against a greedy optimal bot using expected information gain.
          </p>
        </div>
        <div style={card}>
          <div style={{...tag, background:'#fef9c3', color:'#854d0e'}}>Noisy Game</div>
          <p style={{...p, margin:0}}>
            Same as Explore, but propagation is stochastic (noisy-OR). The same experiment can give different results each time, so repeating toggles is a valid strategy. <strong>w_S</strong> controls how reliably a real connection fires; <strong>w_B</strong> controls background activation. The bot uses a Bayesian posterior and picks experiments by expected information gain.
          </p>
        </div>
        <div style={card}>
          <div style={{...tag, background:'#dbeafe', color:'#1e40af'}}>Min Game</div>
          <p style={{...p, margin:0}}>
            The player is shown only the minimum set of experiments needed to uniquely identify the hidden network. Their job is to figure out which DAG is consistent with those results and draw it.
          </p>
        </div>
        <div style={card}>
          <div style={{...tag, background:'#ede9fe', color:'#5b21b6'}}>Teach</div>
          <p style={{...p, margin:0}}>
            A teacher mode. Shows the hidden DAG and lets you manually design experiment sequences to see how informative each one is.
          </p>
        </div>
        <div style={card}>
          <div style={{...tag, background:'#f1f5f9', color:'#475569'}}>Solution Key</div>
          <p style={{...p, margin:0}}>
            A reference viewer for all 543 possible DAGs on 4 nodes and their distinguishing experiment structures.
          </p>
        </div>
      </div>

      {/* How the game works */}
      <h1 style={{fontSize:20,fontWeight:800,margin:'0 0 6px',letterSpacing:-0.4}}>
        How It Works
      </h1>
      <p style={{...p, color:'#64748b', marginBottom:16}}>
        There's a hidden network connecting four variables — <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, and <strong>D</strong>. Each variable is either <strong>on</strong> or <strong>off</strong>. Your job is to figure out which ones have arrows connecting them.
      </p>

      {/* Color legend */}
      <div style={{
        display:'flex', gap:16, flexWrap:'wrap', alignItems:'center',
        background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8,
        padding:'10px 16px', marginBottom:28, fontSize:12, color:'#475569',
      }}>
        <span style={{fontWeight:700, color:'#0f172a', marginRight:4}}>Color key:</span>
        {[
          {state:'on',   label:'On (dark)'},
          {state:'off',  label:'Off (light)'},
          {state:'free', label:'Free / unset (grey)'},
          {state:'F-on', label:'Forced on (green)'},
          {state:'F-off',label:'Forced off (red)'},
        ].map(({state,label})=>{
          const s = NS[state];
          return (
            <span key={state} style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width={22} height={22} style={{flexShrink:0}}>
                <circle cx={11} cy={11} r={10} fill={s.bg} stroke={s.bdr} strokeWidth={2}/>
              </svg>
              {label}
            </span>
          );
        })}
      </div>

      {/* ── Section 1: Arrows ── */}
      <h2 style={h2}>What do arrows mean?</h2>
      <p style={p}>
        An arrow from A to B means: <strong>when A is on, it turns B on.</strong> If A is off, B stays off (unless something else turns it on).
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
        <SetObserve
          title="A is on"
          before={AB_POS.map((n,i) => ({...n, state: i===0?'on':'free'}))}
          after={AB_POS.map(n => ({...n, state:'on'}))}
          edges={AB_EDGES} vw={100} vh={44}
        />
        <SetObserve
          title="A is off"
          before={AB_POS.map((n,i) => ({...n, state: i===0?'off':'free'}))}
          after={AB_POS.map(n => ({...n, state:'off'}))}
          edges={AB_EDGES} vw={100} vh={44}
        />
      </div>

      {/* ── Section 2: Forcing ── */}
      <h2 style={h2}>Forcing a variable</h2>
      <p style={p}>
        You can <strong style={{color:'#16a34a'}}>force a variable on</strong> (green) or <strong style={{color:'#dc2626'}}>force it off</strong> (red). A forced variable ignores its incoming arrows — its value is locked no matter what.
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24}}>
        <SetObserve
          title="Force B off — even though A is on"
          note="B's incoming arrow is ignored. A stays on."
          before={[{...AB_POS[0],state:'on'},{...AB_POS[1],state:'F-off'}]}
          after={[{...AB_POS[0],state:'on'},{...AB_POS[1],state:'off'}]}
          edges={AB_EDGES} vw={100} vh={44}
        />
        <SetObserve
          title="Force B on — regardless of A"
          note="B is on even though A is off."
          before={[{...AB_POS[0],state:'off'},{...AB_POS[1],state:'F-on'}]}
          after={[{...AB_POS[0],state:'off'},{...AB_POS[1],state:'on'}]}
          edges={AB_EDGES} vw={100} vh={44}
        />
      </div>

      {/* ── Section 3: Chains ── */}
      <h2 style={h2}>Chains</h2>
      <p style={p}>
        Arrows can form chains: A→B→C→D. Turning A on sets off a cascade all the way to D. But <strong>arrows only point forward</strong> — forcing B on doesn't reach back to A.
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
        <SetObserve
          title="Force A on → full chain fires"
          before={CHAIN_POS.map((n,i)=>({...n,state:i===0?'F-on':'free'}))}
          after={CHAIN_POS.map(n=>({...n,state:'on'}))}
          edges={CHAIN_EDGES} vw={148} vh={44}
        />
        <SetObserve
          title="Force B on (A is free, so A stays off)"
          note="Forcing fires forward only: B, C, D turn on. A stays off."
          before={CHAIN_POS.map((n,i)=>({...n,state:i===1?'F-on':'free'}))}
          after={CHAIN_POS.map((n,i)=>({...n,state:i===0?'off':'on'}))}
          edges={CHAIN_EDGES} vw={148} vh={44}
        />
        <SetObserve
          title="Force B on AND force C off → chain breaks at C"
          note="C is locked off, so D never receives the signal."
          before={CHAIN_POS.map((n,i)=>({...n,state:i===1?'F-on':i===2?'F-off':'free'}))}
          after={CHAIN_POS.map((n,i)=>({...n,state:i===1?'on':'off'}))}
          edges={CHAIN_EDGES} vw={148} vh={44}
        />
      </div>
      <p style={{...p, fontSize:12, color:'#64748b', marginBottom:24}}>
        Notice: in the last case, D stays off because it only receives input from C — and C was forced off.
      </p>

      {/* ── Section 4: Multiple inputs ── */}
      <h2 style={h2}>Multiple inputs: any one is enough</h2>
      <p style={p}>
        If a variable has arrows coming in from more than one place, it turns on when <strong>any one</strong> of those is active — not necessarily all of them.
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:28}}>
        <SetObserve
          title="A on, B off → C still turns on"
          note="C has arrows from both A and B. A being on is enough."
          before={CONV_POS.map((n,i)=>({...n,state:i===0?'on':i===1?'off':'free'}))}
          after={CONV_POS.map((n,i)=>({...n,state:i===1?'off':'on'}))}
          edges={CONV_EDGES} vw={100} vh={90}
        />
        <SetObserve
          title="Both A and B off → C stays off"
          before={CONV_POS.map(n=>({...n,state:'off'}))}
          after={CONV_POS.map(n=>({...n,state:'off'}))}
          edges={CONV_EDGES} vw={100} vh={90}
        />
        <SetObserve
          title="Force C off — even though A is on"
          note="Forcing always overrides incoming arrows."
          before={CONV_POS.map((n,i)=>({...n,state:i===0?'on':i===2?'F-off':'free'}))}
          after={CONV_POS.map((n,i)=>({...n,state:i===0?'on':i===1?'off':'off'}))}
          edges={CONV_EDGES} vw={100} vh={90}
        />
      </div>
    </div>
  );
}
