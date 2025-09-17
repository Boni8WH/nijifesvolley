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
        const soldCountDisplay = card.querySelector('.sold-count-display');
        const soldCountInput = card.querySelector('.sold-count-input');
        const updateSoldBtn = card.querySelector('.update-sold-btn');

        if (!inventoryState[cardName]) {
            inventoryState[cardName] = { currentStock: 0, maxStock: 0, sellCount: 0, targetStock: 0 };
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
            const soldCount = cardState.maxStock - cardState.currentStock;
            soldCountDisplay.textContent = Math.max(0, soldCount);
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

        let intervalId = null;
        let timeoutId = null;
        const startCounting = (action) => {
            action();
            timeoutId = setTimeout(() => {
                intervalId = setInterval(action, 100);
            }, 400);
        };
        const stopCounting = () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
        const incrementCounter = () => {
            if (cardState.sellCount < cardState.currentStock) {
                cardState.sellCount++;
                sellCountEl.textContent = cardState.sellCount;
            } else {
                stopCounting();
            }
        };
        const decrementCounter = () => {
            if (cardState.sellCount > 0) {
                cardState.sellCount--;
                sellCountEl.textContent = cardState.sellCount;
            } else {
                stopCounting();
            }
        };
        plusBtn.addEventListener('mousedown', () => startCounting(incrementCounter));
        plusBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startCounting(incrementCounter);
        });
        minusBtn.addEventListener('mousedown', () => startCounting(decrementCounter));
        minusBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startCounting(decrementCounter);
        });
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
            plusBtn.addEventListener(event, stopCounting);
            minusBtn.addEventListener(event, stopCounting);
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
            const stockChange = parseInt(addStockInput.value);

            // 入力が有効な数値（0以外）かチェック
            if (isNaN(stockChange) || stockChange === 0) {
                alert('0以外の有効な数値を入力してください。');
                return;
            }

            // 在庫を減らす場合、残り在庫がマイナスにならないかチェック
            if (cardState.currentStock + stockChange < 0) {
                alert(`現在の在庫（${cardState.currentStock}個）以上に減らすことはできません。`);
                return;
            }

            // 在庫数を更新（stockChangeがプラスなら増加、マイナスなら減少する）
            cardState.currentStock += stockChange;
            cardState.maxStock += stockChange;
            
            addStockInput.value = ''; // 入力欄をクリア
            updateDisplay(); // 画面表示を更新
            saveInventory(inventoryState); // サーバーに保存
        });

        updateSoldBtn.addEventListener('click', () => {
            const newSoldCount = parseInt(soldCountInput.value);
            if (isNaN(newSoldCount) || newSoldCount < 0) {
                alert('有効な販売数を入力してください。');
                return;
            }
            if (newSoldCount > cardState.maxStock) {
                alert(`初期在庫（${cardState.maxStock}個）を超える販売数は設定できません。`);
                return;
            }
            cardState.currentStock = cardState.maxStock - newSoldCount;
            soldCountInput.value = '';
            updateDisplay();
            saveInventory(inventoryState);
        });
    });
});

// --- ズーム機能を強制的に無効化 ---
document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);