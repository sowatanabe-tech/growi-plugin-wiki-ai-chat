// エージェントバックエンド (server.py) の URL。
// 本番では GROWI と同一ドメインにリバースプロキシして "/agent" に載せるのが望ましい
// (CORS 不要・運用が楽)。PoC では別ポートを直接指定する。
export const BACKEND_URL =
  (window as any).__WIKI_AI_BACKEND__ || 'http://localhost:8008';

// 参照する Wiki ページ数の上限。
export const TOP_K = 5;

// 1 ページあたりバックエンドへ送る本文の最大文字数 (送信量の暴発防止)。
export const MAX_BODY_CHARS = 12000;
