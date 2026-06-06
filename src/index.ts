import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
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
</style>
</head>
<body>

<header>
<div class="header-inner">
  <a href="/" class="logo">\u{1F6D2} <span>Ouro Store</span></a>
  <nav>
    <a href="/">\u5168\u90E8\u6280\u80FD</a>
    <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
    <a href="/api/auth/github/login" class="btn btn-ghost">\u767B\u5F55</a>
    <a href="/api/auth/github/login" class="btn btn-primary">\u53D1\u5E03 Skill</a>
  </nav>
</div>
</header>

<section class="hero">
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
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\x22/g,'&quot;');}
function trn(s,n){return s&&s.length>n?s.slice(0,n)+'\u2026':s;}

function render(){
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

function fetchData(){
  if(st.loading)return;st.loading=true;render();
  var off=(st.page-1)*PS,pr='limit='+PS+'&offset='+off+'&sort=downloads';
  if(st.query)pr+='&q='+encodeURIComponent(st.query);
  if(st.tag)pr+='&tag='+encodeURIComponent(st.tag);
  fetch('/api/skills?'+pr).then(function(r){return r.json();}).then(function(d){
    if(d.success){st.skills=d.skills||[];st.total=d.total||0;}else{st.skills=[];st.total=0;}
    st.loading=false;render();
  }).catch(function(){st.skills=[];st.total=0;st.loading=false;render();});
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

document.getElementById('searchInput').addEventListener('input',function(){
  clearTimeout(this._timer);var _=this;
  this._timer=setTimeout(function(){st.query=_.value.trim();st.page=1;fetchData();},300);
});

document.getElementById('tabsWrap').addEventListener('click',function(e){
  var btn=e.target.closest('.tab');if(!btn)return;
  [].forEach.call(document.querySelectorAll('.tab'),function(t){t.classList.remove('active');});
  btn.classList.add('active');st.tag=btn.getAttribute('data-tag');st.page=1;fetchData();
});

document.getElementById('skillGrid').addEventListener('click',function(e){
  var card=e.target.closest('.card');if(card)location.href='/skill/'+encodeURIComponent(card.getAttribute('data-name'));
});

document.getElementById('pagination').addEventListener('click',function(e){
  var btn=e.target.closest('.page-btn');if(!btn||btn.disabled)return;
  var p=btn.getAttribute('data-page'),tp=Math.ceil(st.total/PS)||1;
  if(p==='prev')st.page=Math.max(1,st.page-1);else if(p==='next')st.page=Math.min(tp,st.page+1);else st.page=Number(p);
  fetchData();window.scrollTo({top:0,behavior:'smooth'});
});

fetchData();fetchStats();
})();
</script>
</body>
</html>`;

app.get('/', (c) => {
  return c.html(PAGE_HTML);
});

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

export default app;
