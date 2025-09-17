// --- サーバーと通信するための関数 ---
async function fetchInventory() {
    try {
        const response = await fetch('/api/inventory');
        if (!response.ok) throw new Error('サーバーからの応答がありません');
        return await response.json();
    } catch (error) {
        console.error('在庫データの取得に失敗:', error);
        return {};
    }
}

async function saveInventory(data) {
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('サーバーへの保存に失敗しました');
        console.log('データが正常に保存されました。');
    } catch (error) {
        console.error('在庫データの保存に失敗:', error);
        alert('データの保存に失敗しました。');
    }
}


// --- ページの読み込みが完了したら、すべての処理をここから開始 ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- 見出し編集機能の初期化 ---
    const headlineInput = document.getElementById('headline-input');
    const saveHeadlineBtn = document.getElementById('save-headline-btn');

    try {
        const response = await fetch('/api/headline');
        const data = await response.json();
        headlineInput.value = data.headline;
    } catch (error) {
        console.error('見出しの読み込みに失敗:', error);
    }

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

    // --- 在庫管理機能の初期化 ---
    let inventoryState = {};
    inventoryState = await fetchInventory();

    const icecreamCards = document.querySelectorAll('.icecream-card');

    icecreamCards.forEach(card => {
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
        
        if (!inventoryState[cardName]) {
            inventoryState[cardName] = {
                currentStock: 0,
                maxStock: 0,
                sellCount: 0,
                targetStock: 0,
            };
        }
        
        const cardState = inventoryState[cardName];
        
        const updateTargetDisplay = () => {
            if (cardState.targetStock > 0) {
                const availableToSell = cardState.currentStock - cardState.targetStock;
                targetStatusEl.textContent = availableToSell >= 0 ? `目標まであと ${availableToSell} 個` : '目標在庫を下回っています';
            } else {
                targetStatusEl.textContent = '';
            }
        };

        const updateDisplay = () => {
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

        if (cardState.maxStock > 0) {
            stockSetupEl.classList.add('hidden');
            salesControlsEl.classList.remove('hidden');
        }
        sellCountEl.textContent = cardState.sellCount;
        updateDisplay();
        
        setStockBtn.addEventListener('click', () => {
            const initialValue = parseInt(initialStockInput.value);
            if (!isNaN(initialValue) && initialValue >= 0) {
                cardState.currentStock = initialValue;
                cardState.maxStock = initialValue;
                updateDisplay();
                stockSetupEl.classList.add('hidden');
                salesControlsEl.classList.remove('hidden');
                saveInventory(inventoryState);
            } else { alert('有効な数値を入力してください。'); }
        });

        setTargetBtn.addEventListener('click', () => {
            const targetValue = parseInt(targetStockInput.value);
            if (!isNaN(targetValue) && targetValue >= 0) {
                if (targetValue > cardState.currentStock) {
                    alert('目標在庫は現在の在庫数以下に設定してください。'); return;
                }
                cardState.targetStock = targetValue;
                updateDisplay();
                targetStockInput.value = '';
                saveInventory(inventoryState);
            } else { alert('有効な目標数を入力してください。'); }
        });

        // 3. 販売数を増やす (+) 【★ここを修正しました★】
        plusBtn.addEventListener('click', () => {
            // 上限を、目標在庫を考慮しない「現在の在庫数」に変更
            if (cardState.sellCount < cardState.currentStock) {
                cardState.sellCount++;
                sellCountEl.textContent = cardState.sellCount;
            } else {
                // アラートメッセージも、より分かりやすく変更
                alert(`現在の在庫数（${cardState.currentStock}個）を超えることはできません。`);
            }
        });

        minusBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0) {
                cardState.sellCount--;
                sellCountEl.textContent = cardState.sellCount;
            }
        });

        confirmBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0 && cardState.sellCount <= cardState.currentStock) {
                cardState.currentStock -= cardState.sellCount;
                cardState.sellCount = 0;
                sellCountEl.textContent = '0';
                updateDisplay();
                saveInventory(inventoryState);
            }
        });
        
        correctBtn.addEventListener('click', () => {
            if (cardState.sellCount > 0) {
                if (cardState.currentStock + cardState.sellCount > cardState.maxStock) {
                    alert(`総在庫数（${cardState.maxStock}個）を超える修正はできません。`); return;
                }
                cardState.currentStock += cardState.sellCount;
                cardState.sellCount = 0;
                sellCountEl.textContent = '0';
                updateDisplay();
                saveInventory(inventoryState);
            }
        });

        addStockBtn.addEventListener('click', () => {
            const additionalStock = parseInt(addStockInput.value);
            if (!isNaN(additionalStock) && additionalStock > 0) {
                cardState.currentStock += additionalStock;
                cardState.maxStock += additionalStock;
                addStockInput.value = '';
                updateDisplay();
                saveInventory(inventoryState);
            } else { alert('有効な追加数を入力してください。'); }
        });
    });
});

// --- ▼▼▼ ズーム機能を強制的に無効化（追記） ▼▼▼ ---

// 2本指以上でのタッチ（ピンチズーム）を無効化
document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

// ダブルタップによるズームを無効化
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    // 300ミリ秒以内に2回目のタッチがあれば、デフォルトの挙動（ズーム）を無効化
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// --- ▲▲▲ ここまで ▲▲▲ ---