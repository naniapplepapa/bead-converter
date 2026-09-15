# 蘋果爸拼豆工坊 — V0.3

純靜態網站，目標網址：https://naniapplepapa.github.io/bead-converter/

## 已實作

- 手機單欄／平板與桌面雙欄介面，原生照片選取。
- 正方形裁切，可調整放大倍率與左右／上下位置。
- 每邊 10–100 格，拉條與數字輸入同步，保留 29／35／50 快選；一格對應一個 MARD 色號、一顆豆。
- MARD 221 色及 36 色子集；固定來源色值、独立 JSON、版本與來源記錄。
- OKLab 感知色差，依全圖誤差改善量選取最多 K 色，再將所有格子重新映射到選定色號；不是只隱藏統計中的少量色號。
- Web Worker 背景計算；每 5 格粗線、座標、可切換格內色號及預覽倍率。
- 顏色與顆數清單、包含備料表的 PNG、支援時使用系統分享儲存圖片。
- 重新設定後清除過期結果，防止下載不符合當前設定的圖稿。

## 本機啟動與測試

不需安裝任何網站套件。使用 Python 3 在此目錄執行 `python3 -m http.server 4173`，開啟 `http://localhost:4173`。
Node.js 18+ 執行 `npm test` 或 `node --test tests/*.test.mjs`。
請使用 HTTP(S)，不要直接雙擊 HTML：模組、Worker、色庫需要同源網站環境。

## GitHub Pages

Repository Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save。
網站沒有編譯步驟，`.nojekyll` 避免 Jekyll 處理。
每次更新 main 後等待 Pages 部署完成，再檢查公開網址。

## 色庫更新

`data/mard.json` 是執行時使用的唯一色庫。`colors` 為 `{code, hex}` 清單；`kit36` 只引用同一清單中的色號，避免兩個模式使用不一致色值。
更新時維持 `schemaVersion: 1`、更換 `version` 與 `source`、保留 `notice`，執行測試核對 221 個唯一色號及 36 色子集。

來源：maxcleme/beadcolors，固定 commit `29229889daab404fb30531d4bb785fd73f7f58e3` 的 `raw/mard.csv`，取 A–H、M 系列共 221 筆。原始資料保存於 `data/upstream-mard.csv`，MIT 授權見 `data/LICENSE-beadcolors`。此為社群螢幕參考值，**不是 MARD 官方實體測色**。36 色清單沿用先前商品圖辨識，待實品核對。

OKLab 公式：Björn Ottosson 公開的 2021 sRGB 矩陣：https://bottosson.github.io/posts/oklab/ 。本版未實作 CIEDE2000。

## 隱私與限制

照片及結果只在頁面記憶體內，沒有後端、AI、追蹤分析、照片上傳或本機草稿儲存。唯一程式發出的 fetch 是同源色庫 GET。網站載入時 GitHub Pages 會收到一般網站資源請求；原始照片、檔名與拼豆結果不傳送到伺服器。

透明圖片以白底合成，所有格子均计入豆數。圖片限制 30 MB／60 百萬像素，解碼後縮到最長邊 1600；HEIC 是否可讀依瀏覽器支援，失敗時提示改用 JPG／PNG。手機記憶體較少時建議先縮小照片。Safari 系統分享由使用者自行選擇儲存位置。

不會自動去背或變成 Q 版，沒有手動改豆、PDF 或庫存功能。實體 iPhone/iPad 的照片圖庫與分享介面仍需實機驗收。

## 保留原版

`archive/v0.1-original.html` 為 2026-09-13 上傳到 main 的完整原始頁面（原頁面自稱 V0.2）。來源 commit `0dc632b2f8f1f878a3c73e4b9a0c775fdf720565`；僅供追溯，正式入口是根目錄 `index.html`。原版的部分色號／色值對應不同於目前固定來源，新版不混用兩套值。
