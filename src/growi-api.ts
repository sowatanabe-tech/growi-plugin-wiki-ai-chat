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

// 現ユーザーが編集できるか (ROM/閲覧専用でないか)。
// GROWI の currentUser.readOnly が false のときだけ true。
// 判定不能時は false (= 編集UIを出さない安全側)。書込自体も GROWI が二重に弾く。
export async function getCanEdit(): Promise<boolean> {
  try {
    const data = await getJson('/_api/v3/personal-setting');
    return data?.currentUser?.readOnly === false;
  } catch {
    return false;
  }
}

export type PageFull = { path: string; body: string; pageId: string; revisionId: string };

// いま閲覧しているページの生オブジェクトを取得。
// GROWI の URL は「パス」か「24桁のページID」のどちらか。両対応する。
async function getCurrentPageRaw(): Promise<any | null> {
  const pathname = decodeURIComponent(location.pathname);
  if (/^\/[0-9a-f]{24}$/.test(pathname)) {
    const data = await getJson(`/_api/v3/page?pageId=${pathname.slice(1)}`);
    return data?.page ?? null;
  }
  if (pathname === '/' || pathname.startsWith('/_') || pathname.startsWith('/admin')) return null;
  const data = await getJson(`/_api/v3/page?path=${encodeURIComponent(pathname)}`);
  return data?.page ?? null;
}

// 「このページについて質問」用 (本文のみ)。
export async function getCurrentPage(): Promise<Passage | null> {
  try {
    const pg = await getCurrentPageRaw();
    const body: string = pg?.revision?.body ?? '';
    if (!pg?.path || !body.trim()) return null;
    return { path: pg.path, body: body.slice(0, MAX_BODY_CHARS) };
  } catch {
    return null;
  }
}

// 編集用 (pageId / revisionId 込み)。更新の楽観ロックに使う。
export async function getCurrentPageFull(): Promise<PageFull | null> {
  try {
    const pg = await getCurrentPageRaw();
    if (!pg?.path) return null;
    return { path: pg.path, body: pg.revision?.body ?? '', pageId: pg._id, revisionId: pg.revision?._id ?? '' };
  } catch {
    return null;
  }
}

// 既存ページ更新 (ユーザーのセッションで実行 = 編集権限を持つ人だけ成功)。
export async function updatePage(pageId: string, revisionId: string, body: string): Promise<void> {
  const res = await fetch('/_api/v3/page', {
    method: 'PUT', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ pageId, revisionId, body }),
  });
  if (!res.ok) throw new Error(`更新失敗 (${res.status})`);
}

// 新規ページ作成 (ユーザーのセッションで実行)。作成後のパスを返す。
export async function createPage(path: string, body: string): Promise<string> {
  const res = await fetch('/_api/v3/page', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ path, body }),
  });
  if (!res.ok) throw new Error(`作成失敗 (${res.status})`);
  const data = await res.json();
  return data?.page?.path ?? path;
}
