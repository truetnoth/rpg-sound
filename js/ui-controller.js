// ui-controller.js - Управление интерфейсом
import { sounds, stopSound } from './audio-engine.js';
import { deleteAudioFromIndexedDB, clearAllStorage } from './storage.js';

export function renderSoundboard() {
    const soundboard = document.getElementById('soundboard');
    
    if (sounds.length === 0) {
        soundboard.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎵</div>
                <h3>Пока нет загруженных треков</h3>
                <p>Загрузите аудиофайлы, чтобы начать</p>
            </div>
            <div class="add-track-button" onclick="document.getElementById('file-input').click()">
                <div class="add-track-icon">➕</div>
                <div class="add-track-text">Добавить трек</div>
            </div>
        `;
        return;
    }
    
    const soundCards = sounds.map(sound => `
        <div class="sound-button ${sound.isPlaying ? 'active' : ''}" onclick="window.toggleSound(${sound.id})">
            <button class="track-menu-button" onclick="window.toggleTrackMenu(${sound.id}, event)">⚙️</button>
            <div class="track-menu" id="menu-${sound.id}">
                <div class="track-menu-item" onclick="window.toggleFadeFromMenu(${sound.id}, event)">
                    <span class="menu-item-icon">🌊</span>
                    <span class="menu-item-text">Fade</span>
                    <span class="menu-item-status">${sound.fadeEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </div>
                <div class="track-menu-item" onclick="window.toggleLoopFromMenu(${sound.id}, event)">
                    <span class="menu-item-icon">🔁</span>
                    <span class="menu-item-text">Loop</span>
                    <span class="menu-item-status">${sound.loopEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </div>
                <div class="track-menu-item danger" onclick="window.deleteSoundFromMenu(${sound.id}, event)">
                    <span class="menu-item-icon">🗑️</span>
                    <span class="menu-item-text">Удалить</span>
                </div>
            </div>
            <div class="sound-icon">${sound.icon}</div>
            <div class="sound-name">${sound.name}</div>
            <div class="sound-volume">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value="${Math.round(sound.volume * 100)}"
                    onclick="event.stopPropagation()"
                    oninput="window.updateSoundVolume(${sound.id}, this.value)"
                >
            </div>
        </div>
    `).join('');
    
    const addButton = `
        <div class="add-track-button" onclick="document.getElementById('file-input').click()">
            <div class="add-track-icon">➕</div>
            <div class="add-track-text">Добавить трек</div>
        </div>
    `;
    
    soundboard.innerHTML = soundCards + addButton;
}

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

export function toggleTrackMenu(soundId, event) {
    event.stopPropagation();
    
    const menu = document.getElementById(`menu-${soundId}`);
    const allMenus = document.querySelectorAll('.track-menu');
    
    allMenus.forEach(m => {
        if (m.id !== `menu-${soundId}`) {
            m.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
}

export function stopAllTracks() {
    const playingSounds = sounds.filter(s => s.isPlaying);
    
    if (playingSounds.length === 0) {
        return;
    }
    
    playingSounds.forEach(sound => {
        stopSound(sound);
    });
    
    renderSoundboard();
}

export async function clearAll() {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ сохраненные треки? Это действие нельзя отменить!')) {
        return;
    }

    try {
        sounds.forEach(sound => {
            if (sound.isPlaying) {
                stopSound(sound);
            }
        });

        sounds.length = 0;
        await clearAllStorage();

        renderSoundboard();
    } catch (error) {
        console.error('Ошибка при очистке хранилища:', error);
        showNotification('❌ Ошибка при очистке', 'error');
    }
}
