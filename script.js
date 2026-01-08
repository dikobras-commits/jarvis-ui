const tg = window.Telegram.WebApp;
tg.expand();

// УКАЖИ СВОЙ АДРЕС ИЗ ТЕРМИНАЛА
const pcAddress = "https://eager-rooms-tie.loca.lt"; 

function showPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    el.classList.add('active');
    
    tg.HapticFeedback.impactOccurred('light');
}

function sendCommand(cmd) {
    fetch(`${pcAddress}/control?command=${cmd}`, {
        headers: { "bypass-tunnel-reminder": "true" }
    }).then(() => tg.HapticFeedback.notificationOccurred('success'))
      .catch(e => console.error("Link Error"));
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

        // Обновляем положение ползунка, только если пользователь его не трогает
        if (!isUserDragging) {
            const volSlider = document.getElementById('volume-slider');
            volSlider.value = data.volume; 
            document.getElementById('vol-val').innerText = data.volume + '%';
        }
    } catch (e) {}
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

function updateVolume(val) {
    document.getElementById('vol-val').innerText = val + '%';
    
    // Отправляем команду ТОЛЬКО если пользователь сам двигает ползунок
    if (isUserDragging) {
        fetch(`${pcAddress}/control?command=set_volume&value=${val}`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
    }
}

// Слушатели событий для мыши/тача, чтобы понять, когда пользователь нажал на слайдер
const slider = document.getElementById('volume-slider');
slider.addEventListener('mousedown', () => { isUserDragging = true; });
slider.addEventListener('touchstart', () => { isUserDragging = true; });
slider.addEventListener('mouseup', () => { isUserDragging = false; });
slider.addEventListener('touchend', () => { isUserDragging = false; });

