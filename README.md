# Freedom Growth Automation

行銷模組的可重用模板與 Platform API client helpers。這個 repo 是
`freedom-platform` 的使用端；會員、權限、商品、作品、活動草稿與分享紀錄仍由
Platform 和中央資料庫管理，不另建帳號或第二份資料庫。

本版可整理活動草稿、引用供貨商品或開源作品、修改文案、留下人工分享紀錄，並
在本機產生純文字／LINE 文字預覽。**沒有自動對外發布、LINE 傳訊、流量指標、
付款、分潤、影片渲染或背景 job 執行。**

## 本機使用

需要 Node.js 24；目前沒有第三方執行依賴。

```sh
npm test
npm run preview
```

`preview` 使用明確標為虛構的 sanitized fixture，不登入、不連網、不寫資料。
瀏覽器可直接 import `src/index.mjs`，library 本身不依賴 Node API。

## 與 Platform 串接

由主程式提供 `vendor/freedom-platform/client.mjs` 的 pinned client instance。
通訊契約、操作名稱與 vendor 檔由 Platform 產生，版本／來源以 repo 根目錄的
整合 manifest 為準。本 repo 不自行發明 API 或重作驗證規則。

```js
import {
  loadCampaignWorkspace, prepareCampaignDraft, createCampaignDraft,
  reviseCampaignDraft, recordManualShare, previewPublication,
} from './src/index.mjs';

// client 由整合主程式依 pinned SDK 建立，持有本次登入的短效工作階段。
const workspace = await loadCampaignWorkspace(client);

const body = prepareCampaignDraft({
  title: '作品使用交流',
  audience: '對作品有興趣的會員',
  goal: '收集使用回饋',
  draftText: '歡迎分享你實際使用這件作品的經驗。',
  source: { kind: 'manual_brief', brief: '由本人提出、尚未發布的社群交流構想' },
  // 也可選 { kind: 'oss_project', project_id } 或
  // { kind: 'supplier_product', product_id }，ID 取自 Platform。
});

// 在送出前保存 key + exact body；連線結果未知時沿用同一組重試。
const command = { body, idempotencyKey: crypto.randomUUID() };
const saved = await createCampaignDraft(client, command.body, command);
const preview = previewPublication(saved, { channel: 'line' });
// preview.provider_action === false；沒有傳訊或發布。

const revised = await reviseCampaignDraft(client, saved, {
  title: saved.title, audience: saved.audience, goal: saved.goal,
  draft_text: '更新後的草稿，仍未發布。',
}, { idempotencyKey: crypto.randomUUID() });

// 只有真人已在外部分享後，才主動呼叫 recordManualShare：
// await recordManualShare(client, revised, {
//   channel: '網站', share_url: 'https://example.com/already-published', note: '本人填寫',
// }, { idempotencyKey: crypto.randomUUID() });
```

操作對照：

| Helper | SDK operation | 資料／一致性 |
| --- | --- | --- |
| `loadCampaignWorkspace(client)` | `listCampaigns`, `listProjects`, `listSupplierProducts` | 回傳 `{campaigns, projects, supplierProducts}`；API `{items}` 格式不符會失敗 |
| `createCampaignDraft(client, body, options)` | `createCampaign` | `options.idempotencyKey` 必填；Platform 驗證來源權限並保存確切來源版本 |
| `reviseCampaignDraft(client, campaign, body, options)` | `reviseCampaign` | 傳 `params.id`、key、`version`；只修改文案，原始來源快照保留 |
| `recordManualShare(client, campaign, body, options)` | `recordShare` | 傳 `params.id`、key、`version`；紀錄為 `self_reported`，不代表已核實 |

更新預設使用 `campaign.aggregate_version`；如有明確已知版本，可傳
`options.version`。衝突與網路錯誤原樣向上傳遞，不會自動重試、換 key 或覆蓋
別人的更新。**重試必須使用相同內容、版本與 key**；內容變更是新命令，應用新 key。
來源專案列表可能包含別人的作品；建立草稿時仍由 Platform 檢查來源管理權。

Browser session 必須走 Platform 同源入口或經授權的同源 reverse proxy；本 repo
沒有開放任意 CORS。不要把 staging 示範登入當成正式外部用戶 API 授權，也不要
將登入 cookie、Access token、provider secret 或 DB URL commit 到任何 repo。

## 目錄與成熟度

| 路徑 | 現在的能力 |
| --- | --- |
| `src/` | 真實 Platform operation 的 client helpers |
| `services/campaign-worker/` | 純函式草稿準備；尚無 Queue consumer 或 job claim |
| `services/publication-worker/` | 已保存草稿的本機預覽；保留來源快照、digest 與文案版本 |
| `packages/channel-adapters/` | 純文字及 LINE 形狀的文字預覽；沒有 provider SDK／發送動作 |
| `services/media-worker/` | 明確標 `planned`、`executable:false` 的能力表，沒有 executable stub |
| `tests/` | 命令／版本傳遞、重試邊界、錯誤傳遞與来源保留測試 |

preview 中的 hash 從 Platform 回應保留，沒有在 client 端重新簽章或宣稱驗真。
文字只能作純文字呈現，不可直接交給 `innerHTML`。LINE preview 並未驗證正式
provider 請求限制、收件人或 channel 權限，不能直接視為可發送任務。

未來啟用 publication/media worker，需實作主規格的版本化 job registry、exact job
claim、lease/fencing、heartbeat、完成／失敗回報、reconciliation、各自唯一 Queue
consumer 與 named broker capability；不直接連 Platform DB，也不存長效 provider
secret。現有 draft API 不等於這套尚未啟用的 job 協定。

中央架構來源：
[Platform repo 與 ownership](https://github.com/FreeTWAI-AI/freedom-platform/blob/main/docs/platform-plan/02-architecture-repositories.md)、
[模組擴建設計](https://github.com/FreeTWAI-AI/freedom-platform/blob/main/docs/development/module-expansion-design.md)。
