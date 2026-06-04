// GROWI ページ本文のコードブロック (pre) に「コピー」ボタンを付与する。
// GROWI 本体を改造せず、プラグイン側で後付けする (プラグイン優先方針)。
// SPA 遷移・再レンダリングに追従するため MutationObserver で監視する。

const STYLE_ID = 'wiki-ai-codecopy-style';
const BTN_CLASS = 'waicc-btn';
const PRE_CLASS = 'waicc-pre';
const CHAT_ROOT_ID = 'wiki-ai-chat-root';

const CSS = `
.${PRE_CLASS} { position: relative; }
.${PRE_CLASS} > .${BTN_CLASS} { position: absolute; top: 6px; right: 6px; z-index: 1;
  font-size: 12px; line-height: 1; padding: 4px 8px; cursor: pointer;
  border: 1px solid var(--bs-border-color, #ccc); border-radius: 6px;
  background: var(--bs-body-bg, #fff); color: var(--bs-secondary-color, #6c757d);
  opacity: .55; transition: opacity .15s; }
.${PRE_CLASS}:hover > .${BTN_CLASS} { opacity: 1; }
.${PRE_CLASS} > .${BTN_CLASS}:hover { color: var(--bs-body-color, #212529);
  border-color: var(--bs-secondary-color, #6c757d); }
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // クリップボード API が使えない環境向けのフォールバック
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function addButton(pre: HTMLElement): void {
  if (pre.querySelector(`:scope > .${BTN_CLASS}`)) return; // 付与済み
  if (pre.closest(`#${CHAT_ROOT_ID}`)) return; // チャットウィジェット内は対象外
  const code = pre.querySelector('code');
  const text = (code ?? pre).textContent ?? '';
  if (!text.trim()) return; // 空ブロックは無視

  pre.classList.add(PRE_CLASS);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BTN_CLASS;
  btn.textContent = 'コピー';
  btn.setAttribute('aria-label', 'コードをコピー');
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyText((code ?? pre).textContent ?? '');
    btn.textContent = ok ? 'コピーしました' : 'コピー失敗';
    setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
  });
  pre.appendChild(btn);
}

function enhanceAll(): void {
  document.querySelectorAll<HTMLElement>('pre').forEach(addButton);
}

export function enableCodeCopy(): void {
  injectStyle();
  enhanceAll();
  // SPA 遷移・遅延描画に追従 (連続変更は rAF でまとめる)
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; enhanceAll(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
