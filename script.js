const tg = window.Telegram.WebApp;
tg.expand();

// ЗАМЕНИ НА СВОЮ АКТУАЛЬНУЮ ССЫЛКУ ИЗ ТЕРМИНАЛА!
const pcAddress = "https://real-poets-refuse.loca.lt"; 

function sendCommand(cmd, value = null) {
    console.log("Отправка команды:", cmd); // Увидишь это в консоли F12
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;

    fetch(url, { 
        headers: { "bypass-tunnel-reminder": "true" },
        mode: 'cors' // Важно для обхода блокировок браузера
    })
    .then(response => {
        console.log("Ответ сервера получeн");
        if (cmd !== 'set_volume') tg.HapticFeedback.notificationOccurred('success');
    })
    .catch(err => {
        console.error("Ошибка при отправке:", err);
    });
}

// Функции переключения страниц
function showPage(pageId, element) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

// Код для ползунка (оставляем упрощенным)
const volSlider = document.getElementById('volume-slider');
if (volSlider) {
    volSlider.oninput = function() {
        document.getElementById('vol-val').innerText = this.value + '%';
        sendCommand('set_volume', this.value);
    };
}
