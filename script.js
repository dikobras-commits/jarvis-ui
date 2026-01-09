const tg = window.Telegram.WebApp;
tg.expand();


const pcAddress = "https://jarvis-project-my-unique-name.loca.lt"; 
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
// --- Вставьте это вместо старой функции showPage в script.js ---

function showPage(pageId, element) {
    // 1. Убираем класс active у всех страниц (CSS сам скроет их)
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        // Убираем инлайновые стили, если они остались от старого кода
        p.style.display = ''; 
    });
    
    // 2. Находим нужную страницу
    const activePage = document.getElementById(pageId);
    
    // 3. Добавляем класс active (CSS сам покажет страницу)
    if (activePage) {
        activePage.classList.add('active');
    }

    // 4. Специальная логика для чата
    if (pageId === 'chat') {
        loadHistory();
        // Прокрутка вниз
        setTimeout(() => {
            const chatContainer = document.getElementById('chat-messages');
            if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    }

    // 5. Обновляем иконки внизу (Таб-бар)
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}


// 3. Скриншоты
async function takeScreenshot() {
    console.log("Запрос скриншота отправлен..."); // Отладка
    
    try {
        const response = await fetch(`${pcAddress}/screenshot`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await response.json();
        
        console.log("Ответ от сервера:", data); // Посмотри в консоль, есть ли там огромная строка base64

        if (data.status === "success" && data.image) {
            const container = document.getElementById('screenshot-preview');
            const imgElement = document.getElementById('screenshot-img');
            
            imgElement.src = data.image;
            container.style.display = 'block'; // Прямое принудительное отображение
            
            console.log("Блок должен отобразиться сейчас");
            container.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Ошибка при получении данных:", err);
    }
}

function closeScreenshot() {
    document.getElementById('screenshot-preview').style.display = 'none';
}

// 5. Статус и чат
async function updateStats() {
    // Если пользователь сейчас крутит ползунок, не перебиваем его значениями с сервера
    if (isUserInteracting) return; 

    try {
        const res = await fetch(`${pcAddress}/status`, { 
            headers: { "bypass-tunnel-reminder": "true" } 
        });
        const data = await res.json();
        
        // Обновляем текст и бары CPU/RAM
        document.getElementById('cpu-val').innerText = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        document.getElementById('ram-val').innerText = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';

        // Обновляем ползунок громкости
        if (volSlider && data.volume !== undefined) {
            volSlider.value = data.volume;
            volText.innerText = data.volume + '%';
        }
    } catch (e) {
        console.error("Ошибка обновления статуса:", e);
    }
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

function openGameModal() {
    document.getElementById('game-modal').style.display = 'block';
    tg.HapticFeedback.impactOccurred('medium');
}

function closeGameModal() {
    document.getElementById('game-modal').style.display = 'none';
}

function runApp(appName) {
    sendCommand('launch_app', appName);
    closeGameModal();
}

// Закрытие при клике вне окна
window.onclick = function(event) {
    const modal = document.getElementById('game-modal');
    if (event.target == modal) closeGameModal();
}
setInterval(updateStats, 4000);












