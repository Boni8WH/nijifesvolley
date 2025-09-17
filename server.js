// 必要な部品を読み込む
const express = require('express');
const fs = require('fs');
const path = require('path');

// Expressアプリを作成
const app = express();
const PORT = process.env.PORT || 3000;

// データを保存するファイルへのパス
const dbPath = path.join(__dirname, 'db.json');

// POSTデータを受け取るための設定
app.use(express.json());
// publicフォルダの中のファイルをブラウザから見えるようにする設定
app.use(express.static('public'));


// 在庫データを取得するAPI
app.get('/api/inventory', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            // ファイルがなければ空のデータを返す
            return res.json({});
        }
        res.json(JSON.parse(data));
    });
});

// 在庫データを保存するAPI
app.post('/api/inventory', (req, res) => {
    const newData = req.body;
    fs.writeFile(dbPath, JSON.stringify(newData, null, 2), (err) => {
        if (err) {
            return res.status(500).send('Error saving data');
        }
        res.status(200).send('Data saved successfully');
    });
});

// サーバーを起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});