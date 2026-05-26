import React, { useState, useCallback, useMemo } from 'react';

// ─── Data ─────────────────────────────────────────────────────────────────────

// ─── DAG generation (all 543 labeled DAGs on 4 nodes) ────────────────────────

const _E_PAIRS = (() => {
  const p = [];
  for (let i=0;i<4;i++) for (let j=0;j<4;j++) if(i!==j) p.push([i,j]);
  return p;
})();

function _hasDCycle(edges) {
  const ch = [[],[],[],[]];
  for (const [u,v] of edges) ch[u].push(v);
  const vis = new Set(), rec = new Set();
  function dfs(n) {
    vis.add(n); rec.add(n);
    for (const nb of ch[n]) {
      if (!vis.has(nb) && dfs(nb)) return true;
      if (rec.has(nb)) return true;
    }
    rec.delete(n); return false;
  }
  for (let i=0;i<4;i++) if (!vis.has(i) && dfs(i)) return true;
  return false;
}

const EXPLORE_DATA = (() => {
  const N = ['A','B','C','D'];
  const list = [];
  for (let mask=0; mask<(1<<12); mask++) {
    const edges = _E_PAIRS.filter((_,k)=>(mask>>k)&1);
    if (!_hasDCycle(edges)) {
      const edge_str = edges.length ? edges.map(([u,v])=>`${N[u]}→${N[v]}`).join(', ') : '(no arrows)';
      list.push({edges, edge_str});
    }
  }
  return list;
})();

// ─── Bot precomputation ───────────────────────────────────────────────────────

const ALL_TOGGLES = Array.from({length:81}, (_,m) =>
  [0,1,2,3].map(i => Math.floor(m / 3**i) % 3)
);

const OBS_TABLE = EXPLORE_DATA.map(({edges}) =>
  ALL_TOGGLES.map(t => simulate(edges, t))
);

function toggleToIdx(t) { return t[0] + 3*t[1] + 9*t[2] + 27*t[3]; }

function computeEKL(candidates, toggleIdx) {
  const N = candidates.length;
  if (N <= 1) return 0;
  const counts = {};
  for (const i of candidates) {
    const key = OBS_TABLE[i][toggleIdx].join('');
    counts[key] = (counts[key] || 0) + 1;
  }
  let ekl = 0;
  for (const M of Object.values(counts)) ekl += (M/N) * Math.log2(N/M);
  return ekl;
}

function bestToggleEKL(candidates) {
  let bestIdx = 0, best = -Infinity;
  for (let ti = 0; ti < 81; ti++) {
    const e = computeEKL(candidates, ti);
    if (e > best) { best = e; bestIdx = ti; }
  }
  return { toggleIdx: bestIdx, ekl: best };
}

function filterCandidates(candidates, toggleIdx, obs) {
  const key = obs.join('');
  return candidates.filter(i => OBS_TABLE[i][toggleIdx].join('') === key);
}

function analyzePlayer(experiments, trueDagIdx) {
  let cands = EXPLORE_DATA.map((_,i) => i);
  return experiments.map(exp => {
    const ti = toggleToIdx(exp.toggle);
    const playerEKL = computeEKL(cands, ti);
    const { ekl: maxEKL } = bestToggleEKL(cands);
    cands = filterCandidates(cands, ti, exp.result);
    return { toggle: exp.toggle, obs: exp.result, playerEKL, maxEKL, candidatesAfter: cands.length };
  });
}

function runBot(trueDagIdx) {
  let cands = EXPLORE_DATA.map((_,i) => i);
  const steps = [];
  while (cands.length > 1 && steps.length < 20) {
    const { toggleIdx, ekl } = bestToggleEKL(cands);
    const toggle = ALL_TOGGLES[toggleIdx];
    const obs = OBS_TABLE[trueDagIdx][toggleIdx];
    cands = filterCandidates(cands, toggleIdx, obs);
    steps.push({ toggle, obs, ekl, candidatesAfter: cands.length });
  }
  return steps;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NN = ['A','B','C','D'];
const NP = [[25,27],[75,27],[25,73],[75,73]];
const ALL_DIRECTED_EDGES = [[0,1],[0,2],[0,3],[1,0],[1,2],[1,3],[2,0],[2,1],[2,3],[3,0],[3,1],[3,2]];

const T_STATE = {
  2: {bg:'#f1f5f9', bdr:'#94a3b8', txt:'#64748b', label:'—'},
  1: {bg:'#dcfce7', bdr:'#16a34a', txt:'#166534', label:'ON'},
  0: {bg:'#fee2e2', bdr:'#dc2626', txt:'#991b1b', label:'OFF'},
};

const OSTYLE = {
  0: {bg:'#f8fafc', bdr:'#e2e8f0', txt:'#cbd5e1'},
  1: {bg:'#1e293b', bdr:'#0f172a', txt:'#f1f5f9'},
};

// ─── Simulation ───────────────────────────────────────────────────────────────

function simulate(edges, toggles) {
  const parents = [[],[],[],[]];
  for (const [u,v] of edges) parents[v].push(u);
  const state = toggles.map(v => v === 2 ? null : v);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < 4; i++) {
      if (toggles[i] !== 2) continue;
      if (parents[i].some(p => state[p] === null)) continue;
      const val = parents[i].some(p => state[p] === 1) ? 1 : 0;
      if (state[i] !== val) { state[i] = val; changed = true; }
    }
  }
  return state.map(v => v ?? 0);
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function computeArrow(from, to, r) {
  const [x1,y1]=NP[from],[x2,y2]=NP[to];
  const dx=x2-x1,dy=y2-y1,d=Math.sqrt(dx*dx+dy*dy);
  if(d<1) return null;
  const nx=dx/d,ny=dy/d,px=-ny,py=nx,hl=6,hw=3.2;
  return {
    sx:x1+nx*r, sy:y1+ny*r,
    tx:x2-nx*r, ty:y2-ny*r,
    bx:x2-nx*(r+hl), by:y2-ny*(r+hl),
    px,py,hw,
  };
}

function ArrowShape({from, to, r=10, color='#475569', sw=1.5, dashed=false, opacity=1}) {
  const a = computeArrow(from, to, r);
  if(!a) return null;
  const {sx,sy,tx,ty,bx,by,px,py,hw} = a;
  const da = dashed ? '5 4' : undefined;
  return (
    <g opacity={opacity}>
      <line x1={sx} y1={sy} x2={bx} y2={by}
        stroke={color} strokeWidth={sw} strokeDasharray={da}/>
      <polygon
        points={`${tx},${ty} ${bx+px*hw},${by+py*hw} ${bx-px*hw},${by-py*hw}`}
        fill={color} opacity={dashed?0.5:1}/>
    </g>
  );
}

// ─── Editable DAG canvas ──────────────────────────────────────────────────────

function EditableDag({playerEdges, targetEdges, phase, selectedNode, onNodeClick, onEdgeClick, size=220}) {
  const r = 11;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
      style={{display:'block', userSelect:'none'}}>

      {/* Ghost arrows when node selected */}
      {phase==='drawing' && selectedNode!==null && ALL_DIRECTED_EDGES
        .filter(([f])=>f===selectedNode)
        .filter(([f,t])=>!playerEdges.has(`${f}-${t}`))
        .map(([f,t])=>{
          const a = computeArrow(f,t,r);
          if(!a) return null;
          const {sx,sy,bx,by} = a;
          return (
            <g key={`g${f}${t}`} onClick={e=>{e.stopPropagation();onEdgeClick(f,t,'add');}}
              style={{cursor:'pointer'}}>
              <line x1={sx} y1={sy} x2={bx} y2={by} stroke="transparent" strokeWidth={14}/>
              <ArrowShape from={f} to={t} r={r} color='#93c5fd' dashed opacity={0.9}/>
            </g>
          );
        })
      }

      {/* Player's drawn edges */}
      {Array.from(playerEdges).map(key=>{
        const [u,v] = key.split('-').map(Number);
        let color = '#334155';
        if((phase==='won'||phase==='giveup') && targetEdges) {
          color = targetEdges.has(key) ? '#16a34a' : '#dc2626';
        }
        const a = computeArrow(u,v,r);
        if(!a) return null;
        const {sx,sy,bx,by} = a;
        return (
          <g key={key}
            onClick={e=>{e.stopPropagation(); if(phase==='drawing') onEdgeClick(u,v,'remove');}}
            style={{cursor: phase==='drawing' ? 'pointer' : 'default'}}>
            <line x1={sx} y1={sy} x2={bx} y2={by} stroke="transparent" strokeWidth={14}/>
            <ArrowShape from={u} to={v} r={r} color={color} sw={2}/>
          </g>
        );
      })}

      {/* Missing edges on won/giveup */}
      {(phase==='won'||phase==='giveup') && targetEdges && Array.from(targetEdges)
        .filter(key=>!playerEdges.has(key))
        .map(key=>{
          const [u,v] = key.split('-').map(Number);
          return (
            <ArrowShape key={`miss-${key}`} from={u} to={v} r={r}
              color='#f59e0b' dashed sw={2}/>
          );
        })
      }

      {/* Nodes */}
      {[0,1,2,3].map(i=>{
        const [cx,cy]=NP[i];
        const sel = selectedNode===i;
        return (
          <g key={i} onClick={e=>{e.stopPropagation(); onNodeClick(i);}}
            style={{cursor: phase==='drawing'?'pointer':'default'}}>
            <circle cx={cx} cy={cy} r={r}
              fill={sel?'#dbeafe':'#fff'}
              stroke={sel?'#2563eb':'#64748b'}
              strokeWidth={sel?2.5:1.5}/>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
              fontSize="10" fontWeight="700"
              fill={sel?'#1d4ed8':'#374151'}
              fontFamily="system-ui,sans-serif"
              style={{pointerEvents:'none'}}>
              {NN[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Toggle Button ────────────────────────────────────────────────────────────

function ToggleButton({nodeIdx, value, onClick}) {
  const s = T_STATE[value];
  return (
    <div onClick={onClick} style={{
      width:58, height:58, borderRadius:8, cursor:'pointer',
      background:s.bg, border:`2px solid ${s.bdr}`,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:3, userSelect:'none',
      transition:'background 0.1s, border-color 0.1s',
    }}>
      <span style={{fontSize:14,fontWeight:800,color:s.txt,lineHeight:1}}>
        {NN[nodeIdx]}
      </span>
      <span style={{fontSize:10,fontWeight:700,color:s.bdr,lineHeight:1}}>
        {s.label}
      </span>
    </div>
  );
}

// ─── Experiment Row ───────────────────────────────────────────────────────────

function ExperimentRow({toggle, result, idx}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:5,
      padding:'5px 0', borderBottom:'1px solid #f1f5f9', fontSize:10,
    }}>
      <span style={{minWidth:18,color:'#94a3b8',fontWeight:700,flexShrink:0}}>{idx+1}</span>

      {toggle.map((v,i) => {
        const s = T_STATE[v];
        return (
          <div key={i} style={{
            width:26,height:26,borderRadius:4,flexShrink:0,
            background:s.bg,border:`1.5px solid ${s.bdr}`,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          }}>
            <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[i]}</span>
            <span style={{fontSize:7,fontWeight:600,color:s.bdr,lineHeight:1.15}}>{s.label}</span>
          </div>
        );
      })}

      <span style={{color:'#cbd5e1',fontSize:12,flexShrink:0}}>→</span>

      {result.map((v,i) => {
        const s = OSTYLE[v];
        return (
          <div key={i} style={{
            width:26,height:26,borderRadius:4,flexShrink:0,
            background:s.bg,border:`1.5px solid ${s.bdr}`,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          }}>
            <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[i]}</span>
            <span style={{fontSize:7,fontWeight:600,color:s.txt,lineHeight:1.15}}>{v?'on':'off'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function hasCycle(edgeSet) {
  const children={};
  for(let i=0;i<4;i++) children[i]=[];
  for(const key of edgeSet){
    const [u,v]=key.split('-').map(Number);
    children[u].push(v);
  }
  const visited=new Set(),recStack=new Set();
  function dfs(node){
    visited.add(node);recStack.add(node);
    for(const nb of children[node]){
      if(!visited.has(nb)&&dfs(nb)) return true;
      if(recStack.has(nb)) return true;
    }
    recStack.delete(node);
    return false;
  }
  for(let i=0;i<4;i++) if(!visited.has(i)&&dfs(i)) return true;
  return false;
}

function setsEqual(a,b){
  if(a.size!==b.size) return false;
  for(const x of a) if(!b.has(x)) return false;
  return true;
}

function btnStyle(color) {
  return {
    background:color,color:'#fff',border:'none',borderRadius:6,
    padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer',
  };
}

// ─── Analysis Row ─────────────────────────────────────────────────────────────

function AnalysisRow({ toggle, obs, playerEKL, maxEKL, idx, isBot }) {
  const ratio = maxEKL > 0 ? playerEKL / maxEKL : 1;
  const eklColor = ratio >= 0.9 ? '#16a34a' : ratio >= 0.6 ? '#d97706' : '#dc2626';
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:5,
      padding:'5px 0', borderBottom:'1px solid #f1f5f9', fontSize:10,
    }}>
      <span style={{minWidth:18,color:'#94a3b8',fontWeight:700,flexShrink:0}}>{idx+1}</span>
      {toggle.map((v,i) => {
        const s = T_STATE[v];
        return (
          <div key={i} style={{
            width:26,height:26,borderRadius:4,flexShrink:0,
            background:s.bg,border:`1.5px solid ${s.bdr}`,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          }}>
            <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[i]}</span>
            <span style={{fontSize:7,fontWeight:600,color:s.bdr,lineHeight:1.15}}>{s.label}</span>
          </div>
        );
      })}
      <span style={{color:'#cbd5e1',fontSize:12,flexShrink:0}}>→</span>
      {obs.map((v,i) => {
        const s = OSTYLE[v];
        return (
          <div key={i} style={{
            width:26,height:26,borderRadius:4,flexShrink:0,
            background:s.bg,border:`1.5px solid ${s.bdr}`,
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          }}>
            <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[i]}</span>
            <span style={{fontSize:7,fontWeight:600,color:s.txt,lineHeight:1.15}}>{v?'on':'off'}</span>
          </div>
        );
      })}
      <span style={{marginLeft:4,fontSize:9,fontWeight:700,
        color:isBot?'#16a34a':eklColor,flexShrink:0}}>
        {playerEKL.toFixed(2)}
      </span>
      {!isBot && (
        <span style={{fontSize:9,color:'#94a3b8',flexShrink:0}}>
          /{maxEKL.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function ExploreGame() {
  const [order]        = useState(()=>shuffle([...Array(EXPLORE_DATA.length).keys()]));
  const [roundIdx,      setRoundIdx]     = useState(0);
  const [toggles,       setToggles]      = useState([2,2,2,2]);
  const [experiments,   setExperiments]  = useState([]);
  const [playerEdges,   setPlayerEdges]  = useState(new Set());
  const [selectedNode,  setSelectedNode] = useState(null);
  const [phase,         setPhase]        = useState('drawing');
  const [cycleWarning,  setCycleWarning] = useState(false);
  const [roundsDone,    setRoundsDone]   = useState(0);

  const trueDagIdx = order[roundIdx % order.length];
  const d = EXPLORE_DATA[trueDagIdx];
  const targetEdges = new Set(d.edges.map(([u,v])=>`${u}-${v}`));

  const analysis = useMemo(() => {
    if (phase !== 'won' && phase !== 'giveup') return null;
    return {
      player: analyzePlayer(experiments, trueDagIdx),
      bot: runBot(trueDagIdx),
    };
  }, [phase, experiments, trueDagIdx]);

  // ── toggle cycling ────────────────────────────────────────────────────────

  const cycleToggle = (i) => {
    setToggles(prev => {
      const next=[...prev];
      next[i] = next[i]===2 ? 1 : next[i]===1 ? 0 : 2;
      return next;
    });
  };

  const handleRunExperiment = () => {
    const result = simulate(d.edges, toggles);
    setExperiments(prev=>[...prev,{toggle:[...toggles],result}]);
  };

  const handleResetToggles = () => setToggles([2,2,2,2]);

  // ── edge / node interaction ───────────────────────────────────────────────

  const handleNodeClick = useCallback((i)=>{
    if(phase!=='drawing') return;
    if(selectedNode===null){
      setSelectedNode(i);
    } else if(selectedNode===i){
      setSelectedNode(null);
    } else {
      const key=`${selectedNode}-${i}`;
      const next=new Set(playerEdges);
      if(!next.has(key)){
        next.add(key);
        if(hasCycle(next)){
          setCycleWarning(true);
          setTimeout(()=>setCycleWarning(false),2000);
        } else {
          setPlayerEdges(next);
          setCycleWarning(false);
        }
      }
      setSelectedNode(null);
    }
  },[phase,selectedNode,playerEdges]);

  const handleEdgeClick = useCallback((u,v,action)=>{
    if(phase!=='drawing') return;
    if(action==='remove'){
      setPlayerEdges(prev=>{ const n=new Set(prev); n.delete(`${u}-${v}`); return n; });
      setSelectedNode(null);
    } else {
      const key=`${u}-${v}`;
      const next=new Set(playerEdges);
      if(!next.has(key)){
        next.add(key);
        if(hasCycle(next)){
          setCycleWarning(true);
          setTimeout(()=>setCycleWarning(false),2000);
        } else {
          setPlayerEdges(next);
        }
      }
      setSelectedNode(null);
    }
  },[phase,playerEdges]);

  // ── submit / next ─────────────────────────────────────────────────────────

  const handleSubmit = () => {
    setSelectedNode(null);
    const won = setsEqual(playerEdges,targetEdges);
    setPhase(won?'won':'feedback');
    if(won) setRoundsDone(r=>r+1);
  };

  const handleTryAgain = () => setPhase('drawing');

  const handleGiveUp = () => {
    setSelectedNode(null);
    setPlayerEdges(new Set(targetEdges));
    setPhase('giveup');
  };

  const handleNext = () => {
    setRoundIdx(i=>i+1);
    setToggles([2,2,2,2]);
    setExperiments([]);
    setPlayerEdges(new Set());
    setSelectedNode(null);
    setPhase('drawing');
    setCycleWarning(false);
  };

  const handleClear = () => { setPlayerEdges(new Set()); setSelectedNode(null); };

  return (
    <div
      style={{
        fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
        maxWidth:860,margin:'0 auto',padding:20,color:'#0f172a',
      }}
      onClick={()=>{ if(phase==='drawing') setSelectedNode(null); }}
    >
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',
        alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,margin:0,letterSpacing:-0.3}}>
            Explore Game
          </h1>
          <div style={{fontSize:12,color:'#64748b',marginTop:3}}>
            Run your own experiments to uncover the hidden network
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {roundsDone>0 && (
            <div style={{fontSize:12,color:'#475569',fontWeight:600}}>
              {roundsDone} solved
            </div>
          )}
          <div style={{background:'#f1f5f9',borderRadius:6,padding:'4px 12px',
            fontSize:12,fontWeight:700,color:'#475569'}}>
            Round {roundIdx+1}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-start'}}>

        {/* ── Left: Experiment Lab ── */}
        <div style={{flex:1,minWidth:300}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>
            Experiment Lab
          </div>
          <div style={{fontSize:12,color:'#475569',marginBottom:10,lineHeight:1.6}}>
            Set each variable to{' '}
            <span style={{color:'#16a34a',fontWeight:700}}>forced on</span>,{' '}
            <span style={{color:'#dc2626',fontWeight:700}}>forced off</span>, or{' '}
            <span style={{color:'#64748b',fontWeight:700}}>free (—)</span>, then run it.
            Click a button to cycle through states.
          </div>

          {/* Toggle buttons */}
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            {[0,1,2,3].map(i=>(
              <ToggleButton
                key={i}
                nodeIdx={i}
                value={toggles[i]}
                onClick={e=>{ e.stopPropagation(); cycleToggle(i); }}
              />
            ))}
          </div>

          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button
              onClick={e=>{ e.stopPropagation(); handleRunExperiment(); }}
              style={{...btnStyle('#0f172a'),flex:1}}
            >
              Run Experiment
            </button>
            <button
              onClick={e=>{ e.stopPropagation(); handleResetToggles(); }}
              style={{background:'none',border:'1px solid #e2e8f0',color:'#64748b',
                borderRadius:6,padding:'7px 12px',fontSize:12,cursor:'pointer'}}
            >
              Reset
            </button>
          </div>

          {/* History */}
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>
            Results ({experiments.length})
          </div>

          {experiments.length===0 ? (
            <div style={{fontSize:11,color:'#94a3b8',padding:'14px 0',
              fontStyle:'italic',textAlign:'center'}}>
              No experiments yet — set some variables above and click Run
            </div>
          ) : (
            <div style={{maxHeight:340,overflowY:'auto',paddingRight:2}}>
              {[...experiments].reverse().map((exp,i)=>(
                <ExperimentRow
                  key={i}
                  toggle={exp.toggle}
                  result={exp.result}
                  idx={experiments.length-1-i}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Drawing ── */}
        <div style={{flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
            Your Drawing
          </div>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:8,lineHeight:1.6,width:220}}>
            {phase==='drawing'
              ? selectedNode!==null
                ? `Node ${NN[selectedNode]} selected — click target or click again to deselect`
                : 'Click a node to select it as edge source'
              : (phase==='won'||phase==='giveup')
                ? '✓ Answer revealed'
                : 'Check your drawing and try again'
            }
          </div>

          <div style={{
            borderRadius:10,
            border:`2px solid ${(phase==='won'||phase==='giveup')?'#86efac':phase==='feedback'?'#fcd34d':'#e2e8f0'}`,
            display:'inline-block',overflow:'hidden',
            background:(phase==='won'||phase==='giveup')?'#f0fdf4':'#fff',
          }}>
            <EditableDag
              playerEdges={playerEdges}
              targetEdges={(phase==='won'||phase==='giveup') ? targetEdges : null}
              phase={phase}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              size={220}
            />
          </div>

          {cycleWarning && (
            <div style={{marginTop:6,padding:'5px 10px',background:'#fef2f2',
              border:'1px solid #fca5a5',borderRadius:6,
              fontSize:11,color:'#dc2626',fontWeight:600}}>
              Can't add: would create a cycle
            </div>
          )}

          <div style={{marginTop:8,fontSize:10,color:'#94a3b8'}}>
            {playerEdges.size} edge{playerEdges.size!==1?'s':''} drawn
          </div>

          {/* Action buttons */}
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {phase==='drawing' && (
              <>
                <button onClick={handleSubmit} style={btnStyle('#0f172a')}>
                  Submit Guess
                </button>
                <button onClick={handleClear}
                  style={{background:'none',border:'1px solid #e2e8f0',color:'#64748b',
                    borderRadius:6,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>
                  Clear
                </button>
                <button onClick={handleGiveUp}
                  style={{background:'none',border:'1px solid #fca5a5',color:'#dc2626',
                    borderRadius:6,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>
                  Give Up
                </button>
              </>
            )}
            {phase==='feedback' && (
              <button onClick={handleTryAgain} style={btnStyle('#92400e')}>
                Edit &amp; Retry
              </button>
            )}
            {(phase==='won'||phase==='giveup') && (
              <button onClick={handleNext} style={btnStyle('#15803d')}>
                Next Round →
              </button>
            )}
          </div>

          {/* Feedback */}
          {phase==='feedback' && (
            <div style={{
              marginTop:10,padding:'10px 14px',borderRadius:8,
              background:'#fff7ed',border:'1.5px solid #fcd34d',maxWidth:240,
            }}>
              <div style={{fontSize:13,fontWeight:700,color:'#92400e',marginBottom:4}}>
                Not quite yet
              </div>
              <div style={{fontSize:11,color:'#78350f',lineHeight:1.7}}>
                Keep experimenting and try again.
              </div>
            </div>
          )}

          {(phase==='won'||phase==='giveup') && (
            <div style={{
              marginTop:10,padding:'10px 14px',borderRadius:8,
              background:phase==='giveup'?'#fef2f2':'#f0fdf4',
              border:`1px solid ${phase==='giveup'?'#fca5a5':'#86efac'}`,
              maxWidth:240,fontSize:11,lineHeight:1.7,
              color:phase==='giveup'?'#991b1b':'#166534',
            }}>
              <strong>Answer: </strong>{d.edge_str}
            </div>
          )}
        </div>
      </div>

      {/* Bot Analysis */}
      {analysis && (
        <div style={{marginTop:28,borderTop:'2px solid #e2e8f0',paddingTop:20}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',letterSpacing:-0.2,marginBottom:6}}>
            Bot Analysis
          </div>
          {(() => {
            const ps = analysis.player.length, bs = analysis.bot.length;
            const avgP = ps > 0 ? analysis.player.reduce((s,r)=>s+r.playerEKL,0)/ps : 0;
            const avgM = ps > 0 ? analysis.player.reduce((s,r)=>s+r.maxEKL,0)/ps : 0;
            const pct = avgM > 0 ? Math.round((avgP/avgM)*100) : (ps===0?0:100);
            return (
              <div style={{fontSize:11,color:'#475569',marginBottom:16,
                display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
                <span>
                  You used <strong>{ps}</strong> experiment{ps!==1?'s':''}
                  &nbsp;·&nbsp;Bot used <strong>{bs}</strong> experiment{bs!==1?'s':''}
                </span>
                {ps > 0 && (
                  <span style={{
                    background:pct>=90?'#dcfce7':pct>=60?'#fef9c3':'#fee2e2',
                    color:pct>=90?'#166534':pct>=60?'#854d0e':'#991b1b',
                    border:`1px solid ${pct>=90?'#86efac':pct>=60?'#fde047':'#fca5a5'}`,
                    borderRadius:6,padding:'2px 8px',fontWeight:700,fontSize:11,
                  }}>
                    Efficiency: {pct}%
                  </span>
                )}
              </div>
            );
          })()}
          <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-start'}}>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
                textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
                Your Experiments
              </div>
              {analysis.player.length === 0
                ? <div style={{fontSize:11,color:'#94a3b8',fontStyle:'italic'}}>No experiments run</div>
                : analysis.player.map((r,i) =>
                    <AnalysisRow key={i} idx={i} toggle={r.toggle} obs={r.obs}
                      playerEKL={r.playerEKL} maxEKL={r.maxEKL} isBot={false}/>
                  )
              }
              {analysis.player.length > 0 && (
                <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>
                  EKL shown · /optimal — green ≥90% · yellow ≥60% · red below
                </div>
              )}
            </div>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
                textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
                Bot's Strategy
              </div>
              {analysis.bot.length === 0
                ? <div style={{fontSize:11,color:'#94a3b8',fontStyle:'italic'}}>Trivial (already identified)</div>
                : analysis.bot.map((r,i) =>
                    <AnalysisRow key={i} idx={i} toggle={r.toggle} obs={r.obs}
                      playerEKL={r.ekl} maxEKL={r.ekl} isBot={true}/>
                  )
              }
              {analysis.bot.length > 0 && (
                <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>
                  Greedy max-EKL · always green
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop:24,paddingTop:12,borderTop:'1px solid #e2e8f0',
        fontSize:10,color:'#94a3b8',lineHeight:1.8,
      }}>
        Free variable = on if any input is on · Forced variable ignores all incoming arrows
      </div>
    </div>
  );
}
