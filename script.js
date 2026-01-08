const tg = window.Telegram.WebApp;
tg.expand();

// ЗАМЕНИ НА СВОЮ АКТУАЛЬНУЮ ССЫЛКУ ИЗ ТЕРМИНАЛА!
const pcAddress = "https://real-poets-refuse.loca.lt"; 

// Флаг взаимодействия объявляем ОДИН раз
let isUserInteracting = false;

function sendCommand(cmd, value = null) {
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;

    console.log("Отправка на ПК:", url);

    fetch(url, { 
        headers: { "bypass-tunnel-reminder": "true" },
        mode: 'cors'
    })
    .then(() => {
        if (cmd !== 'set_volume') tg.HapticFeedback.notificationOccurred('success');
    })
    .catch(err => console.error("Ошибка сети:", err));
}

function showPage(pageId, element) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

// Настройка ползунка громкости
const volSlider = document.getElementById('volume-slider');
if (volSlider) {
    volSlider.oninput = function() {
        isUserInteracting = true; // Блокируем обновление от сервера, пока крутим
        document.getElementById('vol-val').innerText = this.value + '%';
        sendCommand('set_volume', this.value);
    };

    // Снимаем блокировку через секунду после того, как отпустили
    const unlock = () => { setTimeout(() => { isUserInteracting = false; }, 1000); };
    volSlider.onmouseup = unlock;
    volSlider.ontouchend = unlock;
}

// Авто-обновление статуса (CPU/RAM/Volume)
async function updateStats() {
    if (isUserInteracting) return; // Не мешаем пользователю двигать ползунок

    try {
        const res = await fetch(`${pcAddress}/status`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await res.json();
        
        document.getElementById('cpu-val').innerText = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        document.getElementById('ram-val').innerText = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';
        
        // Синхронизируем ползунок с реальным звуком ПК
        if (volSlider) {
            volSlider.value = data.volume;
            document.getElementById('vol-val').innerText = data.volume + '%';
        }
    } catch (e) {}
}

setInterval(updateStats, 3000);
