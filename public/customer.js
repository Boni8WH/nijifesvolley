document.addEventListener('DOMContentLoaded', async () => {
    const statusList = document.getElementById('status-list');
    const lastUpdatedEl = document.getElementById('last-updated');

    try {
        // 既存のAPIエンドポイントから全在庫データを取得
        const response = await fetch('/api/inventory');
        const inventoryData = await response.json();

        // 古い表示をクリア
        statusList.innerHTML = '';

        // 在庫データを一つずつ処理して表示
        for (const name in inventoryData) {
            const item = inventoryData[name];
            
            // 「販売できる数」 = 「現在の在庫」 - 「残す目標数」
            const sellableAmount = item.currentStock - item.targetStock;

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('status-item');

            let countHTML;
            if (sellableAmount > 0) {
                // 販売できる在庫がある場合
                countHTML = `<span class="sell-count">${sellableAmount}</span><span class="sell-count unit">個</span>`;
            } else {
                // 販売できる在庫がない（0以下）場合は「完売」
                itemDiv.classList.add('sold-out');
                countHTML = `<span class="sell-count">完売</span>`;
            }

            itemDiv.innerHTML = `
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