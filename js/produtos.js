import { getProdutos, createProduto, updateProduto, deleteProduto, getProdutoById } from './services/produto-service.js';
import { getEstoqueByProdutoId, updateEstoqueQuantidade, deleteEstoque } from './services/estoque-service.js';
import { classeBadge } from './domain/regras.js';
import { esc } from './utils/html.js';
import { showToast } from './components/toast.js';
import { confirmAction } from './components/modal-confirm.js';
import { getTableSkeleton } from './components/skeleton-loader.js';

const tbody = document.getElementById('tb-produtos');
const modal = document.getElementById('modal-produto');
const form = document.getElementById('form-produto');
const inputBusca = document.getElementById('input-busca');

let produtosCache = [];

async function carregarProdutos() {
    tbody.innerHTML = getTableSkeleton(4, 6);
    try {
        produtosCache = await getProdutos();
        renderTabela(produtosCache);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderTabela(lista) {
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const badgeClass = classeBadge(p.status);

        return `
      <tr>
        <td><code>${esc(p.id)}</code></td>
        <td><strong>${esc(p.nome)}</strong></td>
        <td>${esc(p.categoria)}</td>
        <td>R$ ${Number(p.preco).toFixed(2)}</td>
        <td><span class="badge ${badgeClass}">${esc(p.status || 'N/A')}</span></td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-edit" data-id="${esc(p.id)}">Editar</button>
          <button class="btn btn-danger btn-del" data-id="${esc(p.id)}">Excluir</button>
        </td>
      </tr>
    `;
    }).join('');
}

// Filtro de Busca
inputBusca.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    const filtrados = produtosCache.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo)
    );
    renderTabela(filtrados);
});

// Modal Actions
document.getElementById('btn-novo-produto').addEventListener('click', () => {
    form.reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('modal-title').innerText = 'Novo Produto';
    modal.classList.add('open');
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
    modal.classList.remove('open');
});

// Submit Form (Criar / Editar)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('produto-id').value;
    const payload = {
        nome: document.getElementById('nome').value,
        categoria: document.getElementById('categoria').value,
        preco: parseFloat(document.getElementById('preco').value)
    };

    try {
        if (id) {
            const prodAtual = await getProdutoById(id);
            await updateProduto(id, { ...prodAtual, ...payload });
            showToast('Produto atualizado com sucesso!');
        } else {
            // Produto novo inicia indisponível até registrar a quantidade no estoque
            payload.status = 'Indisponível';
            const novoProd = await createProduto(payload);
            // Cria registro de estoque zerado inicial para o produto
            await updateEstoqueQuantidade(novoProd.id, 0);
            showToast('Produto cadastrado com sucesso!');
        }
        modal.classList.remove('open');
        carregarProdutos();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Ações na Tabela (Editar e Excluir)
tbody.addEventListener('click', async (e) => {
    const btnEdit = e.target.closest('.btn-edit');
    const btnDel = e.target.closest('.btn-del');

    if (btnEdit) {
        const id = btnEdit.dataset.id;
        const prod = await getProdutoById(id);
        document.getElementById('produto-id').value = prod.id;
        document.getElementById('nome').value = prod.nome;
        document.getElementById('categoria').value = prod.categoria;
        document.getElementById('preco').value = prod.preco;
        document.getElementById('modal-title').innerText = 'Editar Produto';
        modal.classList.add('open');
    }

    if (btnDel) {
        const id = btnDel.dataset.id;
        const confirmou = await confirmAction(
            'Excluir Produto',
            'Tem certeza que deseja remover este produto? Esta ação é irreversível.'
        );
        if (confirmou) {
            try {
                // Remove primeiro o estoque do produto (evita registro órfão) e depois o produto.
                const est = await getEstoqueByProdutoId(id);
                if (est) await deleteEstoque(est.id);
                await deleteProduto(id);
                showToast('Produto removido!');
                carregarProdutos();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    }
});

// Inicialização
carregarProdutos();