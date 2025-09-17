// --- ▼▼▼ STEP 1: サーバーと通信するための関数を追加 ▼▼▼ ---

/**
 * サーバーから最新の在庫データを取得します。
 * @returns {Promise<Object>} 在庫データ
 */
async function fetchInventory() {
    try {
        const response = await fetch('/api/inventory');
        if (!response.ok) {
            throw new Error('サーバーからの応答がありません');
        }
        return await response.json();
    } catch (error) {
        console.error('在庫データの取得に失敗:', error);
        // エラーが発生した場合は、空のデータで処理を続行する
        return {};
    }
}

/**
 * 現在の在庫データをサーバーに保存します。
 * @param {Object} data 保存する在庫データ
 */
async function saveInventory(data) {
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('サーバーへの保存に失敗しました');
        }
        console.log('データが正常に保存されました。');
    } catch (error) {
        console.error('在庫データの保存に失敗:', error);
        alert('データの保存に失敗しました。');
    }
}

// --- ▲▲▲ ここまでが追加した関数 ▲▲▲ ---


// ページの読み込みが完了したら処理を開始する
document.addEventListener('DOMContentLoaded', async () => { // ← 非同期処理のため async を追加

    // --- ▼▼▼ STEP 2: 在庫データを管理するオブジェクトと、サーバーからの初期データ取得 ▼▼▼ ---
    
    // 全てのアイスクリームの在庫状態をまとめて管理するオブジェクト
    let inventoryState = {};

    // ページ読み込み時にサーバーから最新の在庫データを取得する
    inventoryState = await fetchInventory();
    
    // --- ▲▲▲ ここまで追加 ▲▲▲ ---


    const icecreamCards = document.querySelectorAll('.icecream-card');
    const rainbowRemainingEl = document.getElementById('rainbow-remaining');

    icecreamCards.forEach(card => {
        // --- 要素を取得 ---
        const cardName = card.dataset.name;
        const stockSetupEl = card.querySelector('.stock-setup');
        const initialStockInput = card.querySelector('.initial-stock-input');
        const setStockBtn = card.querySelector('.set-stock-btn');
        const salesControlsEl = card.querySelector('.sales-controls');
        const stockEl = card.querySelector('.stock');
        const plusBtn = card.querySelector('.plus-btn');
        const minusBtn = card.querySelector('.minus-btn');
        const sellCountEl = card.querySelector('.sell-count');
        const confirmBtn = card.querySelector('.confirm-btn');
        const correctBtn = card.querySelector('.correct-btn');
        const addStockInput = card.querySelector('.add-stock-input');
        const addStockBtn = card.querySelector('.add-stock-btn');
        const targetStockInput = card.querySelector('.target-stock-input');
        const setTargetBtn = card.querySelector('.set-target-btn');
        const targetStatusEl = card.querySelector('.target-status');

        // --- ▼▼▼ STEP 3: 変数の定義方法を変更 ▼▼▼ ---
        // サーバーから取得したデータ、またはなければ新しいデータで初期化する
        if (!inventoryState[cardName]) {
            inventoryState[cardName] = {
                currentStock: 0,
                maxStock: 0,
                sellCount: 0,
                targetStock: 0,
            };
        }
        
        // カードごとの状態を、全体の在庫オブジェクトから参照するようにする
        const cardState = inventoryState[cardName];
        
        // --- ▲▲▲ 変数の定義方法を変更 ▲▲▲ ---

        // --- 関数を定義 ---
        const updateTargetDisplay = () => {
            if (cardState.targetStock > 0) {
                const availableToSell = cardState.currentStock - cardState.targetStock;
                if (availableToSell >= 0) {
                    targetStatusEl.textContent = `目標まであと ${availableToSell} 個`;
                } else {
                    targetStatusEl.textContent = '目標在庫を下回っています';
                }
            } else {
                targetStatusEl.textContent = '';
            }
        };

        const updateDisplay = () => {
            if (cardName === 'レインボー') {
                rainbowRemainingEl.textContent = cardState.currentStock;
            }
            if (cardState.currentStock <= 0) {
                stockEl.innerHTML = '完売 🎉';
                card.classList.add('sold-out');
                plusBtn.disabled = true;
                confirmBtn.disabled = true;
            } else {
                stockEl.innerHTML = `残り: <span class="stock-count">${cardState.currentStock}</span>個`;
                card.classList.remove('sold-out');
                plusBtn.disabled = false;
                confirmBtn.disabled = false;
            }
            updateTargetDisplay();
        };

        // --- ▼▼▼ STEP 4: ページ読み込み時の初期表示処理を追加 ▼▼▼ ---
        // サーバーから読み込んだデータに基づいて初期画面を構築する
        if (cardState.maxStock > 0) {
            stockSetupEl.classList.add('hidden');
            salesControlsEl.classList.remove('hidden');
        }
        sellCountEl.textContent = cardState.sellCount;
        updateDisplay();
        // --- ▲▲▲ 初期表示処理を追加 ▲▲▲ ---

        // --- イベントリスナーを設定（変数を cardState.xxx に変更し、saveInventory を呼び出す）---
        
        // 1. 初期在庫を設定
        setStockBtn.addEventListener('click', () => {
            const initialValue = parseInt(initialStockInput.value);
            if (!isNaN(initialValue) && initialValue >= 0) {
                cardState.currentStock = initialValue;
                cardState.maxStock = initialValue;
                updateDisplay();
                stockSetupEl.classList.add('hidden');
                salesControlsEl.classList.remove('hidden');
                saveInventory(inventoryState); // ★変更をサーバーに保存
            } else { alert('有効な数値を入力してください。'); }
        });

        // 2. 目標在庫を設定
        setTargetBtn.addEventListener('click', () => {
            const targetValue = parseInt(targetStockInput.value);
            if (!isNaN(targetValue) && targetValue >= 0) {
                if (targetValue > cardState.currentStock) {
                    alert('目標在庫は現在の在庫数以下に設定してください。');
                    return;
                }
                cardState.targetStock = targetValue;
                updateDisplay();
                targetStockInput.value = '';
                saveInventory(inventoryState); // ★変更をサーバーに保存
            } else {
                alert('有効な目標数を入力してください。');
            }
        });

        // 3. 販売数を増やす (+)
        plusBtn.addEventListener('click', () => {
            const availableToSell = cardState.currentStock - cardState.targetStock;
            if (cardState.sellCount < availableToSell) {
                cardState.sellCount++;
                sellCountEl.textContent = cardState.sellCount;
            } else {
                alert(`目標在庫（${cardState.targetStock}個）を下回るため、これ以上追加できません。`);
            }
        });

        // 4. 販売数を減らす (-)
        minusBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0) {
                cardState.sellCount--;
                sellCountEl.textContent = cardState.sellCount;
            }
        });

        // 5. 販売を確定する
        confirmBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0 && cardState.sellCount <= cardState.currentStock) {
                cardState.currentStock -= cardState.sellCount;
                cardState.sellCount = 0;
                sellCountEl.textContent = '0';
                updateDisplay();
                saveInventory(inventoryState); // ★変更をサーバーに保存
            }
        });
        
        // 6. 間違いを修正する
        correctBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0) {
                if (cardState.currentStock + cardState.sellCount > cardState.maxStock) {
                    alert(`総在庫数（${cardState.maxStock}個）を超える修正はできません。`);
                    return;
                }
                cardState.currentStock += cardState.sellCount;
                cardState.sellCount = 0;
                sellCountEl.textContent = '0';
                updateDisplay();
                saveInventory(inventoryState); // ★変更をサーバーに保存
            }
        });

        // 7. 在庫を追加する
        addStockBtn.addEventListener('click', () => {
            const additionalStock = parseInt(addStockInput.value);
            if (!isNaN(additionalStock) && additionalStock > 0) {
                cardState.currentStock += additionalStock;
                cardState.maxStock += additionalStock;
                addStockInput.value = '';
                updateDisplay();
                saveInventory(inventoryState); // ★変更をサーバーに保存
            } else { alert('有効な追加数を入力してください。'); }
        });
    });
});

// --- ▼▼▼ 見出し編集機能（追記） ▼▼▼ ---
document.addEventListener('DOMContentLoaded', async () => {
    // 要素を取得
    const headlineInput = document.getElementById('headline-input');
    const saveHeadlineBtn = document.getElementById('save-headline-btn');

    // ページ読み込み時に現在の見出しをサーバーから取得して表示
    try {
        const response = await fetch('/api/headline');
        const data = await response.json();
        headlineInput.value = data.headline;
    } catch (error) {
        console.error('見出しの読み込みに失敗:', error);
    }

    // 保存ボタンのクリックイベント
    saveHeadlineBtn.addEventListener('click', async () => {
        const newHeadline = headlineInput.value;
        try {
            await fetch('/api/headline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headline: newHeadline })
            });
            alert('見出しを保存しました！');
        } catch (error) {
            console.error('見出しの保存に失敗:', error);
            alert('エラー：見出しの保存に失敗しました。');
        }
    });
});
// --- ▲▲▲ ここまで追記 ▲▲▲ ---