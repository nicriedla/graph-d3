# Graph D3

### Estrutura do projeto

- `index.html`: estrutura da pagina e controles da interface.
- `app.js`: logica de carregamento dos dados, desenho do mapa e interacoes.
- `styles.css`: estilos visuais e responsividade.
- `data/ups-ms.json`: base local das UPs exibidas no mapa.

### Como rodar o projeto

#### Abrir com Live Server

Abra o VS Code:

- instale a extensao `Live Server`;
- clique com o botao direito em `index.html`;
- selecione `Open with Live Server`.

### Alteracoes em relacao a versao anterior

#### 1. Fonte de dados

Antes:
- as UPs estavam declaradas diretamente em `app.js`.

Agora:
- os dados sao carregados de `data/ups-ms.json`.
- os valores de ocorrencias, latitude e longitude sao normalizados na carga.

#### 2. Interface

Antes:
- a interface era mais simples e sem resumo visual dos dados.

Agora:
- foram adicionados cards de estatistica no topo.
- foi incluido um bloco explicativo dentro do card principal.
- a legenda foi reescrita com instrucoes mais claras de uso.
- foi adicionado um texto complementar para detalhar a selecao atual.

#### 3. Interacoes

Antes:
- o mapa tinha um comportamento de navegacao mais basico.

Agora:
- o zoom funciona pela roda do mouse e pelos botoes `+`, `-` e `Reset`.
- o pan do mapa usa `d3.zoom` e acontece com o uso do botao direito do mouse/touchpad.
- o menu de contexto foi bloqueado sobre o mapa para nao interromper o pan.
- o picking por proximidade passou a exibir tooltip mesmo ao clicar em area vazia proxima de uma UP.

#### 4. Visual e responsividade

Antes:
- o layout tinha menos elementos de apoio visual.

Agora:
- os cards de estatistica receberam estilo proprio.
- o bloco de contexto ganhou destaque visual.
- os municipios entram com animacao de opacidade.
- a responsividade foi melhorada para telas menores.
