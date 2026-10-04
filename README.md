# Sistema Integrado: Produtos, Estoque e Pedidos

[![CI](https://github.com/Brunacoelhob/app-gerenciamento-produtos-estoque/actions/workflows/ci.yml/badge.svg)](https://github.com/Brunacoelhob/app-gerenciamento-produtos-estoque/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue)

Dashboard e CRUD que integram **três recursos** (Produtos, Estoque e Pedidos) em um front-end JavaScript puro (ES Modules), com API simulada por **json-server**. O enunciado original está em [docs/enunciado.md](docs/enunciado.md).

## Funcionalidades

- **Dashboard**: indicadores (total de produtos, alertas de estoque, pedidos válidos, faturamento) e gráfico de estoque por categoria (Chart.js)
- **Produtos**: criar, editar, excluir e buscar
- **Estoque**: ajuste de quantidade
- **Pedidos**: criar (com validação de estoque) e cancelar (devolve ao estoque)
- Feedback visual (toasts), confirmação de ações destrutivas e *skeleton loaders*

## Propriedade derivada (requisito central)

O **status do produto nunca é digitado**: é calculado a partir da quantidade em estoque em um único lugar, [`js/domain/regras.js`](js/domain/regras.js) (`calcularStatus`).

| Quantidade | Status |
|---|---|
| > 10 | Disponível |
| 1 a 10 | Estoque baixo |
| 0 | Indisponível |

Todo caminho que altera o estoque (ajuste manual, novo pedido, cancelamento) passa por `updateEstoqueQuantidade` ([`js/services/estoque-service.js`](js/services/estoque-service.js)), que recalcula e grava o status do produto. Cadastro e edição de produto aceitam apenas nome, categoria e preço: tentar enviar `status` é ignorado.

## Arquitetura

```
pages/*.html + js/<pagina>.js      (interface: renderiza e captura eventos)
        │
js/services/*  ──► apiRequest ──► json-server (REST)     (acesso a dados e orquestração)
        │
js/domain/regras.js                (regras puras: status, total, validações; sem rede nem DOM)
js/utils/html.js                   (escape de HTML)
```

## Como executar

Requer Node 20+.

```bash
npm install
npm start          # API em http://localhost:3000  ·  aplicação em http://localhost:8080
```

O banco editável é `db.json`, criado automaticamente a partir de [`db.seed.json`](db.seed.json) (o arquivo versionado nunca é alterado). Para voltar aos dados iniciais, apague `db.json` e rode `npm start` novamente. Para apontar para outra API, defina `window.APP_CONFIG = { apiUrl: '...' }` antes dos scripts.

## Testes

```bash
npm test
```

21 testes sem rede: as regras de negócio e os serviços rodam contra um **json-server falso em memória** ([`test/helpers/json-server-falso.js`](test/helpers/json-server-falso.js)). Cobrem os limites do status, o cálculo de totais, validação de estoque antes de qualquer escrita, cancelamento sem reposição dupla e a coerência dos dados de exemplo.

## Segurança e integridade (o que foi corrigido)

| Problema na versão anterior | Correção |
|---|---|
| **XSS**: nomes/clientes entravam no `innerHTML` sem escape | `esc()` em todo dado dinâmico |
| Preço/total do pedido vinham do navegador (dava para comprar por R$ 0,01) | Preço lido do cadastro e total calculado no momento da compra |
| Regra do status divergia do enunciado (`> 5` em vez de `> 10`) | Corrigida e coberta por testes nos limites |
| Status podia ser sobrescrito ao editar produto | Edição só aceita nome, categoria e preço |
| Excluir produto causava erro (atualizava status de produto já apagado) | Remove o estoque e depois o produto |
| Cancelar pedido podia repor estoque duas vezes se falhasse no meio | Marca como cancelado **antes** de repor |
| Itens repetidos do mesmo produto burlavam a checagem de estoque | Itens são somados antes de validar |
| Scripts de CDN com `@latest` | Versões fixas |
| `npm start` documentado, mas sem `package.json` | Projeto com scripts, dependências e CI |

## Limitações conhecidas

- É um **protótipo com API simulada**: o json-server não tem autenticação, transações nem controle de concorrência. Dois usuários baixando o mesmo estoque ao mesmo tempo podem gerar inconsistência. Em produção, essas regras (estoque e preço) devem ficar em um back-end real com transações no banco.
- Os scripts de efeito visual e gráfico vêm de CDN (sem SRI).

## Licença

[MIT](LICENSE)
