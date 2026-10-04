// Imitação em memória do subconjunto do json-server usado pela aplicação.
// Substitui o fetch global para testar os serviços sem subir servidor nem rede.
import { readFileSync } from 'node:fs';

export function criarServidorFalso(dadosIniciais) {
    const bd = structuredClone(
        dadosIniciais ?? JSON.parse(readFileSync(new URL('../../db.seed.json', import.meta.url), 'utf8'))
    );
    let sequencia = 1;
    const chamadas = [];

    const resposta = (status, corpo) =>
        new Response(corpo === undefined ? null : JSON.stringify(corpo), {
            status,
            statusText: status === 404 ? 'Not Found' : 'OK',
        });

    async function fetchFalso(url, opcoes = {}) {
        const metodo = (opcoes.method ?? 'GET').toUpperCase();
        const u = new URL(url);
        const [, colecao, id] = u.pathname.split('/').map(decodeURIComponent);
        chamadas.push(`${metodo} ${u.pathname}${u.search}`);
        const lista = bd[colecao];
        if (!lista) return resposta(404, {});
        const corpo = opcoes.body ? JSON.parse(opcoes.body) : undefined;

        if (metodo === 'GET' && !id) {
            let resultado = lista;
            for (const [k, v] of u.searchParams) resultado = resultado.filter((i) => String(i[k]) === v);
            return resposta(200, resultado);
        }
        const indice = lista.findIndex((i) => String(i.id) === id);
        if (metodo === 'POST') {
            const novo = { id: `n${sequencia++}`, ...corpo };
            lista.push(novo);
            return resposta(201, novo);
        }
        if (indice < 0) return resposta(404, {});
        if (metodo === 'GET') return resposta(200, lista[indice]);
        if (metodo === 'PUT') return resposta(200, (lista[indice] = { id: lista[indice].id, ...corpo }));
        if (metodo === 'PATCH') return resposta(200, (lista[indice] = { ...lista[indice], ...corpo }));
        if (metodo === 'DELETE') {
            lista.splice(indice, 1);
            return resposta(200, {});
        }
        return resposta(405, {});
    }

    return { bd, chamadas, fetchFalso };
}

/** Instala o servidor falso como fetch global; devolve o servidor e uma função para restaurar. */
export function instalar(dadosIniciais) {
    const servidor = criarServidorFalso(dadosIniciais);
    const original = globalThis.fetch;
    const consoleErro = console.error;
    globalThis.fetch = servidor.fetchFalso;
    console.error = () => {}; // o api-service registra erros esperados; silenciamos nos testes
    return {
        ...servidor,
        restaurar() {
            globalThis.fetch = original;
            console.error = consoleErro;
        },
    };
}
