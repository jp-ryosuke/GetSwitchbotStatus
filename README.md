## 概要
- SwitchBot Open API v1.1 を使い、デバイスの状態を一覧表示するローカル向けダッシュボードです。

## 機能
- デバイスの状態を5秒ごとに取得し、画面幅に合わせたカードで表示します。
- カードを開くと詳細を表示します。赤外線リモコンのエアコンは温度・運転モード・風量の設定、照明は電源操作ができます。赤外線リモコンの Light では明るさの増減もできます。
- 物理デバイス一覧に加え、API が別に返す赤外線リモコン一覧も表示します。
- Hub Mini はデバイス一覧に含まれる名前・IDと、Hub Mini に紐付く赤外線リモコンを表示します。Open API は通常の Hub Mini のオンライン状態や Wi-Fi 情報を返しません。
- カメラは一覧に表示します。Webhook で届いたイベントはカードの詳細に表示し、イベントに HTTPS 画像 URL が含まれている場合は画像も表示します。カメラの状態や過去の録画・画像を取得する Open API はありません。Webhook の受信記録はメモリ上に最大100件保持し、サーバー再起動で消えます。

### カメラ Webhook
Webhook を利用するには、このアプリを外部からアクセスできる HTTPS URL で公開し、SwitchBot の Webhook URL に `https://<公開ホスト>/api/webhooks/switchbot` を登録してください。ローカルの `http://localhost:3000` のままでは SwitchBot から到達できません。

このアプリにはログイン認証がありません。公開インターネットにサーバーを公開する場合は、認証やアクセス制限を設定してください。特に `/api/devices/:deviceId/commands` は登録デバイスを操作します。

## 必要な設定
- server/.env.example を server/.env としてコピーし `SWITCHBOT_TOKEN` と `SWITCHBOT_SECRET` を設定すること
- `.env` は Git に登録せず、Token / Secret を公開しないこと

## 起動方法
- 以下のコマンドを実行すると `http://localhost:3000` でアプリケーションが起動する
```sh
cd server
npm install
node server.js
```

## テスト
Node.js の標準テスト機能を使っています。追加パッケージのインストールは不要です。

```sh
cd server
npm test
```

## 利用ライブラリとライセンス
直接依存と画面で使用する Chart.js のライセンスです。

| ライブラリ | 用途 | ライセンス |
| --- | --- | --- |
| [Express](https://github.com/expressjs/express) | Web サーバー | MIT |
| [Axios](https://github.com/axios/axios) | SwitchBot API 通信 | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | 環境変数の読み込み | BSD-2-Clause |
| [Chart.js](https://github.com/chartjs/Chart.js) | 温湿度グラフ（jsDelivr CDN） | MIT |

いずれも一般的な寛容型ライセンスですが、再配布時は各ライセンスの著作権表示・ライセンス文を保持してください。間接依存にも個別のライセンスがあるため、配布形態に応じて `server/package-lock.json` の依存パッケージも確認してください。このリポジトリ自体には現在 LICENSE ファイルがなく、第三者による再利用条件は明示していません。

SwitchBot API は SwitchBot の利用条件に従います。公式 API 文書では個人利用向けとされ、商用利用・大規模利用は別途問い合わせるよう案内されています。
