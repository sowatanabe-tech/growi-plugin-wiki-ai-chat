// エージェントバックエンド (server.py) の URL。
// 本番では GROWI と同一ドメインにリバースプロキシして "/agent" に載せる
// (同一オリジン = CORS 不要・運用が楽)。ローカル開発のみ別ポートを直接指定。
// window.__WIKI_AI_BACKEND__ で明示上書きも可能。
const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
export const BACKEND_URL =
  (window as any).__WIKI_AI_BACKEND__ ||
  (isLocalhost ? 'http://localhost:8008' : '/agent');

// 参照する Wiki ページ数の上限。
export const TOP_K = 5;

// 1 ページあたりバックエンドへ送る本文の最大文字数 (送信量の暴発防止)。
export const MAX_BODY_CHARS = 12000;
