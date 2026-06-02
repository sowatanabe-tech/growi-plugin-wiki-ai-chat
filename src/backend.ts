// エージェントバックエンド (server.py) 呼び出し。Gemini はここに集約され、
// API キーはサーバ側にのみ存在する。ブラウザは鍵を持たない。
import { BACKEND_URL } from './config';
import type { Passage } from './growi-api';

async function postJson(path: string, payload: unknown): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Agent ${path} -> ${res.status}`);
  }
  return res.json();
}

// 会話調の質問 → 検索キーワード (Gemini)。
export async function toSearchQuery(question: string): Promise<string> {
  try {
    const data = await postJson('/search-query', { question });
    return (data?.query as string) || question;
  } catch {
    return question; // 失敗時は質問そのままで検索 (fail-safe)
  }
}

export type ChatResult = { text: string; sources: string[] };
export type Turn = { role: 'user' | 'bot'; text: string };

// 取得済み抜粋 + 質問 (+直近の会話履歴) → 回答 (Gemini)。
// 本文はユーザー権限内のものだけが渡る。history はマルチターン文脈用。
export async function chat(
  question: string,
  passages: Passage[],
  history: Turn[] = [],
): Promise<ChatResult> {
  const data = await postJson('/chat', { question, passages, history });
  return { text: data?.text ?? '', sources: data?.sources ?? [] };
}
