const tg = window.Telegram.WebApp;
tg.expand();


const pcAddress = "https://real-poets-refuse.loca.lt"; 
const user = tg.initDataUnsafe?.user;
const username = user ? user.username : "Guest";

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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
    if (pageId === 'chat') loadHistory();
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
    const chatBox = document.getElementById('chat-messages');
    try {
        const res = await fetch(`${pcAddress}/chat/history?username=${myUsername}`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const history = await res.json();
        chatBox.innerHTML = ""; // Очищаем
        history.forEach(msg => {
            const side = msg.role === 'user' ? 'user' : 'bot';
            chatBox.innerHTML += `<div class="chat-bubble ${side}">${msg.content}</div>`;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) { console.error("История не загружена"); }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    // Берем username из Telegram или ставим дефолт
    const username = tg.initDataUnsafe?.user?.username || "Admin_User";

    // 1. Отображаем сообщение пользователя мгновенно
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML += `<div class="chat-bubble user">${text}</div>`;
    input.value = ""; // Очищаем поле
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // 2. Отправляем запрос
        const response = await fetch(`${pcAddress}/chat/send?username=${username}&text=${encodeURIComponent(text)}`, {
            method: 'POST',
            headers: { "bypass-tunnel-reminder": "true" }
        });

        if (!response.ok) throw new Error("Сервер вернул ошибку");

        const data = await response.json();

        // 3. Отображаем ответ ИИ
        chatContainer.innerHTML += `<div class="chat-bubble bot">${data.response}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (err) {
        console.error("Ошибка чата:", err);
        chatContainer.innerHTML += `<div class="chat-bubble bot" style="color: #f43f5e;">Сэр, возникла ошибка соединения.</div>`;
    }
}
setInterval(updateStats, 4000);


