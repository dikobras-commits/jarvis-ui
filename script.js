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
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none'; 
    });
    
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        activePage.style.display = 'block'; // Явно показываем
    }

    // ЛОГИКА ДЛЯ ФАЙЛОВ: Если открыли вкладку files — запускаем загрузку
    if (pageId === 'files') {
        console.log("Загрузка файлов...");
        loadFiles(""); // Загружаем корень (категории)
    }

    if (pageId === 'chat') {
        loadHistory();
        setTimeout(() => {
            const chatContainer = document.getElementById('chat-messages');
            if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    }

    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if (element) element.classList.add('active');
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// 3. Скриншоты
async function takeScreenshot() {
    console.log("📸 Запрашиваю скриншот...");
    const container = document.getElementById('screenshot-preview');
    const imgElement = document.getElementById('screenshot-img');

    if (!container || !imgElement) {
        alert("Ошибка: Элементы screenshot-preview не найдены в HTML!");
        return;
    }

    try {
        const response = await fetch(`${pcAddress}/screenshot`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await response.json();

        if (data.status === "success") {
            console.log("✅ Скриншот получен, длина строки:", data.image.length);
            
            // Сначала вставляем данные
            imgElement.src = data.image;
            
            // Ждем, пока картинка загрузится в браузер, прежде чем показать блок
            imgElement.onload = function() {
                container.style.setProperty('display', 'block', 'important');
                console.log("👁️ Блок теперь должен быть виден");
                container.scrollIntoView({ behavior: 'smooth' });
            };
        }
    } catch (err) {
        console.error("❌ Ошибка:", err);
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

let currentFilePath = "";
let selectedFiles = new Set();

async function loadFiles(path = "") {
    const listContainer = document.getElementById('file-list');
    listContainer.innerHTML = "<div class='loader'>Загрузка...</div>";

    try {
        const res = await fetch(`${pcAddress}/file-manager/list`, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "bypass-tunnel-reminder": "true" },
            body: JSON.stringify({ path: path })
        });
        const items = await res.json();

        listContainer.innerHTML = "";
        document.getElementById('file-back').style.display = path ? "block" : "none";
        currentFilePath = path;

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `file-item ${item.type}`;
            div.innerHTML = `
                <span class="icon">${item.type === 'file' ? '📄' : '📁'}</span>
                <span class="name">${item.name}</span>
                ${item.type === 'file' ? `<input type="checkbox" onclick="event.stopPropagation(); toggleFile('${item.path}')">` : ''}
            `;
            div.onclick = () => {
                if (item.type !== 'file') loadFiles(item.path);
            };
            listContainer.appendChild(div);
        });
    } catch (e) {
        listContainer.innerHTML = "Ошибка связи с ПК";
    }
}

function toggleFile(path) {
    if (selectedFiles.has(path)) selectedFiles.delete(path);
    else selectedFiles.add(path);
    
    const bar = document.getElementById('file-actions');
    bar.style.display = selectedFiles.size > 0 ? "flex" : "none";
    document.getElementById('sel-count').innerText = selectedFiles.size;
}

async function exportSelected() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return alert("Ошибка: ID пользователя не найден");

    tg.HapticFeedback.notificationOccurred('success');
    await fetch(`${pcAddress}/file-manager/export`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", "bypass-tunnel-reminder": "true" },
        body: JSON.stringify({ 
            paths: Array.from(selectedFiles),
            chat_id: userId
        })
    });
    
    selectedFiles.clear();
    toggleFile(); // Скрыть панель
    tg.MainButton.setText("Файлы отправлены!").show();
    setTimeout(() => tg.MainButton.hide(), 3000);
}

function goBackFiles() {
    // Упрощенная логика возврата в корень
    loadFiles("");
}

if (pageId === 'files') loadFiles("");

setInterval(updateStats, 4000);















