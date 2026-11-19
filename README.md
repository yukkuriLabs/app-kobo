# アプリ工房 — 複数アプリ公開サイト（静的ファイル）

自分の作った複数のデスクトップアプリを1つのサイトで公開し、それぞれの申し込みを受け付けるための**完全な静的ファイル**です。ビルドは不要で、このフォルダをそのままホスティングに配置するだけで動作します（`file://` でも開けます）。

ライセンスキー発行（RSA署名）の仕組みは従来どおり利用できます。**有効期限はデフォルト無期限**です。

```
site/
├── index.html              ポータルトップ（アプリ一覧・お問い合わせ・#applications 申込一覧）
├── admin.html              オペレーター用管理画面（パスワードゲート・ライセンス発行）
├── README.md               本ファイル
├── assets/
│   └── style.css           共通スタイル（index / 各アプリページが共通参照）
├── apps/
│   └── kintai.html         「勤怠管理」の詳細ページ＋申込フォーム
├── data/
│   ├── apps.js             アプリレジストリ（APPS 一覧。一覧カードの描画元）
│   ├── license_private.pem 秘密鍵（RSA-2048 / PKCS#8）★絶対に公開しない
│   └── license_public.pem  公開鍵（配布先アプリに埋め込む）
└── tools/
    └── issue-license.mjs   ローカルCLIでのキー発行・検証
```

外部CDN・外部フォント・ビルドツール・npm依存は一切ありません（システムフォントのみ）。ES modules / import / fetch は使わず、素の `<script>` で動きます（fetch は送信先 `FORM_ENDPOINT` 設定時のみ）。

> **料金の表記は全面撤廃しています。** サイト上に料金プラン・月額・トライアルの記載は置かない方針です（新規ページも同じく置かないでください）。

---

## 1. アプリを追加する手順（3ステップ）

### ① `data/apps.js` に 1 エントリ追加する

```js
const APPS = [
  {
    id: 'kintai',
    name: '勤怠管理',
    tagline: '打刻から月次集計・給与出力まで',
    icon: '⏱',            // 絵文字アイコン（画像不要）
    status: '公開中',      // '公開中' | '開発中' | 'リリース予定'
    version: '1.1.0',
    platforms: 'Windows 10 / 11',
    features: ['打刻・月次タイムカード', 'CSV/Excel出力', '祝日マスタ', '月次締め', 'ライセンス認証'],
    page: 'apps/kintai.html'
  },
  {
    id: 'myapp',
    name: 'MyApp',
    tagline: 'キャッチコピー',
    icon: '📦',
    status: '開発中',
    version: '0.9.0',
    platforms: 'Windows 10 / 11',
    features: ['機能A', '機能B'],
    page: 'apps/myapp.html'
  }
];
```

- `status` が `'公開中'` 以外（`'開発中'` / `'リリース予定'`）の場合、index.html のカードは**「開発中」バッジ付きでグレーアウト**になり、ボタンは無効化されます。
- `page` は `apps/<id>.html` への相対パス（`apps/` 直下を基準に index.html からのパス）。

### ② `apps/<id>.html` のページを作る

`apps/kintai.html` をテンプレートにコピーして書き換えます。

- CSS は `<link rel="stylesheet" href="../assets/style.css">`（`apps/` から 1 つ上が `site/`）
- 定数 `FORM_ENDPOINT` / `CONTACT_EMAIL` はページ冒頭の `<script>` に置く
- 申込レコードには **`app: '<id>'` と `appName: '<アプリ名>'`** を必ず付ける
- 申込フォームの「対象アプリ」入力欄は不要（URL/ページ側から自動付与）
- localStorage キーは従来どおり `kintai_applications`（全アプリ共通。`app` / `appName` で区別）

### ③（必要なら）admin.html を確認する

申込一覧には「アプリ」「人数規模」列が表示されます。レコードに `appName` が無い場合は「勤怠管理」と表示されるだけなので、新規アプリは ②のとおり `appName` を付けてください。キー発行・一覧表示のロジック自体の変更は通常不要です。

---

## 2. デプロイ方法（すべて静的）

### GitHub Pages
1. この `site/` フォルダの内容をリポジトリのルート（または `docs/`）にコピーします。
   - **`site/data/license_private.pem` はリポジトリに含めないでください**（下記「秘密鍵の取り扱い」参照）。
2. リポジトリの **Settings → Pages** で、Source を `Deploy from a branch`、Branch を `main` / フォルダ `/ (root)`（または `/docs`）に設定します。
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

### Netlify
1. Netlify の **Add new site → Deploy manually** で `site/` フォルダをドラッグ＆ドロップするだけです。
2. または Git 連携する場合は Base directory を `site`、Publish directory を `.` に設定します。

### 任意のホスティング（Apache / nginx / S3 / Cloudflare Pages 等）
- `site/` 配下のファイルを公開ディレクトリにアップロードしてください。
- `index.html` がデフォルトドキュメントになるように設定します。
- HTTPS（または `localhost`）を前提にしています。`crypto.subtle` は **secure context** でしか利用できないためです。

> `admin.html` はパスワードで守られていますが、静的サイトにすぎません。強固な管理画面が必要な場合は、サーバーサイドの認証を挟むか、管理画面を公開サイトから外してください。

---

## 3. 設定値の変更方法

### 各アプリページ（`apps/*.html`）— 先頭の `<script>` 内の定数

```html
<script>
const FORM_ENDPOINT = '';
const CONTACT_EMAIL = 'info@example.com';
</script>
```

| 定数 | 説明 |
|---|---|
| `FORM_ENDPOINT` | 申込フォームの送信先URL。**空文字（既定）** の場合は送信内容を `localStorage`（キー `kintai_applications`）に保存し、申込番号（例 `K-20261118-ab12`）とメール本文コピー機能を表示します。URLを設定すると `fetch` で `POST`（JSON）します。 |
| `CONTACT_EMAIL` | 確認画面の「メール本文をコピー」「メールアプリで送信」ボタンの宛先。対応環境表・ポータルのお問い合わせ表示にも使われます。 |

### `index.html` — 先頭の `<script>` 内の定数

```html
<script>
const CONTACT_EMAIL = 'info@example.com';
</script>
```

- ポータル「お問い合わせ」セクションの mailto 先です。

### `admin.html` — 先頭の `<script>` 内の定数

```html
<script>
// Change this password before you deploy this page.
const ADMIN_PASSWORD = 'kintai-operator';
</script>
```

- 管理者のログインパスワードです。**公開前に必ず変更してください。**
- ログイン状態は `sessionStorage`（タブを閉じると解除）に保持されます。

---

## 4. 配布フロー（申込 → キー発行 → 顧客に渡す）

1. 顧客が各アプリページ（例: `apps/kintai.html`）の申込フォームから申し込み。
   - 送信内容は端末の `localStorage`（キー `kintai_applications`、レコードに `app` / `appName` 付き）に保存される。
2. 運営者が `admin.html` にログインし、申込一覧から該当行を選択。
3. 秘密鍵（`data/license_private.pem`）を読み込み、「ライセンス発行」を実行。
   - **有効期限はデフォルト無期限（入力欄は空欄＝無期限）**。期限を設ける場合のみ `YYYY-MM-DD` で入力。
4. 発行されたキーを顧客に渡す。該当申込は「キー発行済み」に更新され、発行したキーも記録される。
5. 申込がなくても「会社作成（ライセンス発行）」から直接発行できる。

---

## 5. 秘密鍵の取り扱い（重要）

- `site/data/license_private.pem` は**絶対に公開しないでください**。GitHub Pages 等にそのまま置くと、誰でも正規のライセンスキーを発行できるようになります。
- 配布先アプリに埋め込むのは **`site/data/license_public.pem`（公開鍵）のみ**です。アプリは署名を検証するだけで、秘密鍵は不要です。
- リポジトリに含める場合は `.gitignore` で除外してください:
  ```
  site/data/license_private.pem
  ```
- `admin.html` はページに秘密鍵を**埋め込みません**。運営者がファイル選択（`.pem`）またはテキスト貼り付けで読み込む方式で、「sessionStorage に保存する」チェックボックスを有効にすると、タブを閉じるまで保持されます。
- `crypto.subtle` が使えない環境（`file://` で開いた場合など）はエラー表示となり、CLI の利用を案内します。

---

## 6. ライセンスキーの発行

### A. ブラウザ（admin.html）
1. `admin.html` を開き、パスワードでログインします。
2. 「秘密鍵の読み込み」で `data/license_private.pem` を選択（または貼り付け）します。
3. 会社名を入力し、有効期限を指定（**空欄＝無期限（既定）** / 期限を設ける場合は `YYYY-MM-DD`）して「発行」。
4. キーが表示されるのでコピーして顧客に渡します。申込一覧の該当行は「キー発行済み」に更新され、発行したキーも記録されます。

### B. CLI（常に動作する保険）— `tools/issue-license.mjs`

Node.js のみ（npm 不要）で動作します。サイトのルートから実行します。

```powershell
cd site

# 発行（標準出力にキーが表示される）
node tools/issue-license.mjs --company "株式会社テスト" --years 1

# 無期限（--years 0）— 運用の既定はこちら
node tools/issue-license.mjs --company "株式会社テスト" --years 0

# 検証（data/license_public.pem で署名を確認）
node tools/issue-license.mjs --verify "KI1...."

# 鍵の場所を変える
node tools/issue-license.mjs --company "株式会社テスト" --years 2 --key path/to/key.pem
node tools/issue-license.mjs --verify "KI1...." --public-key path/to/public.pem
```

- 発行: 成功すると `結果 : 有効`、キーは**標準出力のみ**（詳細は標準エラー）なので `> key.txt` にリダイレクトできます。
- 検証成功の終了コードは `0`、失敗は `1` です。

### キー仕様（アプリ側と完全一致）
- 形式: `KI1.` + `base64url(ペイロードJSON)` + `.` + `base64url(署名)`
- 署名: **2番目のセグメントの文字列そのもの**（UTF-8バイト）に対する **RSA-SHA256**、PKCS#1 v1.5 パディング（`node:crypto` の `createSign('sha256')` 既定、WebCrypto の `RSASSA-PKCS1-v1_5` と同一）
- ペイロード: `{"c":"会社名","i":"発行日YYYY-MM-DD","e":"有効期限YYYY-MM-DD または null","id":"16桁のランダムhex"}`
- base64url はパディングなし（`-` / `_` 使用）

---

## 7. 申込データの保存場所について（運用上の注意）

- 送信内容は **申込を行った端末の `localStorage`（キー `kintai_applications`）** にのみ保存されます。**別のPC・ブラウザからは見えません**。
- `index.html` の URL に `#applications` を付けると申込一覧を表示できます（トップ上からはリンクしていません）。
- `admin.html` の一覧も同じ localStorage を読むため、**申し込みを送った端末と管理画面を開いた端末が異なると一覧が空**になります。
- **本番運用では各アプリページの `FORM_ENDPOINT` に Formspree 等のエンドポイントを設定することを強く推奨します。**
  - [Formspree](https://formspree.io/) / [Getform](https://getform.io/) / [Google Forms + Apps Script](https://script.google.com/) 等、POST で受け付けるサービスが利用できます。
  - 設定後も localStorage への保存は併行して行われるため、サーバー側が落ちても端末上に記録が残ります。
- localStorage はブラウザの「サイトデータ削除」やシークレットモードで消える点にご注意ください。

---

## 8. ファイル一覧

| ファイル | 役割 |
|---|---|
| `index.html` | ポータルトップ（ヒーロー・アプリ一覧カード・今後のアプリ・お問い合わせ）＋ `#applications` 申込一覧 |
| `apps/kintai.html` | 「勤怠管理」の詳細ページ（機能・対応環境・初期設定）＋申込フォーム |
| `assets/style.css` | 共通スタイル（CSS変数・レイアウト・フォーム・申込一覧テーブル等） |
| `data/apps.js` | アプリレジストリ（`APPS`。追加はここに1エントリ） |
| `admin.html` | オペレーター管理画面（パスワードゲート・ライセンス発行・申込一覧） |
| `tools/issue-license.mjs` | CLI によるキー発行・検証 |
| `README.md` | 本ドキュメント |
| `data/license_public.pem` | 公開鍵（配布先アプリに埋め込む） |
| `data/license_private.pem` | 秘密鍵（**非公開**・管理者のみ使用） |
