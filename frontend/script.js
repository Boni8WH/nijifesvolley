document.addEventListener('DOMContentLoaded', () => {
    // サーバーのURLを定義
    const API_URL = 'http://localhost:3000/api/stock';

    // --- 要素を取得 ---
    const icecreamListEl = document.getElementById('icecream-list');
    const rainbowRemainingEl = document.getElementById('rainbow-remaining');

    /**
     * サーバーから最新の在庫データを取得して画面を再描画するメイン関数
     */
    const renderIceCreams = async () => {
        try {
            // サーバーにGETリクエストを送り、全商品のデータを取得
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('サーバーからデータを取得できませんでした。');
            }
            const iceCreams = await response.json();

            // 画面を一度クリア
            icecreamListEl.innerHTML = '';

            // 取得したデータをもとに、各アイスのカードを生成して表示
            iceCreams.forEach(iceCream => {
                const card = createIceCreamCard(iceCream);
                icecreamListEl.appendChild(card);
            });
            
            // レインボーの目標表示を更新
            const rainbowData = iceCreams.find(item => item.name === 'レインボー');
            if (rainbowData) {
                rainbowRemainingEl.textContent = rainbowData.stock;
            }

        } catch (error) {
            console.error('エラー:', error);
            icecreamListEl.innerHTML = '<p style="color: red;">サーバーとの通信に失敗しました。サーバーが起動しているか確認してください。</p>';
        }
    };

    /**
     * 1つのアイスクリーム商品のHTML要素（カード）を生成する関数
     * @param {object} iceCream - サーバーから取得した商品データ
     * @returns {HTMLElement} - 生成されたカードのHTML要素
     */
    const createIceCreamCard = (iceCream) => {
        const card = document.createElement('div');
        card.className = 'icecream-card';
        card.dataset.name = iceCream.name;

        // 初期設定モードか販売モードかを判断して表示を切り替え
        const isSetupMode = iceCream.max_stock === 0;

        card.innerHTML = `
            <h3>${iceCream.name}</h3>
            
            <div class="stock-setup ${isSetupMode ? '' : 'hidden'}">
                <p>初期在庫数を入力してください</p>
                <input type="number" class="initial-stock-input" placeholder="例: 100" min="0">
                <button class="set-stock-btn">設定</button>
            </div>

            <div class="sales-controls ${isSetupMode ? 'hidden' : ''}">
                <p class="stock">残り: <span class="stock-count">${iceCream.stock}</span>個</p>
                <p class="target-status"></p>
                <div class="counter">
                    <button class="minus-btn">-</button>
                    <span class="sell-count">0</span>
                    <button class="plus-btn">+</button>
                </div>
                <div class="button-group">
                    <button class="confirm-btn">確定</button>
                    <button class="correct-btn">修正</button>
                </div>
                <hr class="divider">
                <div class="target-stock-section">
                    <input type="number" class="target-stock-input" placeholder="残す数" min="0">
                    <button class="set-target-btn">目標設定</button>
                </div>
                <div class="add-stock-section">
                    <input type="number" class="add-stock-input" placeholder="追加数" min="1">
                    <button class="add-stock-btn">在庫を追加</button>
                </div>
            </div>
        `;

        // 在庫が0なら完売表示にする
        if (iceCream.stock === 0 && !isSetupMode) {
            card.querySelector('.stock').innerHTML = '完売 🎉';
            card.classList.add('sold-out');
        }

        // --- このカード内のボタンにイベントリスナーを設定 ---
        const sellCountEl = card.querySelector('.sell-count');
        let sellCount = 0;

        // プラスボタン
        card.querySelector('.plus-btn')?.addEventListener('click', () => {
            const availableToSell = iceCream.stock - iceCream.target_stock;
            if (sellCount < availableToSell) {
                sellCount++;
                sellCountEl.textContent = sellCount;
            } else {
                alert(`目標在庫（${iceCream.target_stock}個）を下回るため、これ以上追加できません。`);
            }
        });

        // マイナスボタン
        card.querySelector('.minus-btn')?.addEventListener('click', () => {
            if (sellCount > 0) {
                sellCount--;
                sellCountEl.textContent = sellCount;
            }
        });

        // --- データベースを更新する操作 ---
        const handleUpdate = async (updatedData) => {
            try {
                const response = await fetch(`${API_URL}/${iceCream.name}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData),
                });
                if (!response.ok) throw new Error('更新に失敗しました');
                renderIceCreams(); // 成功したら画面を再描画
            } catch (error) {
                console.error('更新エラー:', error);
                alert('サーバーとの通信に失敗しました。');
            }
        };
        
        // 初期在庫設定ボタン
        card.querySelector('.set-stock-btn')?.addEventListener('click', () => {
            const input = card.querySelector('.initial-stock-input');
            const initialValue = parseInt(input.value);
            if (!isNaN(initialValue) && initialValue >= 0) {
                handleUpdate({ stock: initialValue, max_stock: initialValue, target_stock: 0 });
            } else { alert('有効な数値を入力してください。'); }
        });

        // 確定ボタン
        card.querySelector('.confirm-btn')?.addEventListener('click', () => {
            if (sellCount > 0) {
                const newStock = iceCream.stock - sellCount;
                handleUpdate({ ...iceCream, stock: newStock });
            }
        });

        // 修正ボタン
        card.querySelector('.correct-btn')?.addEventListener('click', () => {
            if (sellCount > 0) {
                const newStock = iceCream.stock + sellCount;
                if (newStock > iceCream.max_stock) {
                    alert(`総在庫数（${iceCream.max_stock}個）を超える修正はできません。`);
                    return;
                }
                handleUpdate({ ...iceCream, stock: newStock });
            }
        });
        
        // 在庫追加ボタン
        card.querySelector('.add-stock-btn')?.addEventListener('click', () => {
            const input = card.querySelector('.add-stock-input');
            const additionalStock = parseInt(input.value);
            if (!isNaN(additionalStock) && additionalStock > 0) {
                const newStock = iceCream.stock + additionalStock;
                const newMaxStock = iceCream.max_stock + additionalStock;
                handleUpdate({ ...iceCream, stock: newStock, max_stock: newMaxStock });
            } else { alert('有効な追加数を入力してください。'); }
        });
        
        // 目標設定ボタン
        card.querySelector('.set-target-btn')?.addEventListener('click', () => {
            const input = card.querySelector('.target-stock-input');
            const targetValue = parseInt(input.value);
            if (!isNaN(targetValue) && targetValue >= 0) {
                if (targetValue > iceCream.stock) {
                    alert('目標在庫は現在の在庫数以下に設定してください。');
                    return;
                }
                handleUpdate({ ...iceCream, target_stock: targetValue });
            } else { alert('有効な目標数を入力してください。'); }
        });

        return card;
    };

    // --- アプリケーションを初期化 ---
    renderIceCreams();
});