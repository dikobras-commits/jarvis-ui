const tg = window.Telegram.WebApp;
tg.expand();

const pcAddress = "https://purple-tigers-beg.loca.lt"; 

function showPage(pageId, element) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    tg.HapticFeedback.impactOccurred('light');
}

function sendCommand(cmd) {
    fetch(`${pcAddress}/control?command=${cmd}`, {
        headers: { "bypass-tunnel-reminder": "true" }
    }).then(() => tg.HapticFeedback.notificationOccurred('success'))
      .catch(e => console.error(e));
}

async function takeScreenshot() {
    const imgElement = document.getElementById('screen-img');
    const container = document.getElementById('screenshot-container');
    container.style.display = 'block';
    imgElement.src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const response = await fetch(`${pcAddress}/screenshot`, {
            headers: { 'bypass-tunnel-reminder': 'true' }
        });
        const data = await response.json();
        if (data.status === "success") {
            imgElement.src = `data:image/png;base64,${data.image}`;
            tg.HapticFeedback.notificationOccurred('success');
        }
    } catch (err) {
        container.style.display = 'none';
    }
}
