const tg = window.Telegram.WebApp;
tg.expand();


const pcAddress = "https://cyan-files-fail.loca.lt"; 
const user = tg.initDataUnsafe?.user;

let isUserInteracting = false;

// 1. Главная функция отправки
function sendCommand(cmd, value = null) {
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;

    fetch(url, { headers: { "bypass-tunnel-reminder": "true" }, mode: 'cors' })
    .then(response => {
        if (response.ok) {
            if (cmd !== 'set_volume') tg.HapticFeedback.notificationOccurred('success');
        }
    })
    .catch(err => console.error("Ошибка команды:", err));
}

// 2. Функции страниц
function showPage(pageId, element) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    // Активируем нужную
    const activePage = document.getElementById(pageId);
    activePage.classList.add('active');
    
    // Специальный режим для чата
    if (pageId === 'chat') {
        activePage.style.display = 'flex';
        loadHistory();
    } else {
        activePage.style.display = 'block';
    }

    // Таб-бар
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    tg.HapticFeedback.impactOccurred('light');
}

// 3. Скриншоты
function takeScreenshot() {
    tg.HapticFeedback.impactOccurred('medium');
    fetch(`${pcAddress}/screenshot`, { headers: { "bypass-tunnel-reminder": "true" } })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            const container = document.getElementById('screenshot-container');
            const img = document.getElementById('screen-img');
            img.src = "data:image/png;base64," + data.image;
            container.style.display = 'block';
        }
    });
}

function hideScreenshot() {
    document.getElementById('screenshot-container').style.display = 'none';
}

// 4. Логика ползунка
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

// 5. Статус и чат
async function updateStats() {
    if (isUserInteracting) return;
    try {
        const res = await fetch(`${pcAddress}/status`, { headers: { "bypass-tunnel-reminder": "true" } });
        const data = await res.json();
        document.getElementById('cpu-val').innerText = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        document.getElementById('ram-val').innerText = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';
        if (volSlider) {
            volSlider.value = data.volume;
            document.getElementById('vol-val').innerText = data.volume + '%';
        }
    } catch (e) {}
}

async function loadHistory() {
    const username = tg.initDataUnsafe?.user?.username || "Guest";
    try {
        const res = await fetch(`${pcAddress}/chat/history?username=${username}`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const messages = await res.json();
        const chatContainer = document.getElementById('chat-messages');
        chatContainer.innerHTML = messages.map(msg => 
            `<div class="chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}">${msg.content}</div>`
        ).join('');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (e) { console.log("История не загружена"); }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // 1. Визуально добавляем сообщение пользователя
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML += `<div class="chat-bubble user">${text}</div>`;
    input.value = "";
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 2. Берем имя пользователя
    const username = tg.initDataUnsafe?.user?.username || "Guest";

    try {
        // 3. Отправляем запрос с заголовком для обхода предупреждения localtunnel
        const res = await fetch(`${pcAddress}/chat/send?username=${username}&text=${encodeURIComponent(text)}`, {
            method: 'POST',
            headers: { 
                "bypass-tunnel-reminder": "true" // ОБЯЗАТЕЛЬНО для localtunnel
            }
        });

        if (!res.ok) throw new Error("Сервер вернул ошибку");

        const data = await res.json();
        
        // 4. Добавляем ответ бота, если он пришел
        if (data && data.response) {
            chatContainer.innerHTML += `<div class="chat-bubble bot">${data.response}</div>`;
        } else {
            chatContainer.innerHTML += `<div class="chat-bubble bot">Сэр, я получил пустой ответ от системы.</div>`;
        }
    } catch (e) {
        console.error("Ошибка чата:", e);
        chatContainer.innerHTML += `<div class="chat-bubble bot" style="color: #ff4d4d;">Ошибка: ответ не дошел до интерфейса.</div>`;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
setInterval(updateStats, 4000);


