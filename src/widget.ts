// フローティングのチャットウィジェット (素の DOM)。React 依存なし。
import { retrieveAsUser } from './growi-api';
import { chat, toSearchQuery } from './backend';

const STYLE_ID = 'wiki-ai-chat-style';
const ROOT_ID = 'wiki-ai-chat-root';

const CSS = `
#${ROOT_ID} { position: fixed; right: 20px; bottom: 20px; z-index: 1050; font-size: 14px; }
#${ROOT_ID} .wai-fab { width: 56px; height: 56px; border-radius: 50%; border: none;
  background: #1d72b8; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  display: flex; align-items: center; justify-content: center; }
#${ROOT_ID} .wai-fab:hover { background: #155a91; }
#${ROOT_ID} svg { display: block; }
#${ROOT_ID} .wai-head button { display: flex; align-items: center; }
#${ROOT_ID} .wai-panel { display: none; flex-direction: column; width: 360px; height: 480px;
  background: #fff; border: 1px solid #d0d7de; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.22); }
#${ROOT_ID}.open .wai-panel { display: flex; }
#${ROOT_ID}.open .wai-fab { display: none; }
#${ROOT_ID} .wai-head { background: #1d72b8; color: #fff; padding: 10px 12px; display: flex;
  justify-content: space-between; align-items: center; }
#${ROOT_ID} .wai-head button { background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; }
#${ROOT_ID} .wai-log { flex: 1; overflow-y: auto; padding: 12px; background: #f6f8fa; }
#${ROOT_ID} .wai-msg { margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; line-height: 1.5; }
#${ROOT_ID} .wai-user { background: #dbeafe; align-self: flex-end; }
#${ROOT_ID} .wai-bot { background: #fff; border: 1px solid #e1e4e8; }
#${ROOT_ID} .wai-src { font-size: 12px; color: #57606a; margin-top: 6px; }
#${ROOT_ID} .wai-src a { color: #1d72b8; }
#${ROOT_ID} .wai-form { display: flex; border-top: 1px solid #d0d7de; }
#${ROOT_ID} .wai-form input { flex: 1; border: none; padding: 10px; outline: none; }
#${ROOT_ID} .wai-form button { border: none; background: #1d72b8; color: #fff; padding: 0 16px; cursor: pointer; }
`;

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function mountWidget(): void {
  if (document.getElementById(ROOT_ID)) return;
  injectStyle();

  // インライン SVG アイコン (絵文字ではなく。色は currentColor を継承)
  const ICON_CHAT =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9'
    + 'L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5'
    + 'a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  const ICON_CLOSE =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  const root = el(`
    <div id="${ROOT_ID}">
      <button class="wai-fab" title="Wiki AI に質問" aria-label="Wiki AI に質問">${ICON_CHAT}</button>
      <div class="wai-panel">
        <div class="wai-head"><span>Wiki AI アシスタント</span><button class="wai-close" aria-label="閉じる">${ICON_CLOSE}</button></div>
        <div class="wai-log"></div>
        <form class="wai-form">
          <input type="text" placeholder="Wiki に質問…" autocomplete="off" />
          <button type="submit">送信</button>
        </form>
      </div>
    </div>
  `);
  document.body.appendChild(root);

  const log = root.querySelector('.wai-log') as HTMLElement;
  const form = root.querySelector('.wai-form') as HTMLFormElement;
  const input = root.querySelector('input') as HTMLInputElement;

  const addMsg = (text: string, cls: 'wai-user' | 'wai-bot'): HTMLElement => {
    const m = el(`<div class="wai-msg ${cls}"></div>`);
    m.textContent = text;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };

  root.querySelector('.wai-fab')!.addEventListener('click', () => root.classList.add('open'));
  root.querySelector('.wai-close')!.addEventListener('click', () => root.classList.remove('open'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    addMsg(question, 'wai-user');
    const pending = addMsg('考え中…', 'wai-bot');
    try {
      const query = await toSearchQuery(question);
      const passages = await retrieveAsUser(query); // ← ユーザー権限で検索
      const { text, sources } = await chat(question, passages);
      pending.textContent = text || '(回答が空でした)';
      if (sources.length) {
        const src = el(`<div class="wai-src">参照: ${sources
          .map((p) => `<a href="${encodeURI(p)}" target="_blank" rel="noopener">${escapeHtml(p)}</a>`)
          .join(' / ')}</div>`);
        pending.appendChild(src);
      }
    } catch (err) {
      pending.textContent = `エラー: ${(err as Error).message}`;
    }
    log.scrollTop = log.scrollHeight;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function unmountWidget(): void {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
