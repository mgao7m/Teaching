import React, { useState, useCallback } from 'react';

// ─── Data (all 31 non-isomorphic classes) ────────────────────────────────────

const TEACH_DATA = [
  {class_id:6,  edges:[[0,1],[2,3]],                        edge_str:'A→B, C→D',                  n_min_toggles:2, min_toggles:[{toggle:[1,2,2,2],obs:[1,1,0,0]},{toggle:[2,2,1,2],obs:[0,0,1,1]}]},
  {class_id:2,  edges:[[0,1]],                              edge_str:'A→B',                        n_min_toggles:3, min_toggles:[{toggle:[1,1,1,2],obs:[1,1,1,0]},{toggle:[1,2,2,1],obs:[1,1,0,1]},{toggle:[2,2,1,1],obs:[0,0,1,1]}]},
  {class_id:3,  edges:[[0,1],[0,2]],                        edge_str:'A→B, A→C',                   n_min_toggles:3, min_toggles:[{toggle:[0,1,2,1],obs:[0,1,0,1]},{toggle:[1,2,2,2],obs:[1,1,1,0]},{toggle:[2,2,1,1],obs:[0,0,1,1]}]},
  {class_id:4,  edges:[[0,1],[1,2]],                        edge_str:'A→B, B→C',                   n_min_toggles:3, min_toggles:[{toggle:[1,0,2,0],obs:[1,0,0,0]},{toggle:[1,2,2,2],obs:[1,1,1,0]},{toggle:[2,2,2,1],obs:[0,0,0,1]}]},
  {class_id:5,  edges:[[0,1],[2,1]],                        edge_str:'A→B, C→B',                   n_min_toggles:3, min_toggles:[{toggle:[1,2,2,2],obs:[1,1,0,0]},{toggle:[2,2,1,2],obs:[0,1,1,0]},{toggle:[2,2,2,1],obs:[0,0,0,1]}]},
  {class_id:10, edges:[[0,1],[0,2],[3,0]],                  edge_str:'A→B, A→C, D→A',              n_min_toggles:3, min_toggles:[{toggle:[0,1,2,1],obs:[0,1,0,1]},{toggle:[0,2,1,1],obs:[0,0,1,1]},{toggle:[2,2,2,1],obs:[1,1,1,1]}]},
  {class_id:11, edges:[[0,1],[0,2],[3,1]],                  edge_str:'A→B, A→C, D→B',              n_min_toggles:3, min_toggles:[{toggle:[0,2,1,0],obs:[0,0,1,0]},{toggle:[1,2,2,2],obs:[1,1,1,0]},{toggle:[2,2,2,1],obs:[0,1,0,1]}]},
  {class_id:12, edges:[[0,1],[1,2],[2,3]],                  edge_str:'A→B, B→C, C→D',              n_min_toggles:3, min_toggles:[{toggle:[0,1,0,2],obs:[0,1,0,0]},{toggle:[1,0,2,2],obs:[1,0,0,0]},{toggle:[1,2,2,2],obs:[1,1,1,1]}]},
  {class_id:13, edges:[[0,1],[1,2],[3,1]],                  edge_str:'A→B, B→C, D→B',              n_min_toggles:3, min_toggles:[{toggle:[1,0,2,1],obs:[1,0,0,1]},{toggle:[1,2,0,2],obs:[1,1,0,0]},{toggle:[2,2,2,1],obs:[0,1,1,1]}]},
  {class_id:14, edges:[[0,1],[1,2],[3,2]],                  edge_str:'A→B, B→C, D→C',              n_min_toggles:3, min_toggles:[{toggle:[1,0,2,0],obs:[1,0,0,0]},{toggle:[1,2,2,2],obs:[1,1,1,0]},{toggle:[2,2,2,1],obs:[0,0,1,1]}]},
  {class_id:15, edges:[[0,1],[2,1],[3,1]],                  edge_str:'A→B, C→B, D→B',              n_min_toggles:3, min_toggles:[{toggle:[1,2,2,2],obs:[1,1,0,0]},{toggle:[2,2,1,2],obs:[0,1,1,0]},{toggle:[2,2,2,1],obs:[0,1,0,1]}]},
  {class_id:18, edges:[[0,1],[0,2],[1,2],[2,3]],            edge_str:'A→B, A→C, B→C, C→D',         n_min_toggles:3, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,2],obs:[1,0,1,1]},{toggle:[1,2,0,2],obs:[1,1,0,0]}]},
  {class_id:1,  edges:[],                                   edge_str:'(no arrows)',                 n_min_toggles:4, min_toggles:[{toggle:[0,1,1,2],obs:[0,1,1,0]},{toggle:[1,2,2,2],obs:[1,0,0,0]},{toggle:[2,1,2,1],obs:[0,1,0,1]},{toggle:[2,2,1,1],obs:[0,0,1,1]}]},
  {class_id:7,  edges:[[0,1],[0,2],[0,3]],                  edge_str:'A→B, A→C, A→D',              n_min_toggles:4, min_toggles:[{toggle:[0,1,1,2],obs:[0,1,1,0]},{toggle:[0,1,2,1],obs:[0,1,0,1]},{toggle:[0,2,1,1],obs:[0,0,1,1]},{toggle:[1,2,2,2],obs:[1,1,1,1]}]},
  {class_id:8,  edges:[[0,1],[0,2],[1,2]],                  edge_str:'A→B, A→C, B→C',              n_min_toggles:4, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,1,2],obs:[1,1,1,0]},{toggle:[2,2,2,1],obs:[0,0,0,1]}]},
  {class_id:9,  edges:[[0,1],[0,2],[1,3]],                  edge_str:'A→B, A→C, B→D',              n_min_toggles:4, min_toggles:[{toggle:[0,1,2,1],obs:[0,1,0,1]},{toggle:[0,2,1,0],obs:[0,0,1,0]},{toggle:[1,0,1,2],obs:[1,0,1,0]},{toggle:[1,2,2,2],obs:[1,1,1,1]}]},
  {class_id:16, edges:[[0,1],[0,2],[0,3],[1,2]],            edge_str:'A→B, A→C, A→D, B→C',         n_min_toggles:4, min_toggles:[{toggle:[0,1,2,2],obs:[0,1,1,0]},{toggle:[0,2,2,1],obs:[0,0,0,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:17, edges:[[0,1],[0,2],[1,2],[1,3]],            edge_str:'A→B, A→C, B→C, B→D',         n_min_toggles:4, min_toggles:[{toggle:[0,0,2,1],obs:[0,0,0,1]},{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,2],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:19, edges:[[0,1],[0,2],[1,2],[3,0]],            edge_str:'A→B, A→C, B→C, D→A',         n_min_toggles:4, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[0,2,2,1],obs:[0,0,0,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[2,2,0,1],obs:[1,1,0,1]}]},
  {class_id:20, edges:[[0,1],[0,2],[1,2],[3,1]],            edge_str:'A→B, A→C, B→C, D→B',         n_min_toggles:4, min_toggles:[{toggle:[0,0,2,1],obs:[0,0,0,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,0]},{toggle:[2,2,2,1],obs:[0,1,1,1]}]},
  {class_id:21, edges:[[0,1],[0,2],[1,2],[3,2]],            edge_str:'A→B, A→C, B→C, D→C',         n_min_toggles:4, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,0]},{toggle:[2,2,2,1],obs:[0,0,1,1]}]},
  {class_id:22, edges:[[0,1],[0,2],[1,3],[2,3]],            edge_str:'A→B, A→C, B→D, C→D',         n_min_toggles:4, min_toggles:[{toggle:[0,1,2,2],obs:[0,1,0,1]},{toggle:[0,2,1,2],obs:[0,0,1,1]},{toggle:[1,0,0,2],obs:[1,0,0,0]},{toggle:[1,2,2,0],obs:[1,1,1,0]}]},
  {class_id:23, edges:[[0,1],[0,2],[1,3],[3,2]],            edge_str:'A→B, A→C, B→D, D→C',         n_min_toggles:4, min_toggles:[{toggle:[0,0,2,1],obs:[0,0,1,1]},{toggle:[0,1,2,0],obs:[0,1,0,0]},{toggle:[1,0,2,2],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:24, edges:[[0,1],[0,2],[3,1],[3,2]],            edge_str:'A→B, A→C, D→B, D→C',         n_min_toggles:4, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,0,0]},{toggle:[0,2,1,0],obs:[0,0,1,0]},{toggle:[1,2,2,2],obs:[1,1,1,0]},{toggle:[2,2,2,1],obs:[0,1,1,1]}]},
  {class_id:26, edges:[[0,1],[0,2],[0,3],[1,2],[2,3]],      edge_str:'A→B, A→C, A→D, B→C, C→D',    n_min_toggles:4, min_toggles:[{toggle:[0,1,0,2],obs:[0,1,0,0]},{toggle:[0,1,2,2],obs:[0,1,1,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:27, edges:[[0,1],[0,2],[0,3],[1,2],[3,2]],      edge_str:'A→B, A→C, A→D, B→C, D→C',    n_min_toggles:4, min_toggles:[{toggle:[0,1,2,2],obs:[0,1,1,0]},{toggle:[0,2,2,1],obs:[0,0,1,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:28, edges:[[0,1],[0,2],[1,2],[1,3],[2,3]],      edge_str:'A→B, A→C, B→C, B→D, C→D',    n_min_toggles:4, min_toggles:[{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,0,2],obs:[1,0,0,0]},{toggle:[1,0,2,2],obs:[1,0,1,1]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:29, edges:[[0,1],[0,2],[1,2],[1,3],[3,2]],      edge_str:'A→B, A→C, B→C, B→D, D→C',    n_min_toggles:4, min_toggles:[{toggle:[0,0,2,1],obs:[0,0,1,1]},{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,2],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,1]}]},
  {class_id:25, edges:[[0,1],[0,2],[0,3],[1,2],[1,3]],      edge_str:'A→B, A→C, A→D, B→C, B→D',    n_min_toggles:5, min_toggles:[{toggle:[0,0,1,2],obs:[0,0,1,0]},{toggle:[0,0,2,1],obs:[0,0,0,1]},{toggle:[0,1,2,2],obs:[0,1,1,1]},{toggle:[1,0,2,2],obs:[1,0,1,1]},{toggle:[1,2,0,0],obs:[1,1,0,0]}]},
  {class_id:30, edges:[[0,1],[0,2],[1,2],[3,1],[3,2]],      edge_str:'A→B, A→C, B→C, D→B, D→C',    n_min_toggles:5, min_toggles:[{toggle:[0,0,2,1],obs:[0,0,1,1]},{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,2],obs:[1,1,0,0]},{toggle:[2,2,0,1],obs:[0,1,0,1]}]},
  {class_id:31, edges:[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],edge_str:'A→B, A→C, A→D, B→C, B→D, C→D',n_min_toggles:6,min_toggles:[{toggle:[0,0,1,2],obs:[0,0,1,1]},{toggle:[0,1,0,2],obs:[0,1,0,1]},{toggle:[0,1,2,0],obs:[0,1,1,0]},{toggle:[1,0,0,2],obs:[1,0,0,1]},{toggle:[1,0,2,0],obs:[1,0,1,0]},{toggle:[1,2,0,0],obs:[1,1,0,0]}]},
];

// ─── Constants ────────────────────────────────────────────────────────────────

const NN = ['A','B','C','D'];
const NP = [[25,27],[75,27],[25,73],[75,73]];
const ALL_DIRECTED_EDGES = [[0,1],[0,2],[0,3],[1,0],[1,2],[1,3],[2,0],[2,1],[2,3],[3,0],[3,1],[3,2]];

const DIFF = {
  2:{bg:'#f0faf2',bdr:'#2d7d46',badge:'#276639'},
  3:{bg:'#fefce8',bdr:'#b45309',badge:'#92400e'},
  4:{bg:'#fff7ed',bdr:'#c2410c',badge:'#9a3412'},
  5:{bg:'#fdf4ff',bdr:'#9333ea',badge:'#7e22ce'},
  6:{bg:'#eff6ff',bdr:'#2563eb',badge:'#1d4ed8'},
};


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
  return {sx:x1+nx*r,sy:y1+ny*r,tx:x2-nx*r,ty:y2-ny*r,bx:x2-nx*(r+hl),by:y2-ny*(r+hl),px,py,hw};
}

function ArrowShape({from,to,r=10,color='#475569',sw=1.5,dashed=false}) {
  const a=computeArrow(from,to,r); if(!a) return null;
  const {sx,sy,tx,ty,bx,by,px,py,hw}=a;
  return (
    <g>
      <line x1={sx} y1={sy} x2={bx} y2={by} stroke={color} strokeWidth={sw} strokeDasharray={dashed?'5 4':undefined}/>
      <polygon points={`${tx},${ty} ${bx+px*hw},${by+py*hw} ${bx-px*hw},${by-py*hw}`} fill={color} opacity={dashed?0.5:1}/>
    </g>
  );
}

// ─── Mini DAG thumbnail ───────────────────────────────────────────────────────

function MiniDag({edges, size=72}) {
  const r = size <= 72 ? 8 : 10;
  const scale = size/100;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{display:'block'}}>
      {(edges||[]).map(([f,t],i)=><ArrowShape key={i} from={f} to={t} r={r} sw={1.5}/>)}
      {[0,1,2,3].map(i=>{
        const [cx,cy]=NP[i];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#6b7280" strokeWidth={1.5}/>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
              fontSize={r*1.1} fontWeight="700" fill="#374151" fontFamily="system-ui,sans-serif">
              {NN[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Class card (teacher grid) ────────────────────────────────────────────────

function ClassCard({d, isSelected, onClick}) {
  const th = DIFF[d.n_min_toggles] || DIFF[6];
  return (
    <div onClick={onClick} style={{
      cursor:'pointer', borderRadius:8, padding:'8px 6px 6px',
      border:`2px solid ${isSelected ? th.bdr : '#e2e8f0'}`,
      background: isSelected ? th.bg : '#fafafa',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      transition:'border-color 0.1s, background 0.1s',
    }}>
      <MiniDag edges={d.edges} size={68}/>
      <div style={{textAlign:'center', lineHeight:1.4}}>
        <div style={{fontSize:10, fontWeight:600, color:'#1e293b',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:110}}>
          {d.edge_str}
        </div>
      </div>
    </div>
  );
}


// ─── Hint card (student view) ─────────────────────────────────────────────────

function HintCard({td, idx}) {
  return (
    <div style={{
      padding:'10px 12px', borderRadius:8, background:'#f8fafc',
      border:'1px solid #e2e8f0', marginBottom:8,
    }}>
      <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',
        textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>
        Experiment {idx+1}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:5}}>
          {td.toggle.map((v,i)=>{
            const s=TSTYLE[v];
            return (
              <div key={i} style={{
                width:34,height:34,borderRadius:'50%',flexShrink:0,
                background:s.bg,border:`2px solid ${s.bdr}`,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:700,color:s.txt,lineHeight:1.1,
              }}>
                <span>{NN[i]}</span>
                <span style={{fontSize:8,fontWeight:600}}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{color:'#cbd5e1',fontSize:20,flexShrink:0}}>→</div>
        <div style={{display:'flex',gap:5}}>
          {td.obs.map((v,i)=>{
            const s=OSTYLE[v];
            return (
              <div key={i} style={{
                width:34,height:34,borderRadius:'50%',flexShrink:0,
                background:s.bg,border:`2px solid ${s.bdr}`,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:700,color:s.txt,lineHeight:1.1,
              }}>
                <span>{NN[i]}</span>
                <span style={{fontSize:8,fontWeight:600}}>{v?'on':'off'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Editable DAG canvas ──────────────────────────────────────────────────────

function EditableDag({playerEdges, targetEdges, phase, selectedNode, onNodeClick, onEdgeClick, size=220}) {
  const r = 11;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{display:'block',userSelect:'none'}}>
      {phase==='drawing' && selectedNode!==null && ALL_DIRECTED_EDGES
        .filter(([f])=>f===selectedNode)
        .filter(([f,t])=>!playerEdges.has(`${f}-${t}`))
        .map(([f,t])=>{
          const a=computeArrow(f,t,r); if(!a) return null;
          const {sx,sy,bx,by}=a;
          return (
            <g key={`g${f}${t}`} onClick={e=>{e.stopPropagation();onEdgeClick(f,t,'add');}} style={{cursor:'pointer'}}>
              <line x1={sx} y1={sy} x2={bx} y2={by} stroke="transparent" strokeWidth={14}/>
              <ArrowShape from={f} to={t} r={r} color='#93c5fd' dashed/>
            </g>
          );
        })}
      {Array.from(playerEdges).map(key=>{
        const [u,v]=key.split('-').map(Number);
        let color='#334155';
        if((phase==='won'||phase==='giveup')&&targetEdges) color=targetEdges.has(key)?'#16a34a':'#dc2626';
        const a=computeArrow(u,v,r); if(!a) return null;
        const {sx,sy,bx,by}=a;
        return (
          <g key={key} onClick={e=>{e.stopPropagation();if(phase==='drawing')onEdgeClick(u,v,'remove');}}
            style={{cursor:phase==='drawing'?'pointer':'default'}}>
            <line x1={sx} y1={sy} x2={bx} y2={by} stroke="transparent" strokeWidth={14}/>
            <ArrowShape from={u} to={v} r={r} color={color} sw={2}/>
          </g>
        );
      })}
      {(phase==='won'||phase==='giveup')&&targetEdges&&Array.from(targetEdges)
        .filter(k=>!playerEdges.has(k))
        .map(key=>{
          const [u,v]=key.split('-').map(Number);
          return <ArrowShape key={`m-${key}`} from={u} to={v} r={r} color='#f59e0b' dashed sw={2}/>;
        })}
      {[0,1,2,3].map(i=>{
        const [cx,cy]=NP[i], sel=selectedNode===i;
        return (
          <g key={i} onClick={e=>{e.stopPropagation();onNodeClick(i);}} style={{cursor:phase==='drawing'?'pointer':'default'}}>
            <circle cx={cx} cy={cy} r={r} fill={sel?'#dbeafe':'#fff'} stroke={sel?'#2563eb':'#64748b'} strokeWidth={sel?2.5:1.5}/>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
              fontSize="10" fontWeight="700" fill={sel?'#1d4ed8':'#374151'}
              fontFamily="system-ui,sans-serif" style={{pointerEvents:'none'}}>
              {NN[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function hasCycle(edgeSet) {
  const ch={};for(let i=0;i<4;i++)ch[i]=[];
  for(const k of edgeSet){const [u,v]=k.split('-').map(Number);ch[u].push(v);}
  const vis=new Set(),rec=new Set();
  function dfs(n){vis.add(n);rec.add(n);for(const nb of ch[n]){if(!vis.has(nb)&&dfs(nb))return true;if(rec.has(nb))return true;}rec.delete(n);return false;}
  for(let i=0;i<4;i++)if(!vis.has(i)&&dfs(i))return true;
  return false;
}

function setsEqual(a,b){if(a.size!==b.size)return false;for(const x of a)if(!b.has(x))return false;return true;}

function btnStyle(color) {
  return {background:color,color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer'};
}

// ─── Teacher Setup ────────────────────────────────────────────────────────────

function TeacherSetup({onLaunch}) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [toggles,       setToggles]       = useState([2,2,2,2]);
  const [experiments,   setExperiments]   = useState([]);

  const selectClass = (d) => {
    setSelectedClass(d);
    setToggles([2,2,2,2]);
    setExperiments([]);
  };

  const cycleToggle = (i) => {
    setToggles(prev => {
      const next = [...prev];
      next[i] = next[i]===2 ? 1 : next[i]===1 ? 0 : 2;
      return next;
    });
  };

  const handleRun = () => {
    const obs = simulate(selectedClass.edges, toggles);
    setExperiments(prev => [...prev, {toggle: [...toggles], obs}]);
  };

  const removeExp = (i) => setExperiments(prev => prev.filter((_,j)=>j!==i));

  const canLaunch = selectedClass && experiments.length > 0;

  return (
    <div style={{
      fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
      maxWidth:960, margin:'0 auto', padding:24, color:'#0f172a',
    }}>
      <h1 style={{fontSize:20,fontWeight:800,margin:'0 0 4px',letterSpacing:-0.3}}>
        Teaching Mode — Setup
      </h1>
      <p style={{fontSize:12,color:'#64748b',margin:'0 0 20px',lineHeight:1.7}}>
        Pick a network, design experiments to show your student, then launch.
      </p>

      <div style={{display:'flex',gap:24,flexWrap:'wrap',alignItems:'flex-start'}}>

        {/* Step 1: pick a graph */}
        <div style={{flex:1,minWidth:320}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:10}}>
            Step 1 — Choose a network
          </div>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',
            gap:8,
          }}>
            {TEACH_DATA.map(d=>(
              <ClassCard
                key={d.class_id}
                d={d}
                isSelected={selectedClass?.class_id===d.class_id}
                onClick={()=>selectClass(d)}
              />
            ))}
          </div>
        </div>

        {/* Step 2: build experiments */}
        <div style={{width:340,flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:10}}>
            Step 2 — Design experiments
          </div>

          {!selectedClass ? (
            <div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic',
              padding:'20px 0',textAlign:'center'}}>
              Select a network first
            </div>
          ) : (
            <>
              {/* Toggle controls */}
              <div style={{fontSize:11,color:'#64748b',marginBottom:8,lineHeight:1.6}}>
                Set each variable, then run to see the result. Click a button to cycle: free → on → off.
              </div>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                {[0,1,2,3].map(i => {
                  const s = TSTYLE[toggles[i]];
                  return (
                    <div key={i} onClick={()=>cycleToggle(i)} style={{
                      width:58,height:58,borderRadius:8,cursor:'pointer',
                      background:s.bg,border:`2px solid ${s.bdr}`,
                      display:'flex',flexDirection:'column',alignItems:'center',
                      justifyContent:'center',gap:3,userSelect:'none',
                    }}>
                      <span style={{fontSize:14,fontWeight:800,color:s.txt,lineHeight:1}}>{NN[i]}</span>
                      <span style={{fontSize:10,fontWeight:700,color:s.bdr,lineHeight:1}}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <button onClick={handleRun}
                  style={{...btnStyle('#0f172a'),flex:1}}>
                  Run Experiment
                </button>
                <button onClick={()=>setToggles([2,2,2,2])}
                  style={{background:'none',border:'1px solid #e2e8f0',color:'#64748b',
                    borderRadius:6,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>
                  Reset
                </button>
              </div>

              {/* Experiment list */}
              {experiments.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
                    textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
                    Experiments ({experiments.length})
                  </div>
                  <div style={{maxHeight:300,overflowY:'auto'}}>
                    {experiments.map((exp,i)=>(
                      <div key={i} style={{
                        display:'flex',alignItems:'center',gap:6,
                        padding:'5px 0',borderBottom:'1px solid #f1f5f9',fontSize:10,
                      }}>
                        <span style={{minWidth:18,color:'#94a3b8',fontWeight:700,flexShrink:0}}>{i+1}</span>
                        {exp.toggle.map((v,j)=>{
                          const s=TSTYLE[v];
                          return (
                            <div key={j} style={{
                              width:26,height:26,borderRadius:4,flexShrink:0,
                              background:s.bg,border:`1.5px solid ${s.bdr}`,
                              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            }}>
                              <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[j]}</span>
                              <span style={{fontSize:7,fontWeight:600,color:s.bdr,lineHeight:1.15}}>{s.label}</span>
                            </div>
                          );
                        })}
                        <span style={{color:'#cbd5e1',fontSize:12,flexShrink:0}}>→</span>
                        {exp.obs.map((v,j)=>{
                          const s=OSTYLE[v];
                          return (
                            <div key={j} style={{
                              width:26,height:26,borderRadius:4,flexShrink:0,
                              background:s.bg,border:`1.5px solid ${s.bdr}`,
                              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            }}>
                              <span style={{fontSize:8,fontWeight:700,color:s.txt,lineHeight:1.15}}>{NN[j]}</span>
                              <span style={{fontSize:7,fontWeight:600,color:s.txt,lineHeight:1.15}}>{v?'on':'off'}</span>
                            </div>
                          );
                        })}
                        <button onClick={()=>removeExp(i)} style={{
                          marginLeft:'auto',background:'none',border:'none',
                          color:'#94a3b8',cursor:'pointer',fontSize:14,lineHeight:1,padding:'0 4px',
                          flexShrink:0,
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={()=>canLaunch && onLaunch({dag:selectedClass, experiments})}
                style={{...btnStyle(canLaunch?'#0f172a':'#94a3b8'),
                  width:'100%',padding:'10px',fontSize:13,cursor:canLaunch?'pointer':'default'}}
              >
                Launch Student Mode →
              </button>
              {experiments.length===0 && (
                <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>
                  Run at least one experiment first.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Game ─────────────────────────────────────────────────────────────

function StudentGame({config, onBack}) {
  const {dag, experiments} = config;
  const targetEdges = new Set(dag.edges.map(([u,v])=>`${u}-${v}`));

  const [playerEdges,  setPlayerEdges]  = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [phase,        setPhase]        = useState('drawing');
  const [cycleWarning, setCycleWarning] = useState(false);

  const handleNodeClick = useCallback((i)=>{
    if(phase!=='drawing') return;
    if(selectedNode===null){setSelectedNode(i);}
    else if(selectedNode===i){setSelectedNode(null);}
    else {
      const key=`${selectedNode}-${i}`;
      const next=new Set(playerEdges);
      if(!next.has(key)){
        next.add(key);
        if(hasCycle(next)){setCycleWarning(true);setTimeout(()=>setCycleWarning(false),2000);}
        else{setPlayerEdges(next);setCycleWarning(false);}
      }
      setSelectedNode(null);
    }
  },[phase,selectedNode,playerEdges]);

  const handleEdgeClick = useCallback((u,v,action)=>{
    if(phase!=='drawing') return;
    if(action==='remove'){setPlayerEdges(prev=>{const n=new Set(prev);n.delete(`${u}-${v}`);return n;});setSelectedNode(null);}
    else {
      const key=`${u}-${v}`;const next=new Set(playerEdges);
      if(!next.has(key)){next.add(key);if(hasCycle(next)){setCycleWarning(true);setTimeout(()=>setCycleWarning(false),2000);}else setPlayerEdges(next);}
      setSelectedNode(null);
    }
  },[phase,playerEdges]);

  const handleSubmit = ()=>{
    setSelectedNode(null);
    setPhase(setsEqual(playerEdges,targetEdges)?'won':'feedback');
  };

  const handleGiveUp = ()=>{
    setSelectedNode(null);
    setPlayerEdges(new Set(targetEdges));
    setPhase('giveup');
  };

  return (
    <div
      style={{fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",
        maxWidth:860,margin:'0 auto',padding:20,color:'#0f172a'}}
      onClick={()=>{if(phase==='drawing')setSelectedNode(null);}}
    >
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',
        alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,margin:0,letterSpacing:-0.3}}>
            Teaching Mode — Student
          </h1>
          <div style={{fontSize:12,color:'#64748b',marginTop:3}}>
            Study the experiments and draw the hidden network
          </div>
        </div>
        <button
          onClick={e=>{e.stopPropagation();onBack();}}
          style={{background:'none',border:'1px solid #e2e8f0',color:'#64748b',
            borderRadius:6,padding:'6px 12px',fontSize:11,cursor:'pointer',fontWeight:600}}
        >
          ← Back to Setup
        </button>
      </div>

      <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'flex-start'}}>

        {/* Left: experiments */}
        <div style={{flex:1,minWidth:280}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',
            textTransform:'uppercase',letterSpacing:0.8,marginBottom:6}}>
            Experiments ({experiments.length})
          </div>
          {experiments.map((td,i)=><HintCard key={i} td={td} idx={i}/>)}

          {(phase==='won'||phase==='giveup') && (
            <div style={{
              marginTop:8,padding:'10px 12px',
              background:phase==='giveup'?'#fef2f2':'#f0fdf4',
              border:`1px solid ${phase==='giveup'?'#fca5a5':'#86efac'}`,
              borderRadius:8,fontSize:11,lineHeight:1.7,
              color:phase==='giveup'?'#991b1b':'#166534',
            }}>
              <strong>Answer: </strong>{dag.edge_str}
            </div>
          )}
        </div>

        {/* Right: drawing */}
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
              targetEdges={(phase==='won'||phase==='giveup')?targetEdges:null}
              phase={phase}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              size={220}
            />
          </div>

          {cycleWarning && (
            <div style={{marginTop:6,padding:'5px 10px',background:'#fef2f2',
              border:'1px solid #fca5a5',borderRadius:6,fontSize:11,color:'#dc2626',fontWeight:600}}>
              Can't add: would create a cycle
            </div>
          )}

          <div style={{marginTop:8,fontSize:10,color:'#94a3b8'}}>
            {playerEdges.size} edge{playerEdges.size!==1?'s':''} drawn
          </div>

          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {phase==='drawing' && (
              <>
                <button onClick={handleSubmit} style={btnStyle('#0f172a')}>
                  Submit Guess
                </button>
                <button onClick={()=>{setPlayerEdges(new Set());setSelectedNode(null);}}
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
              <>
                <button onClick={()=>setPhase('drawing')} style={btnStyle('#92400e')}>
                  Edit &amp; Retry
                </button>
                <div style={{
                  marginTop:10,padding:'10px 14px',borderRadius:8,width:'100%',
                  background:'#fff7ed',border:'1.5px solid #fcd34d',
                  fontSize:12,color:'#78350f',lineHeight:1.6,
                }}>
                  <strong style={{color:'#92400e'}}>Not quite.</strong> Review and try again.
                </div>
              </>
            )}
            {phase==='won' && (
              <div style={{
                marginTop:0,padding:'10px 14px',borderRadius:8,
                background:'#f0fdf4',border:'1.5px solid #86efac',
                fontSize:13,fontWeight:700,color:'#15803d',
              }}>
                Correct!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function TeachMode() {
  const [mode,   setMode]   = useState('setup');
  const [config, setConfig] = useState(null);

  if(mode==='student' && config) {
    return <StudentGame config={config} onBack={()=>{setMode('setup');setConfig(null);}}/>;
  }
  return <TeacherSetup onLaunch={cfg=>{setConfig(cfg);setMode('student');}}/>;
}
