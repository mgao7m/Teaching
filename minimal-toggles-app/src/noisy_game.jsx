import React, { useState, useCallback, useMemo } from 'react';

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

const ALL_TOGGLES = Array.from({length:81}, (_,m) =>
  [0,1,2,3].map(i => Math.floor(m / 3**i) % 3)
);

// ─── Precomputed parent structures ────────────────────────────────────────────

function topoSort(edges) {
  const inDeg = [0,0,0,0];
  const children = [[],[],[],[]];
  for (const [u,v] of edges) { inDeg[v]++; children[u].push(v); }
  const queue = [];
  for (let i=0;i<4;i++) if(inDeg[i]===0) queue.push(i);
  const order = [];
  while(queue.length) {
    const u = queue.shift();
    order.push(u);
    for(const v of children[u]) if(--inDeg[v]===0) queue.push(v);
  }
  return order;
}

const DAG_PARENTS = EXPLORE_DATA.map(({edges}) => {
  const parents = [[],[],[],[]];
  for (const [u,v] of edges) parents[v].push(u);
  return parents;
});

const TOPO_ORDERS = EXPLORE_DATA.map(({edges}) => topoSort(edges));

// PARENT_INFO[dagIdx][toggleIdx] = [{nodeIdx, parents}] for free nodes only
const PARENT_INFO = EXPLORE_DATA.map((_, di) =>
  ALL_TOGGLES.map(toggle =>
    [0,1,2,3]
      .filter(i => toggle[i] === 2)
      .map(i => ({nodeIdx: i, parents: DAG_PARENTS[di][i]}))
  )
);

function toggleToIdx(t) { return t[0] + 3*t[1] + 9*t[2] + 27*t[3]; }

// ─── Noisy-OR simulation ──────────────────────────────────────────────────────

function simulateNoisy(dagIdx, toggle, wS, wB) {
  const parents = DAG_PARENTS[dagIdx];
  const state = [0,0,0,0];
  for (let i=0;i<4;i++) if(toggle[i]!==2) state[i]=toggle[i];
  for (const i of TOPO_ORDERS[dagIdx]) {
    if (toggle[i]!==2) continue;
    let k=0;
    for (const p of parents[i]) k+=state[p];
    const prob = 1-(1-wB)*Math.pow(1-wS, k);
    state[i] = Math.random()<prob ? 1 : 0;
  }
  return state;
}

// ─── Bayesian inference ───────────────────────────────────────────────────────

function bayesUpdate(posterior, toggleIdx, obs, wS, wB) {
  const wSf=1-wS;
  const wSpow=[1, wSf, wSf*wSf, wSf*wSf*wSf];
  const newPost = new Float64Array(543);
  let sum=0;
  for (let m=0;m<543;m++) {
    if(posterior[m]<1e-300) continue;
    const info=PARENT_INFO[m][toggleIdx];
    let lik=1;
    for(const {nodeIdx,parents} of info) {
      let k=0;
      for(const p of parents) k+=obs[p];
      const prob=1-(1-wB)*wSpow[k];
      lik*=obs[nodeIdx]===1?prob:(1-prob);
    }
    newPost[m]=posterior[m]*lik;
    sum+=newPost[m];
  }
  if(sum<1e-300) return posterior;
  for(let m=0;m<543;m++) newPost[m]/=sum;
  return newPost;
}

function posteriorEntropy(posterior) {
  let h=0;
  for(let m=0;m<543;m++) {
    const p=posterior[m];
    if(p>1e-300) h-=p*Math.log2(p);
  }
  return h;
}

// Returns Σ_d P(d|toggle) * H(M|d,toggle) — subtract from H(prior) to get EIG
function computeConditionalH(posterior, toggleIdx, wS, wB) {
  const toggle=ALL_TOGGLES[toggleIdx];
  const freeNodes=[0,1,2,3].filter(i=>toggle[i]===2);
  const nFree=freeNodes.length;
  if(nFree===0) return posteriorEntropy(posterior);
  const nOutcomes=1<<nFree;
  const wSf=1-wS;
  const wSpow=[1, wSf, wSf*wSf, wSf*wSf*wSf];
  const baseObs=[0,0,0,0];
  for(let i=0;i<4;i++) if(toggle[i]===1) baseObs[i]=1;
  const unnorm=new Float64Array(543);
  let conditionalH=0;
  for(let oi=0;oi<nOutcomes;oi++) {
    const obs=[...baseObs];
    for(let b=0;b<nFree;b++) obs[freeNodes[b]]=(oi>>b)&1;
    let marginal=0;
    for(let m=0;m<543;m++) {
      if(posterior[m]<1e-300) { unnorm[m]=0; continue; }
      const info=PARENT_INFO[m][toggleIdx];
      let lik=1;
      for(const {nodeIdx,parents} of info) {
        let k=0;
        for(const p of parents) k+=obs[p];
        const prob=1-(1-wB)*wSpow[k];
        lik*=obs[nodeIdx]===1?prob:(1-prob);
      }
      unnorm[m]=posterior[m]*lik;
      marginal+=unnorm[m];
    }
    if(marginal<1e-300) continue;
    let postH=0;
    for(let m=0;m<543;m++) {
      const p=unnorm[m]/marginal;
      if(p>1e-300) postH-=p*Math.log2(p);
    }
    conditionalH+=marginal*postH;
  }
  return conditionalH;
}

function computeEIG(posterior, toggleIdx, wS, wB) {
  return posteriorEntropy(posterior)-computeConditionalH(posterior,toggleIdx,wS,wB);
}

function bestToggleEIG(posterior, wS, wB) {
  let bestIdx=0, best=-Infinity;
  for(let ti=0;ti<81;ti++) {
    const eig=computeEIG(posterior,ti,wS,wB);
    if(eig>best) { best=eig; bestIdx=ti; }
  }
  return {toggleIdx:bestIdx, eig:best};
}

// Shadow-posterior replay of player's experiments for post-game analysis
function analyzePlayer(experiments, wS, wB) {
  let posterior=new Float64Array(543).fill(1/543);
  return experiments.map(exp => {
    const ti=toggleToIdx(exp.toggle);
    const playerEIG=computeEIG(posterior,ti,wS,wB);
    const {eig:maxEIG}=bestToggleEIG(posterior,wS,wB);
    posterior=bayesUpdate(posterior,ti,exp.result,wS,wB);
    return {toggle:exp.toggle,obs:exp.result,playerEIG,maxEIG};
  });
}

function runBayesBot(trueDagIdx, wS, wB) {
  let posterior=new Float64Array(543).fill(1/543);
  const steps=[];
  while(steps.length<30) {
    if(posteriorEntropy(posterior)<0.5) break;
    const {toggleIdx,eig}=bestToggleEIG(posterior,wS,wB);
    if(eig<0.1) break;
    const toggle=ALL_TOGGLES[toggleIdx];
    const obs=simulateNoisy(trueDagIdx,toggle,wS,wB);
    posterior=bayesUpdate(posterior,toggleIdx,obs,wS,wB);
    steps.push({toggle,obs,eig});
  }
  let mapIdx=0;
  for(let m=1;m<543;m++) if(posterior[m]>posterior[mapIdx]) mapIdx=m;
  return {steps, mapDagIdx:mapIdx};
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

function ExperimentRow({toggle, result, idx, runCount}) {
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

      {runCount > 1 && (
        <span style={{
          background:'#dbeafe',color:'#1d4ed8',fontSize:8,fontWeight:700,
          borderRadius:3,padding:'1px 4px',flexShrink:0,
        }}>×{runCount}</span>
      )}
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

function AnalysisRow({ toggle, obs, playerEIG, maxEIG, idx, isBot }) {
  const ratio = maxEIG > 0 ? playerEIG / maxEIG : 1;
  const eigColor = ratio >= 0.9 ? '#16a34a' : ratio >= 0.6 ? '#d97706' : '#dc2626';
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
        color:isBot?'#16a34a':eigColor,flexShrink:0}}>
        {playerEIG.toFixed(2)}
      </span>
      {!isBot && (
        <span style={{fontSize:9,color:'#94a3b8',flexShrink:0}}>
          /{maxEIG.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ─── Static DAG display ───────────────────────────────────────────────────────

function StaticDag({guessEdges, targetEdgeSet, size=140}) {
  const r = 9;
  const guessSet = new Set(guessEdges);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{display:'block'}}>
      {Array.from(guessSet).map(key => {
        const [u,v] = key.split('-').map(Number);
        return <ArrowShape key={key} from={u} to={v} r={r}
          color={targetEdgeSet.has(key)?'#16a34a':'#dc2626'} sw={2}/>;
      })}
      {Array.from(targetEdgeSet).filter(key=>!guessSet.has(key)).map(key => {
        const [u,v] = key.split('-').map(Number);
        return <ArrowShape key={`m-${key}`} from={u} to={v} r={r}
          color='#f59e0b' dashed sw={1.5}/>;
      })}
      {[0,1,2,3].map(i => {
        const [cx,cy]=NP[i];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill='#fff' stroke='#64748b' strokeWidth={1.5}/>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
              fontSize="9" fontWeight="700" fill='#374151'
              fontFamily="system-ui,sans-serif" style={{pointerEvents:'none'}}>
              {NN[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function NoisyGame() {
  const [order]        = useState(()=>shuffle([...Array(EXPLORE_DATA.length).keys()]));
  const [roundIdx,      setRoundIdx]     = useState(0);
  const [toggles,       setToggles]      = useState([2,2,2,2]);
  const [experiments,   setExperiments]  = useState([]);
  const [playerEdges,   setPlayerEdges]  = useState(new Set());
  const [selectedNode,  setSelectedNode] = useState(null);
  const [phase,         setPhase]        = useState('drawing');
  const [cycleWarning,  setCycleWarning] = useState(false);
  const [roundsDone,    setRoundsDone]   = useState(0);
  const [wS,              setWS]             = useState(0.9);
  const [wB,              setWB]             = useState(0.1);
  const [paramsLocked,    setParamsLocked]   = useState(false);
  const [lastPlayerGuess, setLastPlayerGuess] = useState(null);

  const trueDagIdx = order[roundIdx % order.length];
  const d = EXPLORE_DATA[trueDagIdx];
  const targetEdges = new Set(d.edges.map(([u,v])=>`${u}-${v}`));

  // Annotate each experiment with how many times that exact toggle has been used so far
  const experimentsWithCount = useMemo(() => {
    const counts = {};
    return experiments.map(exp => {
      const k = exp.toggle.join('');
      counts[k] = (counts[k] || 0) + 1;
      return {...exp, runCount: counts[k]};
    });
  }, [experiments]);

  const analysis = useMemo(() => {
    if (phase !== 'won' && phase !== 'giveup') return null;
    const {steps, mapDagIdx} = runBayesBot(trueDagIdx, wS, wB);
    return {
      player: analyzePlayer(experiments, wS, wB),
      bot: steps,
      botMapDagIdx: mapDagIdx,
    };
  }, [phase, experiments, trueDagIdx, wS, wB]);

  // ── toggle cycling ────────────────────────────────────────────────────────

  const cycleToggle = (i) => {
    setToggles(prev => {
      const next=[...prev];
      next[i] = next[i]===2 ? 1 : next[i]===1 ? 0 : 2;
      return next;
    });
  };

  const handleRunExperiment = () => {
    if (!paramsLocked) setParamsLocked(true);
    const result = simulateNoisy(trueDagIdx, toggles, wS, wB);
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
    setLastPlayerGuess(new Set(playerEdges));
    const won = setsEqual(playerEdges,targetEdges);
    setPhase(won?'won':'feedback');
    if(won) setRoundsDone(r=>r+1);
  };

  const handleTryAgain = () => setPhase('drawing');

  const handleGiveUp = () => {
    setSelectedNode(null);
    setLastPlayerGuess(new Set(playerEdges));
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
    setParamsLocked(false);
    setLastPlayerGuess(null);
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
            Noisy Explore Game
          </h1>
          <div style={{fontSize:12,color:'#64748b',marginTop:3}}>
            Run experiments to uncover the hidden network — outcomes are stochastic
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

      {/* Parameter Sliders */}
      <div style={{
        background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,
        padding:'12px 16px',marginBottom:16,
        opacity: paramsLocked ? 0.6 : 1,
        transition:'opacity 0.2s',
      }}>
        <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
          textTransform:'uppercase',letterSpacing:0.8,marginBottom:8,display:'flex',gap:8,alignItems:'center'}}>
          Parameters
          {paramsLocked && (
            <span style={{color:'#f59e0b',fontWeight:600,fontSize:10,
              textTransform:'none',letterSpacing:0}}>
              locked for this round
            </span>
          )}
        </div>
        <div style={{display:'flex',gap:24,flexWrap:'wrap',alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#374151'}}>
            <span style={{fontWeight:700,minWidth:90}}>w_S (Strength)</span>
            <input type="range" min={0.5} max={1.0} step={0.05} value={wS}
              disabled={paramsLocked}
              onChange={e=>setWS(Number(e.target.value))}
              style={{width:100,cursor:paramsLocked?'not-allowed':'pointer'}}/>
            <span style={{minWidth:32,fontWeight:600,color:'#0f172a'}}>{wS.toFixed(2)}</span>
          </label>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#374151'}}>
            <span style={{fontWeight:700,minWidth:90}}>w_B (Background)</span>
            <input type="range" min={0} max={0.5} step={0.05} value={wB}
              disabled={paramsLocked}
              onChange={e=>setWB(Number(e.target.value))}
              style={{width:100,cursor:paramsLocked?'not-allowed':'pointer'}}/>
            <span style={{minWidth:32,fontWeight:600,color:'#0f172a'}}>{wB.toFixed(2)}</span>
          </label>
        </div>
        <div style={{fontSize:10,color:'#94a3b8',marginTop:6,fontStyle:'italic'}}>
          Strength: probability a real connection fires. Background: probability a node activates by chance.
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
            Outcomes are noisy — repeat the same toggle to get more signal.
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
              {[...experimentsWithCount].reverse().map((exp,i)=>(
                <ExperimentRow
                  key={i}
                  toggle={exp.toggle}
                  result={exp.result}
                  idx={experiments.length-1-i}
                  runCount={exp.runCount}
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
            const avgP = ps > 0 ? analysis.player.reduce((s,r)=>s+r.playerEIG,0)/ps : 0;
            const avgM = ps > 0 ? analysis.player.reduce((s,r)=>s+r.maxEIG,0)/ps : 0;
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
                      playerEIG={r.playerEIG} maxEIG={r.maxEIG} isBot={false}/>
                  )
              }
              {analysis.player.length > 0 && (
                <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>
                  EIG shown · /optimal — green ≥90% · yellow ≥60% · red below
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
                      playerEIG={r.eig} maxEIG={r.eig} isBot={true}/>
                  )
              }
              {analysis.bot.length > 0 && (
                <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>
                  Greedy max-EIG · Bayesian posterior · always green
                </div>
              )}
            </div>
          </div>

          {/* Final Guesses */}
          {(() => {
            const botEdges = EXPLORE_DATA[analysis.botMapDagIdx].edges.map(([u,v])=>`${u}-${v}`);
            const botCorrect = setsEqual(new Set(botEdges), targetEdges);
            const playerCorrect = phase === 'won';
            const playerEdgeList = lastPlayerGuess ? Array.from(lastPlayerGuess) : [];
            return (
              <div style={{marginTop:20,borderTop:'1px solid #e2e8f0',paddingTop:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
                  textTransform:'uppercase',letterSpacing:0.8,marginBottom:12}}>
                  Final Guesses
                </div>
                <div style={{display:'flex',gap:24,flexWrap:'wrap',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:6,display:'flex',gap:6,alignItems:'center'}}>
                      Your Guess
                      <span style={{fontSize:13,fontWeight:800,color:playerCorrect?'#16a34a':'#dc2626'}}>
                        {playerCorrect?'✓':'✗'}
                      </span>
                    </div>
                    <StaticDag guessEdges={playerEdgeList} targetEdgeSet={targetEdges}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:6,display:'flex',gap:6,alignItems:'center'}}>
                      Bot's Guess
                      <span style={{fontSize:13,fontWeight:800,color:botCorrect?'#16a34a':'#dc2626'}}>
                        {botCorrect?'✓':'✗'}
                      </span>
                    </div>
                    <StaticDag guessEdges={botEdges} targetEdgeSet={targetEdges}/>
                  </div>
                </div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>
                  green = correct · red = extra · yellow dashed = missing
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop:24,paddingTop:12,borderTop:'1px solid #e2e8f0',
        fontSize:10,color:'#94a3b8',lineHeight:1.8,
      }}>
        Free variable fires with prob 1−(1−w_B)(1−w_S)^k where k = active parents · Forced variable ignores all incoming arrows
      </div>
    </div>
  );
}
