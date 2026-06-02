const C=["localhost","127.0.0.1"].includes(location.hostname),I=window.__WIKI_AI_BACKEND__||(C?"http://localhost:8008":"/agent"),S=5,E=12e3;async function v(e){const t=await fetch(e,{credentials:"same-origin",headers:{Accept:"application/json"}});if(!t.ok)throw new Error(`GROWI API ${e} -> ${t.status}`);return t.json()}async function _(e,t=S){const n=await v(`/_api/search?q=${encodeURIComponent(e)}&limit=${t}`);return((n==null?void 0:n.data)??[]).map(r=>{var p;return((p=r==null?void 0:r.data)==null?void 0:p.path)??(r==null?void 0:r.path)}).filter(r=>!!r).filter(r=>!r.startsWith("/trash/"))}async function A(e){var t,n;try{const i=await v(`/_api/v3/page?path=${encodeURIComponent(e)}`),r=((n=(t=i==null?void 0:i.page)==null?void 0:t.revision)==null?void 0:n.body)??"";return r.trim()?{path:e,body:r.slice(0,E)}:null}catch{return null}}async function L(e){const t=await _(e);return(await Promise.all(t.map(A))).filter(i=>i!==null)}async function x(e,t){const n=await fetch(`${I}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!n.ok)throw new Error(`Agent ${e} -> ${n.status}`);return n.json()}async function O(e){try{const t=await x("/search-query",{question:e});return(t==null?void 0:t.query)||e}catch{return e}}async function T(e,t){const n=await x("/chat",{question:e,passages:t});return{text:(n==null?void 0:n.text)??"",sources:(n==null?void 0:n.sources)??[]}}const w="wiki-ai-chat-style",o="wiki-ai-chat-root",m="wiki-ai-chat-history",H=50,M=`
#${o} { position: fixed; right: 20px; bottom: 20px; z-index: 1050; font-size: 14px;
  font-family: var(--bs-body-font-family, system-ui, sans-serif); }
#${o} svg { display: block; }
#${o} .wai-fab { width: 56px; height: 56px; border-radius: 50%; border: none;
  background: var(--bs-primary, #4794d3); color: #fff; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; }
#${o} .wai-fab:hover { filter: brightness(0.93); }
#${o} .wai-panel { display: none; flex-direction: column; width: 360px; height: 520px;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529);
  border: 1px solid var(--bs-border-color, #dee2e6); border-radius: var(--bs-border-radius-lg, 12px);
  overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,.22); }
#${o}.open .wai-panel { display: flex; }
#${o}.open .wai-fab { display: none; }
#${o} .wai-head { background: var(--bs-primary, #4794d3); color: #fff; padding: 10px 12px;
  display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#${o} .wai-head .wai-title { font-weight: 600; }
#${o} .wai-head-actions { display: flex; align-items: center; gap: 4px; }
#${o} .wai-head button { background: transparent; border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; padding: 4px; border-radius: 6px; opacity: .85; }
#${o} .wai-head button:hover { opacity: 1; background: rgba(255,255,255,.18); }
#${o} .wai-log { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column;
  background: var(--bs-tertiary-bg, var(--bs-secondary-bg, #f8f9fa)); }
#${o} .wai-msg { max-width: 88%; margin-bottom: 10px; padding: 8px 10px;
  border-radius: var(--bs-border-radius, 8px); white-space: pre-wrap; line-height: 1.5; word-break: break-word; }
#${o} .wai-user { align-self: flex-end; background: var(--bs-primary-bg-subtle, #cfe2ff);
  color: var(--bs-emphasis-color, var(--bs-body-color, #212529)); }
#${o} .wai-bot { align-self: flex-start; background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6); }
#${o} .wai-src { font-size: 12px; color: var(--bs-secondary-color, #6c757d); margin-top: 6px; }
#${o} .wai-src a { color: var(--bs-link-color, var(--bs-primary, #4794d3)); }
#${o} .wai-actions { margin-top: 6px; }
#${o} .wai-copy { font-size: 12px; background: transparent; border: 1px solid var(--bs-border-color, #dee2e6);
  color: var(--bs-secondary-color, #6c757d); border-radius: 6px; padding: 2px 8px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px; }
#${o} .wai-copy:hover { color: var(--bs-body-color, #212529); border-color: var(--bs-secondary-color, #6c757d); }
#${o} .wai-form { display: flex; border-top: 1px solid var(--bs-border-color, #dee2e6); }
#${o} .wai-form input { flex: 1; border: none; padding: 10px; outline: none;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529); }
#${o} .wai-form button { border: none; background: var(--bs-primary, #4794d3); color: #fff;
  padding: 0 16px; cursor: pointer; }
#${o} .wai-form button:hover { filter: brightness(0.93); }
`,B='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',j='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',q='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',N='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';function b(e){const t=document.createElement("template");return t.innerHTML=e.trim(),t.content.firstElementChild}function R(){if(document.getElementById(w))return;const e=document.createElement("style");e.id=w,e.textContent=M,document.head.appendChild(e)}function W(e){return e.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t])}function D(){try{const e=localStorage.getItem(m),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}function h(e){try{localStorage.setItem(m,JSON.stringify(e.slice(-H)))}catch{}}function y(){if(document.getElementById(o))return;R();const e=b(`
    <div id="${o}">
      <button class="wai-fab" title="Wiki AI に質問" aria-label="Wiki AI に質問">${B}</button>
      <div class="wai-panel">
        <div class="wai-head">
          <span class="wai-title">Wiki AI アシスタント</span>
          <span class="wai-head-actions">
            <button class="wai-clear" title="履歴を消去" aria-label="履歴を消去">${q}</button>
            <button class="wai-close" title="閉じる" aria-label="閉じる">${j}</button>
          </span>
        </div>
        <div class="wai-log"></div>
        <form class="wai-form">
          <input type="text" placeholder="Wiki に質問…" autocomplete="off" />
          <button type="submit">送信</button>
        </form>
      </div>
    </div>
  `);document.body.appendChild(e);const t=e.querySelector(".wai-log"),n=e.querySelector(".wai-form"),i=e.querySelector("input");let r=D();const p=s=>{const a=b(`<div class="wai-msg ${s.role==="user"?"wai-user":"wai-bot"}"></div>`),f=document.createElement("div");if(f.textContent=s.text,a.appendChild(f),s.role==="bot"){if(s.sources&&s.sources.length){const d=b(`<div class="wai-src">参照: ${s.sources.map(u=>`<a href="${encodeURI(u)}" target="_blank" rel="noopener">${W(u)}</a>`).join(" / ")}</div>`);a.appendChild(d)}const c=b('<div class="wai-actions"></div>'),l=b(`<button class="wai-copy" type="button">${N}<span>コピー</span></button>`);l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(s.text);const d=l.querySelector("span"),u=d.textContent;d.textContent="コピーしました",setTimeout(()=>{d.textContent=u},1500)}catch{}}),c.appendChild(l),a.appendChild(c)}return t.appendChild(a),t.scrollTop=t.scrollHeight,a};r.forEach(p),e.querySelector(".wai-fab").addEventListener("click",()=>e.classList.add("open")),e.querySelector(".wai-close").addEventListener("click",()=>e.classList.remove("open")),e.querySelector(".wai-clear").addEventListener("click",()=>{r=[],h(r),t.innerHTML=""}),n.addEventListener("submit",async s=>{s.preventDefault();const a=i.value.trim();if(!a)return;i.value="";const f={role:"user",text:a};p(f),r.push(f),h(r);const c=b('<div class="wai-msg wai-bot"></div>');c.textContent="考え中…",t.appendChild(c),t.scrollTop=t.scrollHeight;try{const l=await O(a),d=await L(l),{text:u,sources:$}=await T(a,d);c.remove();const g={role:"bot",text:u||"(回答が空でした)",sources:$};p(g),r.push(g),h(r)}catch(l){c.textContent=`エラー: ${l.message}`}t.scrollTop=t.scrollHeight})}function P(){var e,t;(e=document.getElementById(o))==null||e.remove(),(t=document.getElementById(w))==null||t.remove()}const U="growi-plugin-wiki-ai-chat",k=()=>{document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y,{once:!0}):y()},Y=()=>{P()};window.pluginActivators=window.pluginActivators||{};window.pluginActivators[U]={activate:k,deactivate:Y};k();
