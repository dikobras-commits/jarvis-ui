const tg = window.Telegram.WebApp;
tg.expand();


const pcAddress = "https://real-poets-refuse.loca.lt"; 

let isUserInteracting = false;

// 1. Главная функция отправки
function sendCommand(cmd, value = null) {
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;

    console.log("JARVIS: Отправка запроса на " + url);

    fetch(url, { 
        headers: { "bypass-tunnel-reminder": "true" },
        mode: 'cors'
    })
    .then(response => {
        if (response.ok) {
            console.log("JARVIS: Команда выполнена успешно");
            if (cmd !== 'set_volume') tg.HapticFeedback.notificationOccurred('success');
        }
    })
    .catch(err => {
        console.error("JARVIS: Ошибка связи. Проверь туннель!", err);
    });
}

// 2. Переключение вкладок
function showPage(pageId, element) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

// 3. Логика ползунка (один обработчик)
const volSlider = document.getElementById('volume-slider');
if (volSlider) {
    volSlider.oninput = function() {
        isUserInteracting = true;
        document.getElementById('vol-val').innerText = this.value + '%';
        sendCommand('set_volume', this.value);
    };

    const unlock = () => { setTimeout(() => { isUserInteracting = false; }, 1000); };
    volSlider.onmouseup = unlock;
    volSlider.ontouchend = unlock;
}

// 4. Обновление статуса без спама
async function updateStats() {
    if (isUserInteracting) return;

    try {
        const res = await fetch(`${pcAddress}/status`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await res.json();
        
        if(document.getElementById('cpu-val')) {
            document.getElementById('cpu-val').innerText = data.cpu + '%';
            document.getElementById('cpu-bar').style.width = data.cpu + '%';
            document.getElementById('ram-val').innerText = data.ram + '%';
            document.getElementById('ram-bar').style.width = data.ram + '%';
            
            if (!isUserInteracting && volSlider) {
                volSlider.value = data.volume;
                document.getElementById('vol-val').innerText = data.volume + '%';
            }
        }
    } catch (e) {
        console.log("Сервер недоступен...");
    }
}

setInterval(updateStats, 4000);
