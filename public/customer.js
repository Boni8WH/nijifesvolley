document.addEventListener('DOMContentLoaded', async () => {
    const statusList = document.getElementById('status-list');
    const lastUpdatedEl = document.getElementById('last-updated');
    const headlineEl = document.getElementById('main-headline');
    try {
        const response = await fetch('/api/headline');
        const data = await response.json();
        headlineEl.textContent = data.headline;
    } catch (error) {
        console.error('見出しの取得に失敗:', error);
    }
    try {
        const response = await fetch('/api/inventory');
        const inventoryData = await response.json();

        // --- ▼▼▼ STEP 1: 在庫最多のアイスを見つける処理 ▼▼▼ ---
        let maxItem = { name: '', amount: -1 };
        const processedData = {}; // 計算後の販売数を保存する場所

        for (const name in inventoryData) {
            const item = inventoryData[name];
            const sellableAmount = item.currentStock - item.targetStock;
            processedData[name] = sellableAmount; // 計算結果を保存

            // 現在の最大値より大きければ、最大値を更新
            if (sellableAmount > maxItem.amount) {
                maxItem.amount = sellableAmount;
                maxItem.name = name;
            }
        }
        
        // --- ▼▼▼ STEP 2: 各カードを画面に表示する処理 ▼▼▼ ---
        statusList.innerHTML = ''; // 古い表示をクリア

        for (const name in processedData) {
            const sellableAmount = processedData[name];
            
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('status-item');
            itemDiv.style.position = 'relative'; // オススメバッジを配置するために必要

            // --- 「オススメ！」バッジの表示判定 ---
            let badgeHTML = '';
            if (
                name === maxItem.name &&      // このアイスが在庫最多で、
                maxItem.amount >= 10 &&       // 在庫が10個以上かつ、
                maxItem.amount <= 99          // 99個以下の場合
            ) {
                badgeHTML = '<div class="recommend-badge">オススメ！</div>';
            }

            // --- 数字の表示と色分けの判定 ---
            let countHTML = '';
            let countClasses = 'sell-count'; // 基本のクラス

            if (sellableAmount > 0) {
                // 残り1桁（1-9個）の場合、low-stockクラスを追加
                if (sellableAmount < 10) {
                    countClasses += ' low-stock';
                }
                countHTML = `<span class="${countClasses}">${sellableAmount}</span><span class="sell-count unit">個</span>`;
            } else {
                // 完売の場合
                itemDiv.classList.add('sold-out');
                countHTML = `<span class="sell-count">完売</span>`;
            }

            // 最終的なHTMLを組み立てて挿入
            itemDiv.innerHTML = `
                ${badgeHTML}
                <h2 class="flavor-name">${name}</h2>
                <p>${countHTML}</p>
            `;
            
            statusList.appendChild(itemDiv);
        }

        // 最終更新時刻をフッターに表示
        lastUpdatedEl.textContent = new Date().toLocaleTimeString('ja-JP');

    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        statusList.innerHTML = '<p>エラー: 在庫情報を取得できませんでした。時間をおいて再読み込みしてください。</p>';
    }
});