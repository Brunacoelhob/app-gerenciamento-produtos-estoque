/**
 * Módulo de Serviço de API
 * Gerencia todas as chamadas HTTP com o json-server (banco db.json).
 * A URL base pode ser trocada definindo window.APP_CONFIG = { apiUrl: '...' } antes dos scripts.
 */

const BASE_URL = globalThis.APP_CONFIG?.apiUrl ?? 'http://localhost:3000';
let isServerAlertShown = false; // Evita disparar múltiplos alertas em requisições simultâneas

/** Erro de resposta HTTP, com o status para quem precisar tratar (ex.: 404). */
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Função genérica para realizar requisições HTTP na aplicação.
 *
 * @param {string} endpoint - O caminho da rota (ex: '/produtos', 'estoque')
 * @param {string} method - Método HTTP ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
 * @param {Object|null} body - Dados a serem enviados no corpo da requisição
 * @returns {Promise<any>} Dados retornados do servidor em JSON
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const options = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${formattedEndpoint}`, options);

        if (!response.ok) {
            throw new ApiError(response.status, `Erro na requisição (${response.status}): ${response.statusText}`);
        }

        // Requisições DELETE ou status 204 (No Content) não têm corpo JSON
        if (options.method === 'DELETE' || response.status === 204) {
            return true;
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Error] ${options.method} ${formattedEndpoint}:`, error);

        // Mensagem amigável caso o servidor esteja offline
        if (error.name === 'TypeError' && typeof alert === 'function') {
            if (!isServerAlertShown) {
                isServerAlertShown = true;
                alert('Servidor indisponível!\n\nCertifique-se de iniciar a aplicação no terminal com o comando:\nnpm start');
                setTimeout(() => { isServerAlertShown = false; }, 5000);
            }
        }

        throw error;
    }
}
