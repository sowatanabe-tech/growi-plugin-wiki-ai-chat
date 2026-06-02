// フローティングのチャットウィジェット (素の DOM)。React 依存なし。
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { diffLines } from 'diff';
import {
  retrieveAsUser, getCurrentPage, getCurrentPageFull, updatePage, createPage, getCanEdit, type Passage,
} from './growi-api';
import { chat, toSearchQuery, editDraft, editDraftFromFile, type Turn } from './backend';

const STYLE_ID = 'wiki-ai-chat-style';
const ROOT_ID = 'wiki-ai-chat-root';
const HISTORY_KEY = 'wiki-ai-chat-history';
const HISTORY_MAX = 50; // localStorage 保存の最大メッセージ数
const CONTEXT_TURNS = 6; // マルチターンで Gemini に渡す直近会話数

marked.setOptions({ breaks: true });

type Role = 'user' | 'bot';
interface Msg {
  role: Role;
  text: string;
  sources?: string[];
}

// GROWI (Bootstrap 5) の CSS 変数に追従し、ライト/ダーク両テーマに馴染ませる。
const CSS = `
#${ROOT_ID} { position: fixed; right: 20px; bottom: 20px; z-index: 1050; font-size: 14px;
  font-family: var(--bs-body-font-family, system-ui, sans-serif); }
#${ROOT_ID} svg { display: block; }
#${ROOT_ID} .wai-fab { width: 56px; height: 56px; border-radius: 50%; border: none;
  background: var(--bs-primary, #4794d3); color: #fff; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; }
#${ROOT_ID} .wai-fab:hover { filter: brightness(0.93); }
#${ROOT_ID} .wai-panel { display: none; flex-direction: column; width: 380px; height: 540px;
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
#${ROOT_ID} .wai-msg { max-width: 90%; margin-bottom: 10px; padding: 8px 10px;
  border-radius: var(--bs-border-radius, 8px); line-height: 1.5; word-break: break-word; }
#${ROOT_ID} .wai-user { align-self: flex-end; white-space: pre-wrap;
  background: var(--bs-primary-bg-subtle, #cfe2ff); color: var(--bs-emphasis-color, var(--bs-body-color, #212529)); }
#${ROOT_ID} .wai-bot { align-self: flex-start; background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6); }
/* Markdown 描画 */
#${ROOT_ID} .wai-md > *:first-child { margin-top: 0; }
#${ROOT_ID} .wai-md > *:last-child { margin-bottom: 0; }
#${ROOT_ID} .wai-md p { margin: 0 0 .5em; }
#${ROOT_ID} .wai-md ul, #${ROOT_ID} .wai-md ol { margin: 0 0 .5em; padding-left: 1.3em; }
#${ROOT_ID} .wai-md h1, #${ROOT_ID} .wai-md h2, #${ROOT_ID} .wai-md h3 { font-size: 1.05em; margin: .6em 0 .3em; }
#${ROOT_ID} .wai-md code { background: var(--bs-tertiary-bg, #f1f3f5); padding: .1em .3em; border-radius: 4px; font-size: .9em; }
#${ROOT_ID} .wai-md pre { background: var(--bs-tertiary-bg, #f1f3f5); padding: 8px; border-radius: 6px; overflow-x: auto; }
#${ROOT_ID} .wai-md pre code { background: none; padding: 0; }
#${ROOT_ID} .wai-md a { color: var(--bs-link-color, var(--bs-primary, #4794d3)); }
#${ROOT_ID} .wai-md table { border-collapse: collapse; margin: .3em 0; }
#${ROOT_ID} .wai-md th, #${ROOT_ID} .wai-md td { border: 1px solid var(--bs-border-color, #dee2e6); padding: 3px 7px; }
#${ROOT_ID} .wai-md blockquote { border-left: 3px solid var(--bs-border-color, #dee2e6); margin: 0 0 .5em; padding-left: .7em; color: var(--bs-secondary-color, #6c757d); }
#${ROOT_ID} .wai-src { font-size: 12px; color: var(--bs-secondary-color, #6c757d); margin-top: 6px; }
#${ROOT_ID} .wai-src a { color: var(--bs-link-color, var(--bs-primary, #4794d3)); }
#${ROOT_ID} .wai-actions { margin-top: 6px; }
#${ROOT_ID} .wai-copy { font-size: 12px; background: transparent; border: 1px solid var(--bs-border-color, #dee2e6);
  color: var(--bs-secondary-color, #6c757d); border-radius: 6px; padding: 2px 8px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px; }
#${ROOT_ID} .wai-copy:hover { color: var(--bs-body-color, #212529); border-color: var(--bs-secondary-color, #6c757d); }
#${ROOT_ID} .wai-ctx { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px;
  color: var(--bs-secondary-color, #6c757d); border-top: 1px solid var(--bs-border-color, #dee2e6); }
#${ROOT_ID} .wai-ctx label { display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; }
#${ROOT_ID} .wai-form { display: flex; align-items: flex-end; border-top: 1px solid var(--bs-border-color, #dee2e6); }
#${ROOT_ID} .wai-input { flex: 1; border: none; padding: 10px; outline: none; resize: none; max-height: 120px;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529); font-family: inherit; font-size: 14px; line-height: 1.4; }
#${ROOT_ID} .wai-form button { border: none; background: var(--bs-primary, #4794d3); color: #fff;
  padding: 0 16px; height: 40px; cursor: pointer; }
#${ROOT_ID} .wai-form button:hover { filter: brightness(0.93); }
/* モードタブ */
#${ROOT_ID} .wai-modes { display: flex; border-bottom: 1px solid var(--bs-border-color, #dee2e6); }
#${ROOT_ID} .wai-mode { flex: 1; border: none; background: transparent; padding: 8px; cursor: pointer;
  color: var(--bs-secondary-color, #6c757d); font-size: 13px; border-bottom: 2px solid transparent; }
#${ROOT_ID} .wai-mode.active { color: var(--bs-primary, #4794d3); border-bottom-color: var(--bs-primary, #4794d3); font-weight: 600; }
#${ROOT_ID} .wai-newpage { display: none; padding: 6px 12px 0; }
#${ROOT_ID}.newpage .wai-newpage { display: block; }
#${ROOT_ID} .wai-newpage .wai-path { width: 100%; box-sizing: border-box; padding: 6px 8px; font-size: 13px;
  border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 6px;
  background: var(--bs-body-bg, #fff); color: var(--bs-body-color, #212529); }
#${ROOT_ID} .wai-attach-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
#${ROOT_ID} .wai-attach { display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  background: transparent; border: 1px solid var(--bs-border-color, #dee2e6); color: var(--bs-secondary-color, #6c757d);
  border-radius: 6px; padding: 3px 8px; cursor: pointer; }
#${ROOT_ID} .wai-attach:hover { color: var(--bs-body-color, #212529); }
#${ROOT_ID} .wai-attach-name { font-size: 12px; color: var(--bs-primary, #4794d3); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
/* 差分カード */
#${ROOT_ID} .wai-diff { background: var(--bs-body-bg, #fff); border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: var(--bs-border-radius, 8px); padding: 8px; align-self: stretch; }
#${ROOT_ID} .wai-diff-target { font-size: 12px; color: var(--bs-secondary-color, #6c757d); margin-bottom: 6px; }
#${ROOT_ID} .wai-diff pre { margin: 0; max-height: 220px; overflow: auto; font-size: 12px; line-height: 1.45;
  white-space: pre-wrap; word-break: break-word; }
#${ROOT_ID} .wai-diff .add { background: rgba(46,160,67,.18); display: block; }
#${ROOT_ID} .wai-diff .del { background: rgba(248,81,73,.18); display: block; text-decoration: line-through; opacity: .8; }
#${ROOT_ID} .wai-diff-btns { display: flex; gap: 8px; margin-top: 8px; }
#${ROOT_ID} .wai-diff-btns button { border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; font-size: 13px; }
#${ROOT_ID} .wai-approve { background: var(--bs-success, #2da44e); color: #fff; }
#${ROOT_ID} .wai-reject { background: transparent; border: 1px solid var(--bs-border-color, #dee2e6) !important; color: var(--bs-secondary-color, #6c757d); }
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
const ICON_PAPERCLIP =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66'
  + 'l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
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

function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
}

// --- localStorage 履歴 ---
function loadHistory(): Msg[] {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(history: Msg[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {
    /* 容量超過等は無視 */
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
        <div class="wai-modes">
          <button type="button" class="wai-mode active" data-mode="chat">質問</button>
          <button type="button" class="wai-mode" data-mode="edit">編集</button>
        </div>
        <div class="wai-log"></div>
        <div class="wai-newpage">
          <input class="wai-path" type="text" placeholder="新規ページのパス (例: /総務/新ルール) — 空なら現ページを編集" />
          <div class="wai-attach-row">
            <button type="button" class="wai-attach">${ICON_PAPERCLIP}<span>PDF/画像を添付</span></button>
            <span class="wai-attach-name"></span>
            <input type="file" class="wai-file" accept=".pdf,.txt,.md,.csv,image/*" hidden />
          </div>
        </div>
        <div class="wai-ctx">
          <label><input type="checkbox" class="wai-ctx-toggle" /> このページも参照する</label>
        </div>
        <form class="wai-form">
          <textarea class="wai-input" rows="1" placeholder="Wiki に質問… (Enter送信 / Shift+Enter改行)"></textarea>
          <button type="submit">送信</button>
        </form>
      </div>
    </div>
  `);
  document.body.appendChild(root);

  const log = root.querySelector('.wai-log') as HTMLElement;
  const form = root.querySelector('.wai-form') as HTMLFormElement;
  const input = root.querySelector('.wai-input') as HTMLTextAreaElement;
  const ctxToggle = root.querySelector('.wai-ctx-toggle') as HTMLInputElement;
  const ctxRow = root.querySelector('.wai-ctx') as HTMLElement;
  const newpageRow = root.querySelector('.wai-newpage') as HTMLElement;
  const pathInput = root.querySelector('.wai-path') as HTMLInputElement;
  const fileInput = root.querySelector('.wai-file') as HTMLInputElement;
  const attachBtn = root.querySelector('.wai-attach') as HTMLButtonElement;
  const attachName = root.querySelector('.wai-attach-name') as HTMLElement;

  let history: Msg[] = loadHistory();
  let mode: 'chat' | 'edit' = 'chat';
  let attachedFile: File | null = null;

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    attachedFile = fileInput.files?.[0] || null;
    attachName.textContent = attachedFile ? attachedFile.name : '';
  });

  // 閲覧中ページがコンテンツページなら「このページも参照」を既定 ON
  getCurrentPage().then((pg) => { if (pg) ctxToggle.checked = true; });

  const setMode = (m: 'chat' | 'edit'): void => {
    mode = m;
    root.querySelectorAll('.wai-mode').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.mode === m);
    });
    ctxRow.style.display = m === 'chat' ? '' : 'none';
    newpageRow.style.display = m === 'edit' ? 'block' : 'none';
    input.placeholder = m === 'chat'
      ? 'Wiki に質問… (Enter送信 / Shift+Enter改行)'
      : '編集の指示… (例: この章をわかりやすく / FAQを1つ追加)';
  };
  setMode('chat');
  root.querySelectorAll('.wai-mode').forEach((b) => {
    b.addEventListener('click', () => setMode((b as HTMLElement).dataset.mode as 'chat' | 'edit'));
  });

  // 編集タブは閲覧専用(ROM)ユーザーには出さない。編集権限を確認できた時だけ表示。
  const modesBar = root.querySelector('.wai-modes') as HTMLElement;
  modesBar.style.display = 'none';
  getCanEdit().then((canEdit) => {
    if (canEdit) modesBar.style.display = 'flex';
    else setMode('chat'); // 念のため chat に固定
  });

  const renderMsg = (msg: Msg): HTMLElement => {
    const m = el(`<div class="wai-msg ${msg.role === 'user' ? 'wai-user' : 'wai-bot'}"></div>`);
    const body = document.createElement('div');
    if (msg.role === 'bot') {
      body.className = 'wai-md';
      body.innerHTML = renderMarkdown(msg.text);
    } else {
      body.textContent = msg.text;
    }
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
        } catch { /* 無視 */ }
      });
      actions.appendChild(copyBtn);
      m.appendChild(actions);
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };

  history.forEach(renderMsg);

  root.querySelector('.wai-fab')!.addEventListener('click', () => { root.classList.add('open'); input.focus(); });
  root.querySelector('.wai-close')!.addEventListener('click', () => root.classList.remove('open'));
  root.querySelector('.wai-clear')!.addEventListener('click', () => {
    history = [];
    saveHistory(history);
    log.innerHTML = '';
  });

  // textarea 自動リサイズ
  const autoGrow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };
  input.addEventListener('input', autoGrow);
  // Enter 送信 / Shift+Enter 改行
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // 差分カードを描画 (current vs proposed)。承認で書き込み。
  const renderDiff = (target: string, current: string | null, proposed: string,
                      onApprove: () => Promise<string>): void => {
    const card = el('<div class="wai-diff"></div>');
    card.appendChild(el(`<div class="wai-diff-target">${current === null ? '新規作成' : '編集'}: ${escapeHtml(target)}</div>`));
    const pre = document.createElement('pre');
    if (current === null) {
      pre.textContent = proposed; // 新規は全文プレビュー
    } else {
      for (const part of diffLines(current, proposed)) {
        const span = document.createElement('span');
        if (part.added) span.className = 'add';
        else if (part.removed) span.className = 'del';
        span.textContent = part.value;
        pre.appendChild(span);
      }
    }
    card.appendChild(pre);
    const btns = el('<div class="wai-diff-btns"></div>');
    const approve = el('<button class="wai-approve" type="button">承認して反映</button>');
    const reject = el('<button class="wai-reject" type="button">却下</button>');
    btns.appendChild(approve);
    btns.appendChild(reject);
    card.appendChild(btns);
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;

    reject.addEventListener('click', () => card.remove());
    approve.addEventListener('click', async () => {
      approve.textContent = '反映中…';
      (approve as HTMLButtonElement).disabled = true;
      try {
        const resultPath = await onApprove();
        btns.remove();
        const ok = el(`<div class="wai-diff-target">✓ 反映しました: <a href="${encodeURI(resultPath)}" target="_blank" rel="noopener">${escapeHtml(resultPath)}</a></div>`);
        card.appendChild(ok);
      } catch (err) {
        approve.textContent = '承認して反映';
        (approve as HTMLButtonElement).disabled = false;
        const e = el(`<div class="wai-diff-target" style="color:var(--bs-danger,#d33)">エラー: ${escapeHtml((err as Error).message)}</div>`);
        card.appendChild(e);
      }
    });
  };

  const submitEdit = async (instruction: string): Promise<void> => {
    input.value = '';
    autoGrow();
    const file = attachedFile;
    const label = instruction + (file ? `\n(添付: ${file.name})` : '');
    renderMsg({ role: 'user', text: label }); // 編集指示(履歴には保存しない)
    const newPath = pathInput.value.trim();
    // 添付はクリア(UI)
    attachedFile = null; fileInput.value = ''; attachName.textContent = '';
    const pending = el('<div class="wai-msg wai-bot"></div>');
    pending.textContent = file ? '添付を解析して下書き生成中…' : '下書き生成中…';
    log.appendChild(pending);
    log.scrollTop = log.scrollHeight;

    // 下書き生成 (添付ありはファイル版、なしはテキスト版)
    const draft = async (current: string | null, path: string | null): Promise<string> =>
      file ? editDraftFromFile(instruction, file, current, path) : editDraft(instruction, current, path);

    try {
      if (newPath) {
        // 新規作成
        const body = await draft(null, newPath);
        pending.remove();
        if (!body) { renderMsg({ role: 'bot', text: '下書きを生成できませんでした。' }); return; }
        renderDiff(newPath, null, body, async () => await createPage(newPath, body));
      } else {
        // 現ページ改善
        const full = await getCurrentPageFull();
        if (!full) {
          pending.className = 'wai-msg wai-bot';
          pending.textContent = '編集対象のページを開いてから実行してください(または新規パスを入力)。';
          return;
        }
        const body = await draft(full.body, full.path);
        pending.remove();
        if (!body) { renderMsg({ role: 'bot', text: '下書きを生成できませんでした。' }); return; }
        renderDiff(full.path, full.body, body, async () => {
          await updatePage(full.pageId, full.revisionId, body);
          return full.path;
        });
      }
    } catch (err) {
      pending.className = 'wai-msg wai-bot';
      pending.textContent = `エラー: ${(err as Error).message}`;
    }
    log.scrollTop = log.scrollHeight;
  };

  const submitChat = async (): Promise<void> => {
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    autoGrow();

    // マルチターン: 現在の質問を積む前の直近会話を文脈として渡す
    const priorTurns: Turn[] = history.slice(-CONTEXT_TURNS).map((m) => ({ role: m.role, text: m.text }));

    const userMsg: Msg = { role: 'user', text: question };
    renderMsg(userMsg);
    history.push(userMsg);
    saveHistory(history);

    const pending = el('<div class="wai-msg wai-bot"></div>');
    pending.textContent = '検索中…';
    log.appendChild(pending);
    log.scrollTop = log.scrollHeight;

    try {
      const passages: Passage[] = [];
      // 「このページも参照」が ON なら閲覧中ページを先頭に固定
      if (ctxToggle.checked) {
        const cur = await getCurrentPage();
        if (cur) passages.push(cur);
      }
      const query = await toSearchQuery(question);
      pending.textContent = '回答生成中…';
      const found = await retrieveAsUser(query); // ← ユーザー権限で検索
      // 現在ページと重複しないものを追加
      for (const p of found) if (!passages.some((x) => x.path === p.path)) passages.push(p);

      const { text, sources } = await chat(question, passages, priorTurns);
      pending.remove();
      const botMsg: Msg = { role: 'bot', text: text || '(回答が空でした)', sources };
      renderMsg(botMsg);
      history.push(botMsg);
      saveHistory(history);
    } catch (err) {
      pending.className = 'wai-msg wai-bot';
      pending.textContent = `エラー: ${(err as Error).message}`;
    }
    log.scrollTop = log.scrollHeight;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (mode === 'edit') void submitEdit(text);
    else void submitChat();
  });
}

export function unmountWidget(): void {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
