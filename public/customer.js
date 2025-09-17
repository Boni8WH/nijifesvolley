document.addEventListener('DOMContentLoaded', async () => {
    const statusList = document.getElementById('status-list');
    const lastUpdatedEl = document.getElementById('last-updated');
    const headlineEl = document.getElementById('main-headline');
    const toggleBtn = document.getElementById('toggle-mode-btn');
    
    let currentDisplayMode = localStorage.getItem('displayMode') || 'count';

    let inventoryData = {}; // 在庫データをグローバルに保持

    // 表示を更新するメインの関数
    const renderInventory = () => {
        statusList.innerHTML = ''; // 古い表示をクリア

        let maxItem = { name: '', amount: -1 };
        for (const name in inventoryData) {
            const item = inventoryData[name];
            const sellableAmount = item.currentStock - item.targetStock;
            if (sellableAmount > maxItem.amount) {
                maxItem.amount = sellableAmount;
                maxItem.name = name;
            }
        }

        for (const name in inventoryData) {
            const item = inventoryData[name];
            const sellableAmount = item.currentStock - item.targetStock;
            
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('status-item');
            itemDiv.style.position = 'relative';

            let badgeHTML = '';
            if (name === maxItem.name && maxItem.amount >= 10 && maxItem.amount <= 99) {
                badgeHTML = '<div class="recommend-badge">オススメ！</div>';
            }

            let contentHTML = '';

            if (currentDisplayMode === 'count') {
                // --- 残り個数表示モード ---
                let countClasses = 'sell-count';
                if (sellableAmount > 0 && sellableAmount < 10) {
                    countClasses += ' low-stock';
                }
                const unitClasses = countClasses.includes('low-stock') ? 'sell-count unit low-stock' : 'sell-count unit';

                if (sellableAmount > 0) {
                    contentHTML = `<p><span class="${countClasses}">${sellableAmount}</span><span class="${unitClasses}">個</span></p>`;
                } else {
                    itemDiv.classList.add('sold-out');
                    contentHTML = `<p><span class="sell-count">完売</span></p>`;
                }
            } else {
                // --- 販売率(%)表示モード（目標達成率の計算） ---
                const maxStock = item.maxStock;
                const soldCount = maxStock - item.currentStock;
                const salesGoal = maxStock - item.targetStock;

                if (salesGoal > 0) {
                    const percentage = Math.floor((soldCount / salesGoal) * 100);

                    if (percentage >= 100) {
                        itemDiv.classList.add('sold-out');
                        contentHTML = `<p><span class="sell-count">目標達成!</span></p>`;
                    } else if (percentage >= 95) {
                        contentHTML = `<p><span class="sell-percentage high-percentage">${percentage}%</span> 達成</p>`;
                    } else {
                        contentHTML = `<p><span class="sell-percentage">${percentage}%</span> 達成</p>`;
                    }
                } else {
                    contentHTML = `<p>目標未設定</p>`;
                }
            }
            
            itemDiv.innerHTML = `${badgeHTML}<h2 class="flavor-name">${name}</h2>${contentHTML}`;
            statusList.appendChild(itemDiv);
        }
        lastUpdatedEl.textContent = new Date().toLocaleTimeString('ja-JP');
    };

    // 切替ボタンのクリックイベント
    toggleBtn.addEventListener('click', () => {
        if (currentDisplayMode === 'count') {
            currentDisplayMode = 'percentage';
        } else {
            currentDisplayMode = 'count';
        }

        localStorage.setItem('displayMode', currentDisplayMode);
        // ボタンのテキストも更新
        updateToggleButton();
        renderInventory();
    });

    const updateToggleButton = () => {
        if (currentDisplayMode === 'count') {
            toggleBtn.textContent = '販売率 (%) 表示に切替';
        } else {
            toggleBtn.textContent = '残り個数表示に切替';
        }
    };

    (async () => {
        try {
            updateToggleButton(); // 【追加】ページ読み込み時にボタンのテキストを正しく設定

            const headlineResponse = await fetch('/api/headline');
            const headlineData = await headlineResponse.json();
            headlineEl.textContent = headlineData.headline;
            headlineEl.classList.add('scrolling');
            
            const inventoryResponse = await fetch('/api/inventory');
            inventoryData = await inventoryResponse.json();
            
            renderInventory();
        } catch (error) {
            console.error('データの取得に失敗しました:', error);
            statusList.innerHTML = '<p>エラー: 在庫情報を取得できませんでした。時間をおいて再読み込みしてください。</p>';
        }
    })();
});