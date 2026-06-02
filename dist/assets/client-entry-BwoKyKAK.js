const k=["localhost","127.0.0.1"].includes(location.hostname),C=window.__WIKI_AI_BACKEND__||(k?"http://localhost:8008":"/agent"),I=5,_=12e3;async function m(e){const t=await fetch(e,{credentials:"same-origin",headers:{Accept:"application/json"}});if(!t.ok)throw new Error(`GROWI API ${e} -> ${t.status}`);return t.json()}async function E(e,t=I){const n=await m(`/_api/search?q=${encodeURIComponent(e)}&limit=${t}`);return((n==null?void 0:n.data)??[]).map(i=>{var c;return((c=i==null?void 0:i.data)==null?void 0:c.path)??(i==null?void 0:i.path)}).filter(i=>!!i).filter(i=>!i.startsWith("/trash/"))}async function A(e){var t,n;try{const a=await m(`/_api/v3/page?path=${encodeURIComponent(e)}`),i=((n=(t=a==null?void 0:a.page)==null?void 0:t.revision)==null?void 0:n.body)??"";return i.trim()?{path:e,body:i.slice(0,_)}:null}catch{return null}}async function S(e){const t=await E(e);return(await Promise.all(t.map(A))).filter(a=>a!==null)}async function b(e,t){const n=await fetch(`${C}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!n.ok)throw new Error(`Agent ${e} -> ${n.status}`);return n.json()}async function L(e){try{const t=await b("/search-query",{question:e});return(t==null?void 0:t.query)||e}catch{return e}}async function O(e,t){const n=await b("/chat",{question:e,passages:t});return{text:(n==null?void 0:n.text)??"",sources:(n==null?void 0:n.sources)??[]}}const p="wiki-ai-chat-style",o="wiki-ai-chat-root",j=`
#${o} { position: fixed; right: 20px; bottom: 20px; z-index: 1050; font-size: 14px; }
#${o} .wai-fab { width: 56px; height: 56px; border-radius: 50%; border: none;
  background: #1d72b8; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  display: flex; align-items: center; justify-content: center; }
#${o} .wai-fab:hover { background: #155a91; }
#${o} svg { display: block; }
#${o} .wai-head button { display: flex; align-items: center; }
#${o} .wai-panel { display: none; flex-direction: column; width: 360px; height: 480px;
  background: #fff; border: 1px solid #d0d7de; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.22); }
#${o}.open .wai-panel { display: flex; }
#${o}.open .wai-fab { display: none; }
#${o} .wai-head { background: #1d72b8; color: #fff; padding: 10px 12px; display: flex;
  justify-content: space-between; align-items: center; }
#${o} .wai-head button { background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; }
#${o} .wai-log { flex: 1; overflow-y: auto; padding: 12px; background: #f6f8fa; }
#${o} .wai-msg { margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; line-height: 1.5; }
#${o} .wai-user { background: #dbeafe; align-self: flex-end; }
#${o} .wai-bot { background: #fff; border: 1px solid #e1e4e8; }
#${o} .wai-src { font-size: 12px; color: #57606a; margin-top: 6px; }
#${o} .wai-src a { color: #1d72b8; }
#${o} .wai-form { display: flex; border-top: 1px solid #d0d7de; }
#${o} .wai-form input { flex: 1; border: none; padding: 10px; outline: none; }
#${o} .wai-form button { border: none; background: #1d72b8; color: #fff; padding: 0 16px; cursor: pointer; }
`;function u(e){const t=document.createElement("template");return t.innerHTML=e.trim(),t.content.firstElementChild}function B(){if(document.getElementById(p))return;const e=document.createElement("style");e.id=p,e.textContent=j,document.head.appendChild(e)}function g(){if(document.getElementById(o))return;B();const n=u(`
    <div id="${o}">
      <button class="wai-fab" title="Wiki AI に質問" aria-label="Wiki AI に質問"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
      <div class="wai-panel">
        <div class="wai-head"><span>Wiki AI アシスタント</span><button class="wai-close" aria-label="閉じる"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="wai-log"></div>
        <form class="wai-form">
          <input type="text" placeholder="Wiki に質問…" autocomplete="off" />
          <button type="submit">送信</button>
        </form>
      </div>
    </div>
  `);document.body.appendChild(n);const a=n.querySelector(".wai-log"),i=n.querySelector(".wai-form"),c=n.querySelector("input"),f=(d,s)=>{const r=u(`<div class="wai-msg ${s}"></div>`);return r.textContent=d,a.appendChild(r),a.scrollTop=a.scrollHeight,r};n.querySelector(".wai-fab").addEventListener("click",()=>n.classList.add("open")),n.querySelector(".wai-close").addEventListener("click",()=>n.classList.remove("open")),i.addEventListener("submit",async d=>{d.preventDefault();const s=c.value.trim();if(!s)return;c.value="",f(s,"wai-user");const r=f("考え中…","wai-bot");try{const l=await L(s),y=await S(l),{text:v,sources:w}=await O(s,y);if(r.textContent=v||"(回答が空でした)",w.length){const $=u(`<div class="wai-src">参照: ${w.map(h=>`<a href="${encodeURI(h)}" target="_blank" rel="noopener">${T(h)}</a>`).join(" / ")}</div>`);r.appendChild($)}}catch(l){r.textContent=`エラー: ${l.message}`}a.scrollTop=a.scrollHeight})}function T(e){return e.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function q(){var e,t;(e=document.getElementById(o))==null||e.remove(),(t=document.getElementById(p))==null||t.remove()}const W="growi-plugin-wiki-ai-chat",x=()=>{document.readyState==="loading"?document.addEventListener("DOMContentLoaded",g,{once:!0}):g()},D=()=>{q()};window.pluginActivators=window.pluginActivators||{};window.pluginActivators[W]={activate:x,deactivate:D};x();
