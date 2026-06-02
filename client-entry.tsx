// GROWI script プラグインのエントリポイント。
// 役割: ログイン中ユーザーの画面に AI チャットウィジェットを注入するだけ (= フロントのガワ)。
// 検索はユーザーのセッションで行い、Gemini 呼び出しはバックエンド (server.py) に委ねる。
import { mountWidget, unmountWidget } from './src/widget';

const PLUGIN_ID = 'growi-plugin-wiki-ai-chat';

const activate = (): void => {
  // DOM 準備後にウィジェットを描画
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget, { once: true });
  } else {
    mountWidget();
  }
};

const deactivate = (): void => {
  unmountWidget();
};

(window as any).pluginActivators = (window as any).pluginActivators || {};
(window as any).pluginActivators[PLUGIN_ID] = { activate, deactivate };

// GROWI はスクリプト読込のタイミングによっては activate() を自動で呼ばない
// (登録より前に起動パスが走ると取りこぼす)。そのため自分でも起動する。
// mountWidget は既存要素があれば何もしないので、GROWI が後から呼んでも二重生成しない。
activate();
