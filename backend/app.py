import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

# --- 初期設定 ---
app = Flask(__name__)
CORS(app)  # CORSを有効にする

# --- データベース接続設定 ---
# ▼▼▼ ここにRenderからコピーした「Internal Database URL」を貼り付け ▼▼▼
DATABASE_URL = 'postgresql://icecream_manager:yHGtrx7QASXmBguDmSf1uGHNXRDXilR5@dpg-d351ui63jp1c73emnn0g-a.singapore-postgres.render.com/icecream_data'
# ▲▲▲ ここまで ▲▲▲

def get_db_connection():
    """データベースへの接続を取得します"""
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# --- データベースのテーブルを初期化する関数 ---
def initialize_database():
    """サーバー起動時に、もしテーブルがなければ自動的に作成します"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS ice_creams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            stock INT NOT NULL,
            max_stock INT NOT NULL,
            target_stock INT DEFAULT 0
        );
    ''')
    print('Database table checked/created successfully.')
    
    # 初期データがない場合のみ4種類のアイスを登録
    cur.execute('SELECT COUNT(*) FROM ice_creams')
    if cur.fetchone()[0] == 0:
        initial_data = [
            ('ストロベリーチーズケーキ', 0, 0),
            ('レインボー', 0, 0),
            ('ハニーコットンキャンディ', 0, 0),
            ('クッキー＆クリーム', 0, 0),
        ]
        cur.executemany(
            'INSERT INTO ice_creams (name, stock, max_stock) VALUES (%s, %s, %s)',
            initial_data
        )
        print('Initial ice cream data inserted.')
        
    conn.commit()
    cur.close()
    conn.close()

# --- APIエンドポイント (通信の窓口) ---

# GET: 全てのアイスクリームの在庫データを取得する
@app.route('/api/stock', methods=['GET'])
def get_stock():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('SELECT * FROM ice_creams ORDER BY id')
    items = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(items)

# PUT: 特定のアイスクリームの在庫データを更新する
@app.route('/api/stock/<string:name>', methods=['PUT'])
def update_stock(name):
    data = request.get_json()
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(
        'UPDATE ice_creams SET stock = %s, max_stock = %s, target_stock = %s WHERE name = %s RETURNING *',
        (data['stock'], data['max_stock'], data['target_stock'], name)
    )
    updated_item = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    if updated_item is None:
        return jsonify({'error': 'Ice cream not found'}), 404
        
    return jsonify(dict(updated_item))

# --- サーバーを起動 ---
if __name__ == '__main__':
    # 初回起動時にデータベースをセットアップ
    initialize_database()
    # サーバーを起動
    app.run(host='0.0.0.0', port=3000)