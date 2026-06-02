// フローティングのチャットウィジェット (素の DOM)。React 依存なし。
import { retrieveAsUser } from './growi-api';
import { chat, toSearchQuery } from './backend';

const STYLE_ID = 'wiki-ai-chat-style';
const ROOT_ID = 'wiki-ai-chat-root';
const HISTORY_KEY = 'wiki-ai-chat-history';
const HISTORY_MAX = 50; // 保存する最大メッセージ数 (localStorage の肥大化防止)

type Role = 'user' | 'bot';
interface Msg {
  role: Role;
  text: string;
  sources?: string[];
}

// GROWI (Bootstrap 5) の CSS 変数に追従し、ライト/ダーク両テーマに馴染ませる。
// 変数が無い環境向けにフォールバック値も指定。
const CSS = `
#${ROOT_ID} { position: fixed; right: 20px; bottom: 20px; z-index: 1050; font-size: 14px;
  font-family: var(--bs-body-font-family, system-ui, sans-serif); }
#${ROOT_ID} svg { display: block; }
#${ROOT_ID} .wai-fab { width: 56px; height: 56px; border-radius: 50%; border: none;
  background: var(--bs-primary, #4794d3); color: #fff; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; }
#${ROOT_ID} .wai-fab:hover { filter: brightness(0.93); }
#${ROOT_ID} .wai-panel { display: none; flex-direction: column; width: 360px; height: 520px;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529);
  border: 1px solid var(--bs-border-color, #dee2e6); border-radius: var(--bs-border-radius-lg, 12px);
  overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,.22); }
#${ROOT_ID}.open .wai-panel { display: flex; }
#${ROOT_ID}.open .wai-fab { display: none; }
#${ROOT_ID} .wai-head { background: var(--bs-primary, #4794d3); color: #fff; padding: 10px 12px;
  display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#${ROOT_ID} .wai-head .wai-title { font-weight: 600; }
#${ROOT_ID} .wai-head-actions { display: flex; align-items: center; gap: 4px; }
#${ROOT_ID} .wai-head button { background: transparent; border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; padding: 4px; border-radius: 6px; opacity: .85; }
#${ROOT_ID} .wai-head button:hover { opacity: 1; background: rgba(255,255,255,.18); }
#${ROOT_ID} .wai-log { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column;
  background: var(--bs-tertiary-bg, var(--bs-secondary-bg, #f8f9fa)); }
#${ROOT_ID} .wai-msg { max-width: 88%; margin-bottom: 10px; padding: 8px 10px;
  border-radius: var(--bs-border-radius, 8px); white-space: pre-wrap; line-height: 1.5; word-break: break-word; }
#${ROOT_ID} .wai-user { align-self: flex-end; background: var(--bs-primary-bg-subtle, #cfe2ff);
  color: var(--bs-emphasis-color, var(--bs-body-color, #212529)); }
#${ROOT_ID} .wai-bot { align-self: flex-start; background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6); }
#${ROOT_ID} .wai-src { font-size: 12px; color: var(--bs-secondary-color, #6c757d); margin-top: 6px; }
#${ROOT_ID} .wai-src a { color: var(--bs-link-color, var(--bs-primary, #4794d3)); }
#${ROOT_ID} .wai-actions { margin-top: 6px; }
#${ROOT_ID} .wai-copy { font-size: 12px; background: transparent; border: 1px solid var(--bs-border-color, #dee2e6);
  color: var(--bs-secondary-color, #6c757d); border-radius: 6px; padding: 2px 8px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px; }
#${ROOT_ID} .wai-copy:hover { color: var(--bs-body-color, #212529); border-color: var(--bs-secondary-color, #6c757d); }
#${ROOT_ID} .wai-form { display: flex; border-top: 1px solid var(--bs-border-color, #dee2e6); }
#${ROOT_ID} .wai-form input { flex: 1; border: none; padding: 10px; outline: none;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529); }
#${ROOT_ID} .wai-form button { border: none; background: var(--bs-primary, #4794d3); color: #fff;
  padding: 0 16px; cursor: pointer; }
#${ROOT_ID} .wai-form button:hover { filter: brightness(0.93); }
`;

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
const ICON_TRASH =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
  + '<path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const ICON_COPY =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>'
  + '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

// --- localStorage 履歴 ---
function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(history: Msg[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {
    /* 容量超過等は黙って無視 */
  }
}

export function mountWidget(): void {
  if (document.getElementById(ROOT_ID)) return;
  injectStyle();

  const root = el(`
    <div id="${ROOT_ID}">
      <button class="wai-fab" title="Wiki AI に質問" aria-label="Wiki AI に質問">${ICON_CHAT}</button>
      <div class="wai-panel">
        <div class="wai-head">
          <span class="wai-title">Wiki AI アシスタント</span>
          <span class="wai-head-actions">
            <button class="wai-clear" title="履歴を消去" aria-label="履歴を消去">${ICON_TRASH}</button>
            <button class="wai-close" title="閉じる" aria-label="閉じる">${ICON_CLOSE}</button>
          </span>
        </div>
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

  let history: Msg[] = loadHistory();

  // 1 メッセージ分の DOM を生成 (bot にはコピー & 参照を付ける)
  const renderMsg = (msg: Msg): HTMLElement => {
    const m = el(`<div class="wai-msg ${msg.role === 'user' ? 'wai-user' : 'wai-bot'}"></div>`);
    const body = document.createElement('div');
    body.textContent = msg.text;
    m.appendChild(body);

    if (msg.role === 'bot') {
      if (msg.sources && msg.sources.length) {
        const src = el(`<div class="wai-src">参照: ${msg.sources
          .map((p) => `<a href="${encodeURI(p)}" target="_blank" rel="noopener">${escapeHtml(p)}</a>`)
          .join(' / ')}</div>`);
        m.appendChild(src);
      }
      const actions = el('<div class="wai-actions"></div>');
      const copyBtn = el(`<button class="wai-copy" type="button">${ICON_COPY}<span>コピー</span></button>`);
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(msg.text);
          const label = copyBtn.querySelector('span')!;
          const prev = label.textContent;
          label.textContent = 'コピーしました';
          setTimeout(() => { label.textContent = prev; }, 1500);
        } catch {
          /* クリップボード不可環境は無視 */
        }
      });
      actions.appendChild(copyBtn);
      m.appendChild(actions);
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };

  // 履歴を復元 (保存はしない)
  history.forEach(renderMsg);

  root.querySelector('.wai-fab')!.addEventListener('click', () => root.classList.add('open'));
  root.querySelector('.wai-close')!.addEventListener('click', () => root.classList.remove('open'));
  root.querySelector('.wai-clear')!.addEventListener('click', () => {
    history = [];
    saveHistory(history);
    log.innerHTML = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';

    const userMsg: Msg = { role: 'user', text: question };
    renderMsg(userMsg);
    history.push(userMsg);
    saveHistory(history);

    // 考え中… (履歴には保存しない仮メッセージ)
    const pending = el('<div class="wai-msg wai-bot"></div>');
    pending.textContent = '考え中…';
    log.appendChild(pending);
    log.scrollTop = log.scrollHeight;

    try {
      const query = await toSearchQuery(question);
      const passages = await retrieveAsUser(query); // ← ユーザー権限で検索
      const { text, sources } = await chat(question, passages);
      pending.remove();
      const botMsg: Msg = { role: 'bot', text: text || '(回答が空でした)', sources };
      renderMsg(botMsg);
      history.push(botMsg);
      saveHistory(history);
    } catch (err) {
      pending.textContent = `エラー: ${(err as Error).message}`;
    }
    log.scrollTop = log.scrollHeight;
  });
}

export function unmountWidget(): void {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
