import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, verifyJwt } from './middleware/auth';
import authRoutes from './routes/auth';
import skillsRoutes from './routes/skills';
import publishRoutes from './routes/publish';

interface Env {
  DB: D1Database;
  SKILL_BUNDLES: R2Bucket;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  APP_URL: string;
  ENV: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use('*', authMiddleware);

app.route('/api/auth', authRoutes);
app.route('/api/skills', skillsRoutes);
app.route('/api/publish', publishRoutes);

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'ouro-store',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

const PAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ouro Skill Store \u2014 AI Skills \u5546\u5e97</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\u{1F6D2}</text></svg>">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a10;--card:#13131f;--border:#252540;--text:#e8e8f0;--dim:#7878a0;--accent:#6c6cff;--accent2:#ff6cb4;--radius:12px;--max-w:1200px}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
a{color:var(--accent);text-decoration:none}a:hover{opacity:.8}
header{position:sticky;top:0;z-index:100;background:rgba(10,10,16,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.header-inner{max-width:var(--max-w);margin:0 auto;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;color:var(--text)}
.logo span{background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav{display:flex;align-items:center;gap:24px}
nav a{color:var(--dim);font-size:14px;font-weight:500;transition:color .2s}
nav a:hover{color:var(--text)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--dim);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--accent)}
.hero{text-align:center;padding:80px 24px 60px;background:radial-gradient(ellipse at 50% 0%,rgba(108,108,255,.08),transparent 70%)}
.hero h1{font-size:48px;font-weight:800;line-height:1.15;margin-bottom:16px}
.hero h1 span{background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{color:var(--dim);font-size:18px;max-width:560px;margin:0 auto 32px}
.hero-stats{display:flex;justify-content:center;gap:48px;margin-bottom:40px}
.hero-stats div{text-align:center}
.hero-stats .num{font-size:28px;font-weight:700;color:var(--text)}
.hero-stats .label{font-size:13px;color:var(--dim);margin-top:2px}
.search-wrap{max-width:520px;margin:0 auto;position:relative}
.search-wrap input{width:100%;padding:14px 20px 14px 48px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:15px;outline:none;transition:border .2s}
.search-wrap input:focus{border-color:var(--accent)}
.search-wrap input::placeholder{color:var(--dim)}
.search-wrap .search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:18px}
.tabs-wrap{max-width:var(--max-w);margin:0 auto;padding:0 24px;display:flex;align-items:center;gap:8px;overflow-x:auto;margin-bottom:24px}
.tabs-wrap::-webkit-scrollbar{display:none}
.tab{padding:8px 18px;border-radius:8px;font-size:14px;font-weight:500;border:1px solid var(--border);background:transparent;color:var(--dim);cursor:pointer;white-space:nowrap;transition:all .2s}
.tab:hover{color:var(--text);border-color:var(--accent)}
.tab.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent}
main{flex:1;max-width:var(--max-w);margin:0 auto;padding:0 24px 60px;width:100%}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:all .25s;cursor:pointer}
.card:hover{border-color:var(--accent);transform:translateY(-3px);box-shadow:0 8px 32px rgba(108,108,255,.12)}
.card-header{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.card-avatar{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0}
.c0{background:linear-gradient(135deg,#6c6cff,#4834d4)}
.c1{background:linear-gradient(135deg,#ff6cb4,#e84393)}
.c2{background:linear-gradient(135deg,#00cec9,#00a8a8)}
.c3{background:linear-gradient(135deg,#fdcb6e,#e17055)}
.c4{background:linear-gradient(135deg,#6c5ce7,#a29bfe)}
.c5{background:linear-gradient(135deg,#fd79a8,#e84393)}
.c6{background:linear-gradient(135deg,#00b894,#00a381)}
.c7{background:linear-gradient(135deg,#0984e3,#74b9ff)}
.card-name{font-size:15px;font-weight:600;line-height:1.3}
.card-author{font-size:12px;color:var(--dim);margin-top:1px}
.card-desc{font-size:13px;color:var(--dim);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px}
.card-footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.card-tag{padding:3px 10px;border-radius:6px;font-size:11px;font-weight:500;background:rgba(108,108,255,.12);color:var(--accent)}
.card-meta{font-size:12px;color:var(--dim);margin-left:auto;display:flex;align-items:center;gap:4px}
.pagination{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:40px}
.page-btn{min-width:38px;height:38px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--dim);font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
.page-btn:hover{color:var(--text);border-color:var(--accent)}
.page-btn.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent}
.page-btn:disabled{opacity:.3;cursor:default}
footer{border-top:1px solid var(--border);padding:40px 24px;text-align:center}
footer p{color:var(--dim);font-size:13px;line-height:1.8}
footer .links{display:flex;justify-content:center;gap:24px;margin-bottom:12px}
footer .links a{color:var(--dim);font-size:13px}
footer .links a:hover{color:var(--text)}
.loading,.empty{text-align:center;padding:80px 24px;color:var(--dim)}
.spinner{display:inline-block;width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:640px){
  .hero h1{font-size:32px}.hero{padding:48px 16px 40px}
  .hero-stats{gap:24px}.grid{grid-template-columns:1fr}
  .header-inner{padding:0 16px}nav{gap:12px}nav a{font-size:13px}
  .btn{padding:6px 14px;font-size:13px}
}
.back-link{display:inline-flex;align-items:center;gap:4px;color:var(--dim);font-size:14px;margin-bottom:24px}
.back-link:hover{color:var(--text)}
.detail-header{display:flex;align-items:center;gap:20px;padding:32px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:24px}
.detail-avatar{width:64px;height:64px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;flex-shrink:0}
.detail-meta{flex:1}
.detail-meta h1{font-size:24px;font-weight:700;margin-bottom:4px}
.detail-meta .author{font-size:14px;color:var(--dim);display:flex;align-items:center;gap:6px}
.detail-meta .author img{width:20px;height:20px;border-radius:50%}
.detail-meta .stats{display:flex;gap:20px;margin-top:8px;font-size:13px;color:var(--dim)}
.detail-meta .stats span{display:flex;align-items:center;gap:4px}
.detail-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.detail-body{padding:0 4px;max-width:800px}
.detail-body h2{font-size:18px;font-weight:600;margin:24px 0 8px}
.detail-body h3{font-size:15px;font-weight:600;margin:16px 0 6px}
.detail-body p{font-size:14px;line-height:1.7;color:var(--dim);margin-bottom:12px}
.detail-body code{background:rgba(108,108,255,.1);padding:2px 6px;border-radius:4px;font-size:13px}
.detail-body pre{background:var(--card);border:1px solid var(--border);padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.5}
.detail-body ul,.detail-body ol{padding-left:20px;margin-bottom:12px}
.detail-body li{font-size:14px;line-height:1.7;color:var(--dim);margin-bottom:4px}
.detail-body .func-card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px}
.detail-body .func-card .func-name{font-family:monospace;font-size:14px;font-weight:600;color:var(--accent);margin-bottom:4px}
.detail-body .func-card .func-desc{font-size:13px;color:var(--dim);line-height:1.5}
</style>
</head>
<body>

<header>
<div class="header-inner">
  <a href="/" class="logo">\u{1F6D2} <span>Ouro Store</span></a>
  <nav>
    <a href="/">\u5168\u90E8\u6280\u80FD</a>
    <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
    {{NAV_AUTH}}
  </nav>
</div>
</header>

<section class="hero" id="heroSection">
  <h1><span>AI Skills</span> \u5546\u5E97</h1>
  <p>\u53D1\u73B0\u3001\u53D1\u5E03\u3001\u5B89\u88C5 AI \u667A\u80FD\u4F53\u7684 Skill \u63D2\u4EF6\uFF0C\u89E3\u9501\u65E0\u9650\u53EF\u80FD</p>
  <div class="hero-stats">
    <div><div class="num" id="statSkills">-</div><div class="label">\u4E2A Skills</div></div>
    <div><div class="num" id="statAuthors">-</div><div class="label">\u4F4D\u4F5C\u8005</div></div>
    <div><div class="num" id="statDownloads">-</div><div class="label">\u6B21\u4E0B\u8F7D</div></div>
  </div>
  <div class="search-wrap">
    <span class="search-icon">\u{1F50D}</span>
    <input type="text" id="searchInput" placeholder="\u641C\u7D22 Skill \u540D\u79F0\u6216\u63CF\u8FF0..." autocomplete="off">
  </div>
</section>

<div class="tabs-wrap" id="tabsWrap">
  <button class="tab active" data-tag="">\u5168\u90E8</button>
  <button class="tab" data-tag="search">\u641C\u7D22</button>
  <button class="tab" data-tag="chat">\u804A\u5929</button>
  <button class="tab" data-tag="image">\u56FE\u50CF</button>
  <button class="tab" data-tag="code">\u7F16\u7A0B</button>
  <button class="tab" data-tag="productivity">\u6548\u7387</button>
  <button class="tab" data-tag="finance">\u91D1\u878D</button>
  <button class="tab" data-tag="writing">\u5199\u4F5C</button>
</div>

<main>
  <div class="grid" id="skillGrid"></div>
  <div class="loading" id="loadingEl"><div class="spinner"></div></div>
  <div class="empty" id="emptyEl" style="display:none">\u6682\u65E0\u6280\u80FD\uFF0C\u5FEB\u53BB\u53D1\u5E03\u7B2C\u4E00\u4E2A\u5427 \u2728</div>
  <div class="pagination" id="pagination"></div>

  <!-- Detail View -->
  <div id="detailView" style="display:none">
    <a href="/" class="back-link">\u2190 \u8FD4\u56DE\u9996\u9875</a>
    <div class="detail-header" id="detailHeader"></div>
    <div class="detail-body" id="detailBody"></div>
  </div>
</main>

<footer>
  <div class="links">
    <a href="/">\u9996\u9875</a>
    <a href="/api/auth/github/login">\u53D1\u5E03 Skill</a>
    <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
  </div>
  <p>Ouro Skill Store \u2014 AI Skills \u7EDF\u4E00\u5206\u53D1\u5E73\u53F0</p>
  <p style="margin-top:4px">Copyright &copy; 2026 Ouro Store</p>
</footer>

<script>
(function(){
var PS=24,st={page:1,query:'',tag:'',total:0,skills:[],loading:false};

function bg(n){for(var h=0,i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return 'c'+(Math.abs(h)%8);}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split('"').join('&quot;');}
function trn(s,n){return s&&s.length>n?s.slice(0,n)+'\u2026':s;}

function escMd(s){return esc(s).split('\\n').join('<br>');}

// ── Grid View ──

function showGrid(){document.getElementById('heroSection').style.display='';document.getElementById('tabsWrap').style.display='';document.getElementById('skillGrid').style.display='';document.getElementById('pagination').style.display='';document.getElementById('loadingEl').style.display='none';document.getElementById('emptyEl').style.display='none';document.getElementById('detailView').style.display='none';}
function showDetail(){document.getElementById('heroSection').style.display='none';document.getElementById('tabsWrap').style.display='none';document.getElementById('skillGrid').style.display='none';document.getElementById('pagination').style.display='none';document.getElementById('loadingEl').style.display='none';document.getElementById('emptyEl').style.display='none';document.getElementById('detailView').style.display='block';}

function renderGrid(){
  var g=document.getElementById('skillGrid'),l=document.getElementById('loadingEl'),e=document.getElementById('emptyEl'),p=document.getElementById('pagination');
  if(st.loading&&st.skills.length===0){l.style.display='block';g.innerHTML='';e.style.display='none';p.innerHTML='';return;}
  l.style.display='none';
  if(st.skills.length===0){g.innerHTML='';e.style.display='block';p.innerHTML='';return;}
  e.style.display='none';
  var h='';
  for(var i=0;i<st.skills.length;i++){
    var s=st.skills[i],fc=(s.name||'?')[0].toUpperCase();
    var tg=(s.tags||[]).slice(0,2).map(function(t){return '<span class="card-tag">'+esc(t)+'</span>';}).join('');
    h+='<div class="card" data-name="'+esc(s.name)+'">'
      +'<div class="card-header"><div class="card-avatar '+bg(s.name)+'">'+fc+'</div><div>'
      +'<div class="card-name">'+esc(s.name)+'</div><div class="card-author">'+esc((s.author&&(s.author.login||s.author))||'anonymous')+'</div></div></div>'
      +'<div class="card-desc">'+esc(trn(s.description,100)||'\u6682\u65E0\u63CF\u8FF0')+'</div>'
      +'<div class="card-footer">'+tg+'<span class="card-meta">\u2B07 '+ (s.downloads||0)+'</span></div></div>';
  }
  g.innerHTML=h;
  var tp=Math.ceil(st.total/PS)||1;
  if(tp<=1){p.innerHTML='';return;}
  var ph='<button class="page-btn" data-page="prev"'+(st.page<=1?' disabled':'')+'>\u2039</button>';
  var stt=Math.max(1,st.page-2),end=Math.min(tp,st.page+2);
  if(stt>1){ph+='<button class="page-btn" data-page="1">1</button>';if(stt>2)ph+='<button class="page-btn" disabled>\u2026</button>';}
  for(var p=stt;p<=end;p++)ph+='<button class="page-btn'+(p===st.page?' active':'')+'" data-page="'+p+'">'+p+'</button>';
  if(end<tp){if(end<tp-1)ph+='<button class="page-btn" disabled>\u2026</button>';ph+='<button class="page-btn" data-page="'+tp+'">'+tp+'</button>';}
  ph+='<button class="page-btn" data-page="next"'+(st.page>=tp?' disabled':'')+'>\u203A</button>';
  p.innerHTML=ph;
}

function fetchGrid(){
  if(st.loading)return;st.loading=true;renderGrid();
  var off=(st.page-1)*PS,pr='limit='+PS+'&offset='+off+'&sort=downloads';
  if(st.query)pr+='&q='+encodeURIComponent(st.query);
  if(st.tag)pr+='&tag='+encodeURIComponent(st.tag);
  fetch('/api/skills?'+pr).then(function(r){return r.json();}).then(function(d){
    if(d.success){st.skills=d.skills||[];st.total=d.total||0;}else{st.skills=[];st.total=0;}
    st.loading=false;renderGrid();
  }).catch(function(){st.skills=[];st.total=0;st.loading=false;renderGrid();});
}

function fetchStats(){
  fetch('/api/skills?limit=100&offset=0&sort=downloads').then(function(r){return r.json();}).then(function(d){
    if(d.success&&d.total>0){
      document.getElementById('statSkills').textContent=d.total;
      if(d.skills){var au={},dl=0;for(var i=0;i<d.skills.length;i++){au[(d.skills[i].author&&d.skills[i].author.login)||d.skills[i].author||'unknown']=true;dl+=d.skills[i].downloads||0;}
      document.getElementById('statAuthors').textContent=Object.keys(au).length;
      document.getElementById('statDownloads').textContent=dl>10000?Math.round(dl/1000)+'k':dl;}
    }
  }).catch(function(){});
}

// ── Detail View ──

function renderDetail(skill){
  showDetail();
  var fc=(skill.name||'?')[0].toUpperCase(),au=skill.author||{},login=au.login||'anonymous',avatar=au.avatar_url||'';
  var tg=(skill.tags||[]).map(function(t){return '<span class="card-tag">'+esc(t)+'</span>';}).join('');
  document.getElementById('detailHeader').innerHTML=
    '<div class="card-avatar detail-avatar '+bg(skill.name)+'">'+fc+'</div>'
    +'<div class="detail-meta">'
    +'<h1>'+esc(skill.name)+'</h1>'
    +'<div class="author">'+(avatar?'<img src="'+avatar+'" alt="">':'')+esc(login)+'</div>'
    +'<div class="stats">'
    +'<span>\u2B07 '+ (skill.downloads||0)+' \u6B21\u4E0B\u8F7D</span>'
    +'<span>\u{1F4E6} v'+(skill.latest_version||'0.0')+'</span>'
    +'<span>\u{1F4CA} '+(skill.rating_avg||'-')+' \u5206</span>'
    +'</div>'
    +'<div class="detail-tags">'+tg+'</div>'
    +'</div>';
  var body='';
  if(skill.description){
    var lines=skill.description.split('\\n'),inFunc=false;
    for(var i=0;i<lines.length;i++){
      var l=lines[i];
      if(/^### /.test(l)){body+='<h3>'+esc(l.slice(4))+'</h3>';continue;}
      if(/^## /.test(l)){body+='<h2>'+esc(l.slice(3))+'</h2>';continue;}
      if(/^# /.test(l)){body+='<h2>'+esc(l.slice(2))+'</h2>';continue;}
      if(/^\\x60{3}/.test(l)||/^\\x60{3}/.test(l)){inFunc=!inFunc;body+=inFunc?'<pre>':'</pre>';continue;}
      if(inFunc){body+=esc(l)+'\\n';continue;}
      if(l.indexOf('- ')===0){body+='<li>'+esc(l.slice(2))+'</li>';continue;}
      if(/^\\d+\\./.test(l)){body+='<li>'+esc(l)+'</li>';continue;}
      if(/^\\*\\*(.+?)\\*\\*/.test(l)){body+='<p>'+escMd(l)+'</p>';continue;}
      if(l.trim()===''){continue;}
      body+='<p>'+escMd(l)+'</p>';
    }
    body=body.replace(/(<li>.*<\\/li>)+/g,function(m){return '<ul>'+m+'</ul>';});
  }
  // Functions
  if(skill.functions&&skill.functions.length){
    body+='<h2>\u{1F4CB} Functions ('+skill.functions.length+')</h2>';
    for(var i=0;i<skill.functions.length;i++){
      var fn=skill.functions[i];
      body+='<div class="func-card"><div class="func-name">'+esc(fn.name)+'('+esc((fn.params||[]).join(', '))+')</div>'
        +(fn.description?'<div class="func-desc">'+esc(fn.description)+'</div>':'')+'</div>';
    }
  }
  document.getElementById('detailBody').innerHTML=body;
}

function loadDetail(name){
  showDetail();
  document.getElementById('detailHeader').innerHTML='';
  document.getElementById('detailBody').innerHTML='<div class="loading" style="display:block"><div class="spinner"></div></div>';
  fetch('/api/skills/'+encodeURIComponent(name)).then(function(r){return r.json();}).then(function(d){
    if(d.success&&d.skill){renderDetail(d.skill);}else{document.getElementById('detailBody').innerHTML='<div class="empty" style="display:block">\u6280\u80FD\u4E0D\u5B58\u5728</div>';}
  }).catch(function(){document.getElementById('detailBody').innerHTML='<div class="empty" style="display:block">\u52A0\u8F7D\u5931\u8D25</div>';});
}

// ── Router ──

function route(){
  var p=location.pathname;
  if(p.indexOf('/skill/')===0){
    loadDetail(decodeURIComponent(p.slice(7)));
  }else{
    showGrid();
    fetchGrid();
    fetchStats();
  }
}

// ── Event Listeners ──

document.getElementById('searchInput').addEventListener('input',function(){
  clearTimeout(this._timer);var _=this;
  this._timer=setTimeout(function(){st.query=_.value.trim();st.page=1;fetchGrid();},300);
});

document.getElementById('tabsWrap').addEventListener('click',function(e){
  var btn=e.target.closest('.tab');if(!btn)return;
  [].forEach.call(document.querySelectorAll('.tab'),function(t){t.classList.remove('active');});
  btn.classList.add('active');st.tag=btn.getAttribute('data-tag');st.page=1;fetchGrid();
});

document.getElementById('skillGrid').addEventListener('click',function(e){
  var card=e.target.closest('.card');if(card)location.href='/skill/'+encodeURIComponent(card.getAttribute('data-name'));
});

document.getElementById('pagination').addEventListener('click',function(e){
  var btn=e.target.closest('.page-btn');if(!btn||btn.disabled)return;
  var p=btn.getAttribute('data-page'),tp=Math.ceil(st.total/PS)||1;
  if(p==='prev')st.page=Math.max(1,st.page-1);else if(p==='next')st.page=Math.min(tp,st.page+1);else st.page=Number(p);
  fetchGrid();window.scrollTo({top:0,behavior:'smooth'});
});

route();
})();
</script>
</body>
</html>`;

async function renderPage(c: any) {
  const tokenCookie = c.req.header('Cookie')?.split(';').find((c: string) => c.trim().startsWith('token='));
  let loginUser: string | null = null;
  if (tokenCookie) {
    const token = tokenCookie.split('=')[1]?.trim();
    if (token) {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (payload) loginUser = payload.login;
    }
  }
  const navAuth = loginUser
    ? `<span style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text)">${loginUser}<a href="/api/auth/github/login" class="btn btn-primary">发布 Skill</a></span>`
    : `<a href="/api/auth/github/login" class="btn btn-ghost">登录</a><a href="/api/auth/github/login" class="btn btn-primary">发布 Skill</a>`;
  return c.html(PAGE_HTML.replace('{{NAV_AUTH}}', navAuth));
}

app.get('/', renderPage);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
});

app.notFound(async (c) => {
  // 非 API 路径统一返回 SPA HTML，让前端 JS 处理路由
  if (!c.req.path.startsWith('/api/')) return renderPage(c);
  return c.json({ success: false, error: 'Not Found' }, 404);
});

export default app;
