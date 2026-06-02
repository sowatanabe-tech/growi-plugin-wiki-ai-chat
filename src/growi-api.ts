// GROWI REST API を「ログイン中ユーザーのセッション」で呼ぶ。
// access_token は付けない → cookie 認証になり、検索・取得結果は
// そのユーザーの閲覧権限に自動で一致する (権限漏洩を防ぐ核心)。
import { MAX_BODY_CHARS, TOP_K } from './config';

export type Passage = { path: string; body: string };

async function getJson(path: string): Promise<any> {
  const res = await fetch(path, {
    credentials: 'same-origin', // GROWI のセッション cookie を送る
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GROWI API ${path} -> ${res.status}`);
  }
  return res.json();
}

// 全文検索 (ユーザー権限スコープ)。ヒットしたページパスを返す。
// /trash/ 配下 (ゴミ箱 = 削除済みページ) は AI の根拠にしないため除外する。
export async function searchPaths(query: string, limit = TOP_K): Promise<string[]> {
  const data = await getJson(
    `/_api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  const items: any[] = data?.data ?? [];
  return items
    .map((it) => (it?.data?.path ?? it?.path) as string | undefined)
    .filter((p): p is string => Boolean(p))
    .filter((p) => !p.startsWith('/trash/'));
}

// ページ本文取得 (ユーザー権限スコープ)。見えないページは GROWI が弾く。
export async function fetchPassage(path: string): Promise<Passage | null> {
  try {
    const data = await getJson(`/_api/v3/page?path=${encodeURIComponent(path)}`);
    const body: string = data?.page?.revision?.body ?? '';
    if (!body.trim()) return null;
    return { path, body: body.slice(0, MAX_BODY_CHARS) };
  } catch {
    return null; // 権限が無い等で取得失敗したページは黙って除外
  }
}

export async function retrieveAsUser(query: string): Promise<Passage[]> {
  const paths = await searchPaths(query);
  const results = await Promise.all(paths.map(fetchPassage));
  return results.filter((p): p is Passage => p !== null);
}
