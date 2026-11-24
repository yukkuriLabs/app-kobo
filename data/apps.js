/* ============================================================
   アプリレジストリ — 複数アプリ公開ポータル
   ------------------------------------------------------------
   アプリを追加する手順:
     1. このファイルの APPS に 1 エントリ追加する
     2. apps/<id>.html のページ（詳細＋お問い合わせフォーム）を作る
   index.html がこの一覧をそのままカード描画します。
   （素の JS。ES modules / import は使わない — file:// でも動く）
   ============================================================ */
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
    page: 'apps/kintai.html',
    download: 'https://github.com/yukkuriLabs/app-kobo/releases/download/v1.1.0/kintai-1.1.0-setup.exe'
  },
  {
    id: 'gyomu',
    name: '会社業務支援システム',
    tagline: '申請承認・案件タスク・日報をひとつに',
    icon: '🏢',
    status: '公開中',
    version: '1.0.0',
    platforms: 'Windows 10 / 11',
    features: ['申請・承認ワークフロー', '案件・タスク管理', '日報', '部門・メンバー管理', '監査ログ', 'CSV/Excel出力', 'NAS保存先対応'],
    page: 'apps/gyomu.html',
    download: 'https://github.com/yukkuriLabs/app-kobo/releases/download/gyomu-v1.0.0/gyomu-1.0.0-setup.exe'
  }
  // 今後のアプリはここに追記
];
