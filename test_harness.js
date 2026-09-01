// Harness compartilhado: mocks de DOM + DWClient (Supabase fake) para testes headless
const fs = require('fs');

function makeEl(id){
  const ctx = {
    canvas:{width:300,height:150}, fillStyle:'', strokeStyle:'', lineWidth:1, font:'',
    fillRect(){}, clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){},
    arc(){}, closePath(){}, setLineDash(){}, fillText(){}, measureText(){ return {width:0}; },
    translate(){}, save(){}, restore(){}, rotate(){}, scale(){}, rect(){}, setTransform(){},
    createLinearGradient(){ return { addColorStop(){} }; }, strokeRect(){}, isPointInPath(){ return false; },
    quadraticCurveTo(){}, bezierCurveTo(){}, ellipse(){}, drawImage(){}, clip(){}, globalAlpha:1,
    lineCap:'', lineJoin:'', lineDashOffset:0, shadowColor:'', shadowBlur:0, globalCompositeOperation:'',
  };
  const classes = new Set();
  return {
    id, value:'', textContent:'', innerHTML:'', display:'', width:300, height:150,
    style:{}, dataset:{}, options:[], files:[], _listeners:{},
    classList:{
      add(c){ classes.add(c); }, remove(c){ classes.delete(c); }, toggle(c){ classes.has(c)?classes.delete(c):classes.add(c); },
      contains(c){ return classes.has(c); },
    },
    addEventListener(type, fn){ this._listeners[type] = fn; },
    removeEventListener(){}, appendChild(){}, removeChild(){},
    focus(){}, click(){ if(this._listeners && this._listeners.click) this._listeners.click({ target:this, stopPropagation(){} }); },
    setAttribute(){}, getAttribute(){ return null; },
    getBoundingClientRect(){ return { width:300, height:150, left:0, top:0, right:300, bottom:150 }; },
    getContext(){ return ctx; },
    toDataURL(){ return ''; },
  };
}

const els = {};
const document = {
  getElementById(id){ return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll(){ return []; },
  querySelector(){ return makeEl('q'); },
  documentElement: { classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } } },
  body: makeEl('body'),
  createElement(){ return makeEl('c'); },
  addEventListener(){},
};

const localStorageMock = {
  _s:{}, getItem(k){ return this._s[k] !== undefined ? this._s[k] : null; },
  setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; },
};

function fakeQuery(table, db){
  let filters = {}; let ordered = null; let single = false; let limit = null;
  let lastOp = null;
  const build = () => {
    let rows = db[table] || [];
    if(filters.eq){
      for(const [k,v] of Object.entries(filters.eq)){
        rows = rows.filter(r => String(r[k]) === String(v));
      }
    }
    if(filters.ilike){
      for(const [k,v] of Object.entries(filters.ilike)){
        rows = rows.filter(r => String(r[k]||'').toLowerCase().includes(String(v).toLowerCase()));
      }
    }
    if(ordered) rows = rows.slice().sort((a,b)=> String(a[ordered.col]||'').localeCompare(String(b[ordered.col]||'')) * (ordered.dir ? -1 : 1));
    if(limit) rows = rows.slice(0, limit);
    return rows;
  };
  const run = () => {
    if(lastOp && lastOp.kind === 'insert'){
      const arr = Array.isArray(lastOp.payload) ? lastOp.payload : [lastOp.payload];
      const out = [];
      for(const r of arr){
        const row = {...r, id: r.id || ('id_'+Math.random().toString(36).slice(2))};
        db[table].push(row); out.push(row);
      }
      return { data: Array.isArray(lastOp.payload) ? out : out[0], error:null };
    }
    if(lastOp && lastOp.kind === 'upsert'){
      const arr = Array.isArray(lastOp.payload) ? lastOp.payload : [lastOp.payload];
      const out = [];
      for(const r of arr){
        const key = (lastOp.onConflict || 'id').split(',');
        let idx = db[table].findIndex(x => key.every(k => x[k] === r[k]));
        if(idx >= 0){ db[table][idx] = {...db[table][idx], ...r}; out.push(db[table][idx]); }
        else { const row = {...r, id: r.id || ('id_'+Math.random().toString(36).slice(2))}; db[table].push(row); out.push(row); }
      }
      return { data: out, error:null };
    }
    if(lastOp && lastOp.kind === 'update'){
      const rows = build();
      for(const r of rows){ Object.assign(r, lastOp.payload); }
      return { data: rows, error:null };
    }
    if(lastOp && lastOp.kind === 'delete'){
      const rows = build();
      db[table] = db[table].filter(x => !rows.includes(x));
      return { data: rows, error:null };
    }
    const rows = build();
    return { data: single ? (rows[0] || null) : rows, error:null };
  };
  const api = {
    then(res, rej){ return Promise.resolve(run()).then(res, rej); },
    catch(rej){ return Promise.resolve(run()).catch(rej); },
    eq(k,v){ filters.eq = filters.eq||{}; filters.eq[k]=v; return api; },
    ilike(k,v){ filters.ilike = filters.ilike||{}; filters.ilike[k]=v; return api; },
    order(col,{ascending}={}){ ordered = {col, dir: !ascending}; return api; },
    limit(n){ limit = n; return api; },
    single(){ single = true; return api; },
    maybeSingle(){ single = true; return api; },
    select(){ return api; },
    insert(payload){ lastOp = { kind:'insert', payload }; return api; },
    upsert(payload, opts){ lastOp = { kind:'upsert', payload, onConflict: opts && opts.onConflict }; return api; },
    update(payload){ lastOp = { kind:'update', payload }; return api; },
    delete(){ lastOp = { kind:'delete' }; return api; },
  };
  return api;
}

function setup(seedDb){
  const db = seedDb();
  const auth = {
    user: null,
    async signInWithPassword({email,password}){
      const u = { id:'u-default', email };
      this.user = u;
      return { data:{ user: u }, error:null };
    },
    async signUp({email,password,options}){ this.user = { id:'u-new', email, user_metadata: (options&&options.data)||{} }; return { data:{ user: this.user }, error:null }; },
    async signOut(){ this.user = null; return { error:null }; },
    getUser(){ return { data:{ user: this.user } }; },
    getSession(){ return Promise.resolve({ data:{ session: null } }); },
  };
  const DWClient = { auth, from: (t) => fakeQuery(t, db) };

  global.document = document;
  global.window = global;
  global.DWClient = DWClient;
  global.localStorage = localStorageMock;
  global.addEventListener = () => {};
  global.getComputedStyle = () => ({ getPropertyValue: () => '' });
  global.requestAnimationFrame = (fn) => { if(fn) fn(); return 0; };
  global.cancelAnimationFrame = () => {};
  global.Notification = { permission:'denied', requestPermission: () => Promise.resolve('denied') };
  global.navigator = { language:'pt-BR' };
  global.Blob = class { constructor(){ this.parts=[]; } };
  global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  global.FileReader = class { readAsText(){ this.onload && this.onload({ target:{ result:'' } }); } };
  global.setInterval = () => 0;
  const _realST = setTimeout.bind(global);
  const _realCT = clearTimeout.bind(global);
  global.setTimeout = (fn, ms) => _realST(fn, ms);
  global.clearTimeout = (t) => _realCT(t);
  global.clearInterval = () => {};
  global.alert = (msg) => { throw new Error('alert: ' + msg); };
  global.confirm = () => true;
  global.console = console;
  return { document, db, DWClient, auth, els };
}

function loadPanelScript(file){
  const html = fs.readFileSync(file,'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/g)||[];
  for(const s of m){
    const js = s.replace(/<\/?script>/g,'');
    if(js.includes('cdn.jsdelivr.net') || js.includes('supabase/config.js')) continue;
    (0,eval)(js);
  }
}

module.exports = { setup, loadPanelScript };
