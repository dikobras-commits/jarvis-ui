const tg = window.Telegram.WebApp;
tg.expand();
let currentPath = "";

const pcAddress = "https://jarvis-project-my-unique-name.loca.lt"; 
const user = tg.initDataUnsafe?.user;
const tgUser = tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.id || "Unknown";

let isUserInteracting = false;

// 1. Главная функция отправки
function sendCommand(cmd, value = null) {
    let url = `${pcAddress}/control?command=${cmd}`;
    if (value !== null) url += `&value=${value}`;

    fetch(url, { 
        headers: { 
            "bypass-tunnel-reminder": "true",
            "X-TG-User": tgUser
        }, 
        mode: 'cors' 
    })
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
function updateStats() {
    // Проверяем, существует ли слайдер, прежде чем брать его значение
    const volSlider = document.getElementById('volume-slider');
    const volValue = volSlider ? volSlider.value : 50; 

    fetch(`${pcAddress}/status`, { headers: { "bypass-tunnel-reminder": "true", "X-TG-User": tgUser } })
    .then(r => r.json())
    .then(data => {
        document.getElementById('cpu-val').innerText = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        document.getElementById('ram-val').innerText = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';
        // Если есть элемент громкости, обновляем и его
        const volText = document.getElementById('vol-val');
        if (volText) volText.innerText = data.volume + '%';
    })
    .catch(err => console.log("Сэр, статус пока недоступен"));
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
    currentPath = path;
    const container = document.getElementById('file-list');
    if (!container) {
        console.error("Контейнер file-list не найден!");
        return;
    }

    container.innerHTML = "<p style='padding:20px; color:var(--blue);'>Сэр, запрашиваю данные...</p>";

    try {
        const response = await fetch(`${pcAddress}/file-manager/list`, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
                "bypass-tunnel-reminder": "true" 
            },
            body: JSON.stringify({ path: path })
        });

        const items = await response.json();
        container.innerHTML = ""; 

        if (items.error) {
            container.innerHTML = `<p style="color:var(--red); padding:20px;">${items.error}</p>`;
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `file-item ${item.type}`;
            
            // --- НОВЫЙ БЛОК ЛОГИКИ ПРЕДПРОСМОТРА ---
            let iconHtml = "";
            if (item.preview) {
                // Если есть превью от сервера, вставляем картинку
                iconHtml = `<img src="data:image/jpeg;base64,${item.preview}" class="file-preview-img">`;
            } else {
                // Если превью нет, ставим обычную иконку
                let icon = item.type === 'file' ? "📄" : "📁";
                iconHtml = `<span class="file-icon">${icon}</span>`;
            }
            // ---------------------------------------
            
            div.innerHTML = `
                ${iconHtml}
                <span class="file-name">${item.name}</span>
                ${item.type === 'file' ? `
                    <input type="checkbox" 
                           class="file-checkbox" 
                           ${selectedFiles.has(item.path) ? 'checked' : ''} 
                           onclick="event.stopPropagation(); toggleFile('${item.path}')">
                ` : ''}
            `;

            div.onclick = () => {
                if (item.type === 'file') {
                    const cb = div.querySelector('input');
                    if (cb) {
                        cb.checked = !cb.checked;
                        toggleFile(item.path);
                    }
                } else {
                    loadFiles(item.path);
                }
            };

            container.appendChild(div);
        });

    } catch (e) {
        console.error("Ошибка связи:", e);
        container.innerHTML = "<p style='color:var(--red); padding:20px;'>Ошибка связи с ПК</p>";
    }
}

function toggleFile(path) {
    if (selectedFiles.has(path)) {
        selectedFiles.delete(path);
    } else {
        selectedFiles.add(path);
    }
    
    const bar = document.getElementById('file-actions');
    const countSpan = document.getElementById('sel-count');
    
    if (selectedFiles.size > 0) {
        bar.style.display = "flex"; // Показываем панель
        countSpan.innerText = selectedFiles.size;
        tg.HapticFeedback.impactOccurred('light'); // Вибрация при выборе
    } else {
        bar.style.display = "none";
    }
}

async function exportSelected() {
    const userId = tg.initDataUnsafe?.user?.id;
    const filePaths = Array.from(selectedFiles);

    if (!userId) {
        alert("ID не найден. Открой через бота.");
        return;
    }

    try {
        const response = await fetch(`${pcAddress}/file-manager/export`, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json", 
                "bypass-tunnel-reminder": "true" 
            },
            body: JSON.stringify({ 
                paths: filePaths,
                chat_id: userId
            })
        });

        const result = await response.json();
        
        if (result.status === "sent") {
            // Вместо showPopup используем обычный alert
            alert(`Сэр, отправлено файлов: ${result.count}`);
            selectedFiles.clear();
            const bar = document.getElementById('file-actions');
            if (bar) bar.style.display = 'none';
        }
    } catch (e) {
        console.error("Ошибка экспорта:", e);
        alert("Ошибка связи с сервером");
    }
}

function goBackFiles() {
    loadFiles(""); 
}

function triggerUpload() {
    if (!currentPath) {
        alert("Сэр, выберите конкретную папку для загрузки.");
        return;
    }
    // Кликаем по скрытому инпуту программно
    document.getElementById('file-upload-input').click();
}

// 2. Обработка выбранного файла
async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath); // Говорим серверу, куда класть

    // Визуализация загрузки
    const btn = document.querySelector('.upload-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Ждите...";
    btn.disabled = true;

    try {
        const response = await fetch(`${pcAddress}/file-manager/upload`, {
            method: 'POST',
            // Важно: для FormData не нужно задавать Content-Type, браузер сам поставит boundary
            headers: { "bypass-tunnel-reminder": "true" }, 
            body: formData
        });

        const result = await response.json();

        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            // Обновляем список файлов, чтобы увидеть новый файл
            loadFiles(currentPath);
        } else {
            alert("Ошибка: " + result.message);
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка загрузки");
    } finally {
        // Возвращаем кнопку в исходное состояние
        btn.innerHTML = originalText;
        btn.disabled = false;
        input.value = ""; // Очищаем инпут
    }
}

setInterval(updateStats, 4000);
