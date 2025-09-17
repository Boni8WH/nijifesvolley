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
            inventoryState[cardName] = { currentStock: 0, maxStock: 0, sellCount: 0, targetStock: 0, };
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
        
        setStockBtn.addEventListener('click', () => { /* ... */ });
        setTargetBtn.addEventListener('click', () => { /* ... */ });
        confirmBtn.addEventListener('click', () => { /* ... */ });
        correctBtn.addEventListener('click', () => { /* ... */ });
        addStockBtn.addEventListener('click', () => { /* ... */ });

        // --- ▼▼▼【ここから修正】+/- ボタンの長押し機能 ▼▼▼ ---
        
        let intervalId = null;
        let timeoutId = null;

        const startCounting = (action) => {
            action(); // まず一回実行
            // 400ミリ秒後に、100ミリ秒間隔で連続実行を開始
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
                stopCounting(); // 在庫上限に達したら停止
            }
        };

        const decrementCounter = () => {
            if (cardState.sellCount > 0) {
                cardState.sellCount--;
                sellCountEl.textContent = cardState.sellCount;
            } else {
                stopCounting(); // 0になったら停止
            }
        };

        // プラスボタンのイベント
        plusBtn.addEventListener('mousedown', () => startCounting(incrementCounter));
        plusBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // ダブルタップなどの不要な動作を抑制
            startCounting(incrementCounter);
        });

        // マイナスボタンのイベント
        minusBtn.addEventListener('mousedown', () => startCounting(decrementCounter));
        minusBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startCounting(decrementCounter);
        });

        // ボタンからマウスが離れたり、指が離れたりしたら連続実行を停止
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
            plusBtn.addEventListener(event, stopCounting);
            minusBtn.addEventListener(event, stopCounting);
        });
        
        // --- ▲▲▲【ここまで修正】---

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