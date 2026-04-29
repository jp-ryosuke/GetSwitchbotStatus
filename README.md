## 概要
- [SwitchBotAPI](https://github.com/OpenWonderLabs/SwitchBotAPI) を叩いて Switchbot デバイスの一覧とステータスを取得して表示する

## 必要な設定
- server/.env.example を server/.env としてコピーし `SWITCHBOT_TOKEN` と `SWITCHBOT_SECRET` を設定すること

## 起動方法
- 以下のコマンドを実行すると `http://localhost:3000` でアプリケーションが起動する
```sh
cd server
npm install
node server.js
```
