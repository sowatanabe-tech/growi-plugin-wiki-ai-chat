// GROWI script プラグインのエントリポイント。
// 役割: ログイン中ユーザーの画面に AI チャットウィジェットを注入するだけ (= フロントのガワ)。
// 検索はユーザーのセッションで行い、Gemini 呼び出しはバックエンド (server.py) に委ねる。
import { mountWidget, unmountWidget } from './src/widget';
import { enableCodeCopy } from './src/code-copy';

const PLUGIN_ID = 'growi-plugin-wiki-ai-chat';

const start = (): void => {
  mountWidget();
  enableCodeCopy(); // GROWI ページのコードブロックにコピーボタンを付与
};

const activate = (): void => {
  // DOM 準備後にウィジェット描画＋コードコピー有効化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
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
