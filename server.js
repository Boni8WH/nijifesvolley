// 必要な部品を読み込む
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// Expressアプリを作成
const app = express();
const PORT = process.env.PORT || 3000;

// === データベース接続設定 ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// POSTデータを受け取るための設定
app.use(express.json());


// === サーバー起動時にテーブルを作成する処理 ===
const createInventoryTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        name VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    console.log('Table "inventory" is ready.');
  } catch (err) {
    console.error('Error creating inventory table:', err);
  } finally {
    client.release();
  }
};

// 【追加】設定用テーブルを作成する関数
const createSettingsTable = async () => {
  const client = await pool.connect();
  try {
    // key-value形式で設定を保存するテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log('Table "settings" is ready.');
  } catch (err) {
    console.error('Error creating settings table:', err);
  } finally {
    client.release();
  }
};


// === ルーティング設定 ===
// /customer URLへのアクセスがあったら customer.html を返す
app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// publicフォルダのファイルを公開
app.use(express.static('public'));


// === APIエンドポイント ===

// 【追加】見出しを取得するAPI
app.get('/api/headline', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT value FROM settings WHERE key = 'headline'");
    client.release();
    // データがあればその値を、なければデフォルト値を返す
    if (result.rows.length > 0) {
      res.json({ headline: result.rows[0].value });
    } else {
      res.json({ headline: '残り……' });
    }
  } catch (err) {
    console.error('Error fetching headline', err);
    res.status(500).send('Error');
  }
});

// 【追加】見出しを保存するAPI
app.post('/api/headline', async (req, res) => {
  const { headline } = req.body;
  try {
    const client = await pool.connect();
    // INSERT ... ON CONFLICT (upsert) を使って、データがなければ新規作成、あれば更新する
    const query = `
      INSERT INTO settings (key, value)
      VALUES ('headline', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1;
    `;
    await client.query(query, [headline]);
    client.release();
    res.status(200).send('Headline updated');
  } catch (err) {
    console.error('Error saving headline', err);
    res.status(500).send('Error');
  }
});

// 在庫データを取得するAPI
app.get('/api/inventory', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM inventory');
    const inventoryData = {};
    result.rows.forEach(row => {
      inventoryData[row.name] = row.data;
    });
    client.release();
    res.json(inventoryData);
  } catch (err) {
    console.error('Error fetching data from DB:', err);
    res.status(500).send('Error fetching data');
  }
});

// 在庫データを保存するAPI
app.post('/api/inventory', async (req, res) => {
  const inventoryData = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const name in inventoryData) {
      const data = inventoryData[name];
      const query = `
        INSERT INTO inventory (name, data)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET data = $2;
      `;
      await client.query(query, [name, JSON.stringify(data)]);
    }
    await client.query('COMMIT');
    res.status(200).send('Data saved successfully');
  } catch (err) {
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
  createInventoryTable();
  createSettingsTable(); // 【追加】起動時に設定テーブルも確認・作成
});