/**
 * Escapa texto para inserção segura em HTML (conteúdo e atributos entre aspas).
 * Use em TODO dado vindo da API ou do usuário que entre em template string de innerHTML.
 */
export function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));
}
