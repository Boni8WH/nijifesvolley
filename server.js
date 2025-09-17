// 必要な部品を読み込む
const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // <-- ファイル(fs)の代わりにpgを読み込む

// Expressアプリを作成
const app = express();
const PORT = process.env.PORT || 3000;

// === ▼▼▼ データベース接続設定 ▼▼▼ ===
// Renderの環境変数に設定したDATABASE_URL（接続文字列）を使ってデータベースに接続
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
// === ▲▲▲ データベース接続設定 ▲▲▲ ===


// POSTデータを受け取るための設定
app.use(express.json());
// publicフォルダの中のファイルをブラウザから見えるようにする設定
app.use(express.static('public'));

// === ▼▼▼ サーバー起動時にテーブルを作成する処理 ▼▼▼ ===
const createTable = async () => {
  const client = await pool.connect();
  try {
    // inventoryというテーブルがなければ作成する
    // name: アイス名 (主キー)
    // data: 在庫情報などのJSONデータ
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        name VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    console.log('Table "inventory" is ready.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    client.release();
  }
};
// === ▲▲▲ サーバー起動時にテーブルを作成する処理 ▲▲▲ ===


// 在庫データを取得するAPI (データベースから取得するよう変更)
app.get('/api/inventory', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM inventory');
    
    // フロントエンドが使いやすいように、DBからの結果を { "アイス名": {在庫データ} } の形に変換
    const inventoryData = {};
    result.rows.forEach(row => {
      inventoryData[row.name] = row.data;
    });

    res.json(inventoryData);
    client.release();
  } catch (err) {
    console.error('Error fetching data from DB:', err);
    res.status(500).send('Error fetching data');
  }
});

// 在庫データを保存するAPI (データベースに保存するよう変更)
app.post('/api/inventory', async (req, res) => {
  const inventoryData = req.body;
  const client = await pool.connect();

  try {
    // トランザクション開始
    await client.query('BEGIN');

    // 受け取った全ての在庫データについて、１つずつDBに保存（または更新）する
    for (const name in inventoryData) {
      const data = inventoryData[name];
      const query = `
        INSERT INTO inventory (name, data)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET data = $2;
      `;
      // $1, $2 はSQLインジェクション対策。それぞれname, JSON.stringify(data)に置き換わる
      await client.query(query, [name, JSON.stringify(data)]);
    }
    
    // トランザクション確定
    await client.query('COMMIT');
    res.status(200).send('Data saved successfully');
  } catch (err) {
    // エラーがあればロールバック
    await client.query('ROLLBACK');
    console.error('Error saving data to DB:', err);
    res.status(500).send('Error saving data');
  } finally {
    client.release();
  }
});

// サーバーを起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  createTable(); // サーバー起動時にテーブル作成処理を呼び出す
});