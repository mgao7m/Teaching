import React, { useState, useCallback } from 'react';

// ─── Data ─────────────────────────────────────────────────────────────────────

// ─── DAG utilities (all 543 labeled DAGs on 4 nodes) ─────────────────────────

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

const _DAG_PAIRS = (() => {
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

const ALL_PERMS = (() => {
  const perms = [];
  function gen(a, s) {
    if (s === a.length) { perms.push([...a]); return; }
    for (let i=s; i<a.length; i++) {
      [a[s],a[i]]=[a[i],a[s]]; gen(a, s+1); [a[s],a[i]]=[a[i],a[s]];
    }
  }
  gen([0,1,2,3], 0);
  return perms;
})();

const CLASS_DATA = [
  {edges:[],                                          togs:[[0,1,1,2],[1,2,2,2],[2,1,2,1],[2,2,1,1]]},
  {edges:[[0,1]],                                    togs:[[1,1,1,2],[1,2,2,1],[2,2,1,1]]},
  {edges:[[0,1],[0,2]],                              togs:[[0,1,2,1],[1,2,2,2],[2,2,1,1]]},
  {edges:[[0,1],[1,2]],                              togs:[[1,0,2,0],[1,2,2,2],[2,2,2,1]]},
  {edges:[[0,1],[2,1]],                              togs:[[1,2,2,2],[2,2,1,2],[2,2,2,1]]},
  {edges:[[0,1],[2,3]],                              togs:[[1,2,2,2],[2,2,1,2]]},
  {edges:[[0,1],[0,2],[0,3]],                        togs:[[0,1,1,2],[0,1,2,1],[0,2,1,1],[1,2,2,2]]},
  {edges:[[0,1],[0,2],[1,2]],                        togs:[[0,1,2,0],[1,0,2,0],[1,2,1,2],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[1,3]],                        togs:[[0,1,2,1],[0,2,1,0],[1,0,1,2],[1,2,2,2]]},
  {edges:[[0,1],[0,2],[3,0]],                        togs:[[0,1,2,1],[0,2,1,1],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[3,1]],                        togs:[[0,2,1,0],[1,2,2,2],[2,2,2,1]]},
  {edges:[[0,1],[1,2],[2,3]],                        togs:[[0,1,0,2],[1,0,2,2],[1,2,2,2]]},
  {edges:[[0,1],[1,2],[3,1]],                        togs:[[1,0,2,1],[1,2,0,2],[2,2,2,1]]},
  {edges:[[0,1],[1,2],[3,2]],                        togs:[[1,0,2,0],[1,2,2,2],[2,2,2,1]]},
  {edges:[[0,1],[2,1],[3,1]],                        togs:[[1,2,2,2],[2,2,1,2],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[1,2],[2,3]],                  togs:[[0,1,2,0],[1,0,2,2],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[0,3],[1,2]],                  togs:[[0,1,2,2],[0,2,2,1],[1,0,2,0],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[1,2],[1,3]],                  togs:[[0,0,2,1],[0,1,2,0],[1,0,2,2],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[1,2],[3,0]],                  togs:[[0,1,2,0],[0,2,2,1],[1,0,2,0],[2,2,0,1]]},
  {edges:[[0,1],[0,2],[1,2],[3,1]],                  togs:[[0,0,2,1],[1,0,2,0],[1,2,0,2],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[1,2],[3,2]],                  togs:[[0,1,2,0],[1,0,2,0],[1,2,0,2],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[1,3],[2,3]],                  togs:[[0,1,2,2],[0,2,1,2],[1,0,0,2],[1,2,2,0]]},
  {edges:[[0,1],[0,2],[1,3],[3,2]],                  togs:[[0,0,2,1],[0,1,2,0],[1,0,2,2],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[3,1],[3,2]],                  togs:[[0,1,2,0],[0,2,1,0],[1,2,2,2],[2,2,2,1]]},
  {edges:[[0,1],[0,2],[0,3],[1,2],[1,3]],            togs:[[0,0,1,2],[0,0,2,1],[0,1,2,2],[1,0,2,2],[1,2,0,0]]},
  {edges:[[0,1],[0,2],[0,3],[1,2],[2,3]],            togs:[[0,1,0,2],[0,1,2,2],[1,0,2,0],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[0,3],[1,2],[3,2]],            togs:[[0,1,2,2],[0,2,2,1],[1,0,2,0],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[1,2],[1,3],[2,3]],            togs:[[0,1,2,0],[1,0,0,2],[1,0,2,2],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[1,2],[1,3],[3,2]],            togs:[[0,0,2,1],[0,1,2,0],[1,0,2,2],[1,2,0,2]]},
  {edges:[[0,1],[0,2],[1,2],[3,1],[3,2]],            togs:[[0,0,2,1],[0,1,2,0],[1,0,2,0],[1,2,0,2],[2,2,0,1]]},
  {edges:[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],      togs:[[0,0,1,2],[0,1,0,2],[0,1,2,0],[1,0,0,2],[1,0,2,0],[1,2,0,0]]},
];

function findIsomorphism(canonEdges, dagEdges) {
  if (canonEdges.length !== dagEdges.length) return null;
  const dagStr = new Set(dagEdges.map(([u,v])=>`${u}-${v}`));
  for (const perm of ALL_PERMS) {
    if (canonEdges.every(([u,v]) => dagStr.has(`${perm[u]}-${perm[v]}`))) return perm;
  }
  return null;
}

function getMinToggles(dagEdges) {
  for (const cls of CLASS_DATA) {
    const perm = findIsomorphism(cls.edges, dagEdges);
    if (perm !== null) {
      return cls.togs.map(ct => {
        const toggle = [2,2,2,2];
        for (let j=0; j<4; j++) toggle[perm[j]] = ct[j];
        return { toggle, obs: simulate(dagEdges, toggle) };
      });
    }
  }
  return [];
}

function _edgesStr(edges) {
  const N = ['A','B','C','D'];
  if (!edges.length) return '(no arrows)';
  return edges.map(([u,v])=>`${N[u]}→${N[v]}`).join(', ');
}

const ALL_DAG_DATA = (() => {
  const list = [];
  for (let mask=0; mask<(1<<12); mask++) {
    const edges = _DAG_PAIRS.filter((_,k)=>(mask>>k)&1);
    if (!_hasDCycle(edges)) {
      const min_toggles = getMinToggles(edges);
      list.push({edges, edge_str: _edgesStr(edges), min_toggles, n_min_toggles: min_toggles.length});
    }
  }
  return list;
})();

// ─── Constants ────────────────────────────────────────────────────────────────

const NN = ['A','B','C','D'];
const NP = [[25,27],[75,27],[25,73],[75,73]];
const ALL_DIRECTED_EDGES = [[0,1],[0,2],[0,3],[1,0],[1,2],[1,3],[2,0],[2,1],[2,3],[3,0],[3,1],[3,2]];

const TSTYLE = {
  0:{bg:'#fee2e2',bdr:'#dc2626',txt:'#7f1d1d',label:'off'},
  1:{bg:'#dcfce7',bdr:'#16a34a',txt:'#14532d',label:'on'},
  2:{bg:'#f8fafc',bdr:'#94a3b8',txt:'#64748b',label:'—'},
};
const OSTYLE = {
  0:{bg:'#f8fafc',bdr:'#e2e8f0',txt:'#cbd5e1'},
  1:{bg:'#1e293b',bdr:'#0f172a',txt:'#f1f5f9'},
};

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
      {!dashed && (
        <polygon
          points={`${tx},${ty} ${bx+px*hw},${by+py*hw} ${bx-px*hw},${by-py*hw}`}
          fill={color}/>
      )}
      {dashed && (
        <polygon
          points={`${tx},${ty} ${bx+px*hw},${by+py*hw} ${bx-px*hw},${by-py*hw}`}
          fill={color} opacity={0.5}/>
      )}
    </g>
  );
}

// ─── Editable DAG canvas ──────────────────────────────────────────────────────

function EditableDag({playerEdges, targetEdges, phase, selectedNode, onNodeClick, onEdgeClick, size=220}) {
  const r = 11;


  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
      style={{display:'block', userSelect:'none'}}>

      {/* Ghost arrows when node selected (drawing only) */}
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

      {/* Missing edges shown only on correct/giveup, not during feedback */}
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

// ─── Hint card ────────────────────────────────────────────────────────────────

function HintCard({td, idx}) {
  const forced = td.toggle.map((v,i)=>v!==2?`${NN[i]}=${v?'on':'off'}`:null).filter(Boolean);
  const free = td.toggle.map((v,i)=>v===2?NN[i]:null).filter(Boolean);
  return (
    <div style={{
      padding:'10px 12px',borderRadius:8,background:'#f8fafc',
      border:'1px solid #e2e8f0',marginBottom:8,
    }}>
      <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',
        textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>
        Hint {idx+1}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        {/* Intervention */}
        <div style={{display:'flex',gap:5}}>
          {td.toggle.map((v,i)=>{
            const s = TSTYLE[v];
            return (
              <div key={i} style={{
                width:34,height:34,borderRadius:'50%',flexShrink:0,
                background:s.bg,border:`2px solid ${s.bdr}`,
                display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:700,color:s.txt,lineHeight:1.1,
              }}>
                <span>{NN[i]}</span>
                <span style={{fontSize:8,fontWeight:600}}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{color:'#cbd5e1',fontSize:20,flexShrink:0}}>→</div>

        {/* Observation */}
        <div style={{display:'flex',gap:5}}>
          {td.obs.map((v,i)=>{
            const s = OSTYLE[v];
            return (
              <div key={i} style={{
                width:34,height:34,borderRadius:'50%',flexShrink:0,
                background:s.bg,border:`2px solid ${s.bdr}`,
                display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:700,color:s.txt,lineHeight:1.1,
              }}>
                <span>{NN[i]}</span>
                <span style={{fontSize:8,fontWeight:600}}>{v?'on':'off'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{fontSize:10,color:'#94a3b8',marginTop:6,lineHeight:1.6}}>
        <span style={{color:'#475569'}}>Set: </span>
        {forced.join(', ') || 'nothing'}{' · '}
        <span style={{color:'#475569'}}>Free: </span>
        {free.join(', ') || 'nothing'}
      </div>
    </div>
  );
}

// ─── Feedback bar ─────────────────────────────────────────────────────────────

function FeedbackBar({playerEdges, targetEdges, onTryAgain, onNext}) {
  const correct = Array.from(playerEdges).filter(k=>targetEdges.has(k));
  const extra   = Array.from(playerEdges).filter(k=>!targetEdges.has(k));
  const missing = Array.from(targetEdges).filter(k=>!playerEdges.has(k));
  const won = extra.length===0 && missing.length===0;

  return (
    <div style={{
      marginTop:12,padding:'12px 16px',borderRadius:8,
      background: won?'#f0fdf4':'#fff7ed',
      border:`1.5px solid ${won?'#86efac':'#fcd34d'}`,
    }}>
      {won ? (
        <div>
          <div style={{fontSize:15,fontWeight:700,color:'#15803d',marginBottom:4}}>
            Correct!
          </div>
          <button onClick={onNext} style={btnStyle('#15803d')}>Next Round →</button>
        </div>
      ) : (
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'#92400e',marginBottom:4}}>
            Not quite yet
          </div>
          <div style={{fontSize:11,color:'#78350f',marginBottom:8,lineHeight:1.7}}>
            {extra.length>0 && <div style={{color:'#dc2626'}}>
              ✗ {extra.length} wrong edge{extra.length!==1?'s':''} (red)
            </div>}
            {missing.length>0 && <div style={{color:'#d97706'}}>
              ◌ {missing.length} missing edge{missing.length!==1?'s':''} (orange dashed)
            </div>}
            {correct.length>0 && <div style={{color:'#16a34a'}}>
              ✓ {correct.length} correct edge{correct.length!==1?'s':''}
            </div>}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={onTryAgain} style={btnStyle('#92400e')}>Edit &amp; Retry</button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    background:color,color:'#fff',border:'none',borderRadius:6,
    padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer',
  };
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
  const children = {};
  for(let i=0;i<4;i++) children[i]=[];
  for(const key of edgeSet) {
    const [u,v]=key.split('-').map(Number);
    children[u].push(v);
  }
  const visited=new Set(), recStack=new Set();
  function dfs(node) {
    visited.add(node); recStack.add(node);
    for(const nb of children[node]) {
      if(!visited.has(nb) && dfs(nb)) return true;
      if(recStack.has(nb)) return true;
    }
    recStack.delete(node);
    return false;
  }
  for(let i=0;i<4;i++) if(!visited.has(i) && dfs(i)) return true;
  return false;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [order]         = useState(()=>shuffle([...Array(ALL_DAG_DATA.length).keys()]));
  const [roundIdx,      setRoundIdx]      = useState(0);
  const [playerEdges,   setPlayerEdges]   = useState(new Set());
  const [selectedNode,  setSelectedNode]  = useState(null);
  const [phase,         setPhase]         = useState('drawing'); // 'drawing'|'feedback'|'won'
  const [showHow,       setShowHow]       = useState(false);
  const [totalStars,    setTotalStars]    = useState(0);
  const [roundsDone,    setRoundsDone]    = useState(0);
  const [cycleWarning,  setCycleWarning]  = useState(false);

  const d = ALL_DAG_DATA[order[roundIdx % order.length]];
  const targetEdges = new Set(d.edges.map(([u,v])=>`${u}-${v}`));

  // ── edge / node interaction ───────────────────────────────────────────────

  const handleNodeClick = useCallback((i)=>{
    if(phase!=='drawing') return;
    if(selectedNode===null) {
      setSelectedNode(i);
    } else if(selectedNode===i) {
      setSelectedNode(null);
    } else {
      const key = `${selectedNode}-${i}`;
      const next = new Set(playerEdges);
      if(!next.has(key)) {
        next.add(key);
        if(hasCycle(next)) {
          setCycleWarning(true);
          setTimeout(()=>setCycleWarning(false), 2000);
        } else {
          setPlayerEdges(next);
          setCycleWarning(false);
        }
      }
      setSelectedNode(null);
    }
  }, [phase, selectedNode, playerEdges]);

  const handleEdgeClick = useCallback((u,v,action)=>{
    if(phase!=='drawing') return;
    if(action==='remove') {
      setPlayerEdges(prev=>{ const n=new Set(prev); n.delete(`${u}-${v}`); return n; });
      setSelectedNode(null);
    } else {
      const key=`${u}-${v}`;
      const next=new Set(playerEdges);
      if(!next.has(key)) {
        next.add(key);
        if(hasCycle(next)) {
          setCycleWarning(true);
          setTimeout(()=>setCycleWarning(false),2000);
        } else {
          setPlayerEdges(next);
        }
      }
      setSelectedNode(null);
    }
  },[phase, playerEdges]);

  // ── submit / next ─────────────────────────────────────────────────────────

  const handleSubmit = ()=>{
    setSelectedNode(null);
    const won = setsEqual(playerEdges, targetEdges);
    setPhase(won ? 'won' : 'feedback');
    if(won) {
      setTotalStars(s=>s+1);
      setRoundsDone(r=>r+1);
    }
  };

  const handleTryAgain = ()=>{ setPhase('drawing'); };

  const handleGiveUp = ()=>{
    setSelectedNode(null);
    setPlayerEdges(new Set(targetEdges));
    setPhase('giveup');
  };

  const handleNext = ()=>{
    setRoundIdx(i=>i+1);
    setPlayerEdges(new Set());
    setSelectedNode(null);
    setPhase('drawing');
    setCycleWarning(false);
  };

  const handleClear = ()=>{ setPlayerEdges(new Set()); setSelectedNode(null); };

  const roundNum = roundIdx+1;

  return (
    <div style={{
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
      maxWidth:820,margin:'0 auto',padding:20,color:'#0f172a',
    }}
    onClick={()=>{ if(phase==='drawing') setSelectedNode(null); }}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',
        alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,margin:0,letterSpacing:-0.3}}>
            DAG Detective
          </h1>
          <div style={{fontSize:12,color:'#64748b',marginTop:3}}>
            Infer the causal graph from intervention experiments
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          {roundsDone>0 && (
            <div style={{fontSize:12,color:'#475569',fontWeight:600}}>
              {'★'.repeat(Math.min(totalStars,10))} {totalStars} star{totalStars!==1?'s':''} · {roundsDone} solved
            </div>
          )}
          <div style={{
            background:'#f1f5f9',borderRadius:6,padding:'4px 12px',
            fontSize:12,fontWeight:700,color:'#475569',
          }}>
            Round {roundNum}
          </div>
          <button onClick={()=>setShowHow(h=>!h)} style={{
            background:'none',border:'1px solid #e2e8f0',borderRadius:6,
            padding:'4px 10px',fontSize:11,color:'#64748b',cursor:'pointer',
          }}>
            {showHow?'Hide':'How to play'}
          </button>
        </div>
      </div>

      {/* How to play */}
      {showHow && (
        <div style={{
          marginBottom:16,padding:'12px 16px',background:'#f8fafc',
          borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,
          color:'#475569',lineHeight:1.8,
        }}>
          <strong style={{color:'#0f172a'}}>Goal:</strong> Reconstruct the hidden DAG on nodes A, B, C, D.
          <br/>
          <strong style={{color:'#0f172a'}}>Hints</strong> show <em>interventions</em>: each node is forced ON (green), OFF (red), or left free (gray). The result shows which nodes ended up ON or OFF. Free nodes follow <strong>OR logic</strong> — a free node turns ON if any of its parents are ON.
          <br/>
          <strong style={{color:'#0f172a'}}>Draw edges</strong> by clicking a source node, then a target node. Click an existing edge to remove it. Cycles are not allowed.
          <br/>
          <strong style={{color:'#0f172a'}}>Stars</strong> are awarded based on how few hints you needed. ★★★ = solved with ≤ half the minimum hints.
        </div>
      )}

      {/* Difficulty badge */}
      <div style={{
        display:'inline-flex',alignItems:'center',gap:8,
        marginBottom:14,padding:'4px 12px',borderRadius:20,
        background:'#f1f5f9',border:'1px solid #e2e8f0',fontSize:11,
      }}>
        <span style={{color:'#64748b'}}>Minimum hints needed for this network:</span>
        <strong style={{color:'#0f172a'}}>{d.n_min_toggles}</strong>
      </div>

      {/* Main game area */}
      <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-start'}}>

        {/* Left: canvas */}
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
              : phase==='won'
                ? '✓ Correct answer'
                : phase==='giveup'
                  ? '✓ Answer revealed'
                  : 'Green = correct · Red = wrong · Orange dashed = missing'
            }
          </div>

          <div style={{
            borderRadius:10,border:`2px solid ${
              (phase==='won'||phase==='giveup')?'#86efac':phase==='feedback'?'#fcd34d':'#e2e8f0'}`,
            display:'inline-block',overflow:'hidden',
            background: (phase==='won'||phase==='giveup')?'#f0fdf4':'#fff',
          }}>
            <EditableDag
              playerEdges={playerEdges}
              targetEdges={phase!=='drawing' ? targetEdges : null}
              phase={phase}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              size={220}
            />
          </div>

          {/* Cycle warning */}
          {cycleWarning && (
            <div style={{
              marginTop:6,padding:'5px 10px',background:'#fef2f2',
              border:'1px solid #fca5a5',borderRadius:6,
              fontSize:11,color:'#dc2626',fontWeight:600,
            }}>
              Can't add: would create a cycle (DAGs are acyclic)
            </div>
          )}

          {/* Edge count info */}
          <div style={{marginTop:8,fontSize:10,color:'#94a3b8'}}>
            {playerEdges.size} edge{playerEdges.size!==1?'s':''} drawn
          </div>

          {/* Action buttons */}
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {phase==='drawing' && (
              <>
                <button onClick={handleSubmit}
                  style={{...btnStyle('#0f172a'),opacity:playerEdges.size===0?0.5:1}}>
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
            {(phase==='won'||phase==='giveup') && (
              <button onClick={handleNext} style={btnStyle('#15803d')}>
                Next Round →
              </button>
            )}
          </div>

          {/* Feedback bar */}
          {(phase==='feedback'||phase==='won') && (
            <div style={{maxWidth:240,marginTop:0}}>
              <FeedbackBar
                playerEdges={playerEdges}
                targetEdges={targetEdges}
                onTryAgain={handleTryAgain}
                onNext={handleNext}
              />
            </div>
          )}
        </div>

        {/* Right: hints */}
        <div style={{flex:1,minWidth:280}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
            Evidence ({d.n_min_toggles} experiment{d.n_min_toggles!==1?'s':''})
          </div>

          {d.min_toggles.map((td,i)=>(
            <HintCard key={i} td={td} idx={i}/>
          ))}

          {(phase==='won'||phase==='giveup') && (
            <div style={{
              marginTop:8,padding:'10px 12px',
              background: phase==='giveup'?'#fef2f2':'#f0fdf4',
              border:`1px solid ${phase==='giveup'?'#fca5a5':'#86efac'}`,
              borderRadius:8,fontSize:11,
              color: phase==='giveup'?'#991b1b':'#166534',
              lineHeight:1.7,
            }}>
              <strong>Answer: </strong>{d.edge_str || 'no edges'}<br/>
              These {d.n_min_toggles} experiment{d.n_min_toggles!==1?'s were':' was'} the theoretical minimum to identify this network.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop:24,paddingTop:12,borderTop:'1px solid #e2e8f0',
        fontSize:10,color:'#94a3b8',lineHeight:1.8,
      }}>
        OR causal semantics · free node = ON iff any parent is ON · forcing a node severs its incoming edges
      </div>
    </div>
  );
}

function setsEqual(a,b){
  if(a.size!==b.size) return false;
  for(const x of a) if(!b.has(x)) return false;
  return true;
}
