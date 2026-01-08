const tg = window.Telegram.WebApp;
const pcAddress = "https://real-poets-refuse.loca.lt"; 
let isUserInteracting = false;
function sendCommand(cmd, value = null) {
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;
    fetch(url, { headers: { "bypass-tunnel-reminder": "true" } })
    .then(() => {
        if (cmd !== 'set_volume') tg.HapticFeedback.notificationOccurred('success');
    })
    .catch(e => console.error("Ошибка связи с ПК"));
}

function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    el.classList.add('active');
    
    tg.HapticFeedback.impactOccurred('light');
}
async function takeScreenshot() {
    const img = document.getElementById('screen-img');
    const cont = document.getElementById('screenshot-container');
    cont.style.display = 'block';
    img.src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const res = await fetch(`${pcAddress}/screenshot`, {
            headers: { 'bypass-tunnel-reminder': 'true' }
        });
        const data = await res.json();
        if (data.status === "success") {
            img.src = `data:image/png;base64,${data.image}`;
            tg.HapticFeedback.notificationOccurred('success');
        }
    } catch (err) {
        cont.style.display = 'none';
    }
}

function hideScreenshot() {
    document.getElementById('screenshot-container').style.display = 'none';
}

// Обновление CPU/RAM
async function updateStats() {
    try {
        const res = await fetch(`${pcAddress}/status`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await res.json();
        
        document.getElementById('cpu-val').innerText = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        document.getElementById('ram-val').innerText = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';

        // Обновляем ползунок из системы, только если мы его НЕ трогаем
        if (!isUserInteracting) {
            const slider = document.getElementById('volume-slider');
            slider.value = data.volume; 
            document.getElementById('vol-val').innerText = data.volume + '%';
        }
    } catch (e) {
        console.log("Ошибка обновления статуса");
    }
}

setInterval(updateStats, 3000);

function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    
    if (text !== "") {
        const chatMessages = document.getElementById('chat-messages');
        
        // Добавляем сообщение пользователя
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-bubble user';
        userDiv.innerText = text;
        chatMessages.appendChild(userDiv);
        
        // Очищаем ввод
        input.value = "";
        
        // Прокрутка вниз
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Отправляем текст на ПК (FastAPI эндпоинт, который мы создадим позже)
        fetch(`${pcAddress}/chat?text=${encodeURIComponent(text)}`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Отправка по нажатию Enter
document.getElementById('user-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

let isUserDragging = false; // Флаг: двигает ли пользователь ползунок прямо сейчас

let isUserInteracting = false; // Флаг: трогает ли пользователь ползунок

function updateVolume(val) {
    document.getElementById('vol-val').innerText = val + '%';
    
    // Отправляем на сервер ТОЛЬКО если это действие пользователя
    if (isUserInteracting) {
        fetch(`${pcAddress}/control?command=set_volume&value=${val}`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
    }
}

const volSlider = document.getElementById('volume-slider');
if (volSlider) {
    volSlider.oninput = function() {
        isUserInteracting = true;
        document.getElementById('vol-val').innerText = this.value + '%';
        // Отправляем звук (sendCommand вызовется здесь)
        sendCommand('set_volume', this.value);
    };

    // Сбрасываем флаг только после того, как пользователь отпустил палец
    const stopInteracting = () => { setTimeout(() => { isUserInteracting = false; }, 1000); };
    volSlider.onmouseup = stopInteracting;
    volSlider.ontouchend = stopInteracting;
}




