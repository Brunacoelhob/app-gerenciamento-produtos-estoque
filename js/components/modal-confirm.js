import { esc } from '../utils/html.js';

/**
 * Abre modal de confirmação
 * @param {string} title 
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export function confirmAction(title, message) {
    return new Promise((resolve) => {
        const modalHtml = `
      <div class="modal-overlay" id="confirm-modal">
        <div class="glass-card modal-body">
          <h3 style="margin-bottom: 0.5rem">${esc(title)}</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem">${esc(message)}</p>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
            <button class="btn btn-secondary" id="btn-modal-cancel">Cancelar</button>
            <button class="btn btn-danger" id="btn-modal-confirm">Confirmar</button>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById('confirm-modal');

        // Animação de entrada
        requestAnimationFrame(() => modalElement.classList.add('open'));

        const cleanup = (result) => {
            modalElement.classList.remove('open');
            setTimeout(() => {
                modalElement.remove();
                resolve(result);
            }, 200);
        };

        document.getElementById('btn-modal-confirm').addEventListener('click', () => cleanup(true));
        document.getElementById('btn-modal-cancel').addEventListener('click', () => cleanup(false));
    });
}