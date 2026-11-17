"use strict";

(function () {
  const CHAVE_ARMAZENAMENTO = "pautaDaPraca.propostas";
  const MSG_ERRO_CARREGAR = "Não foi possível carregar os dados. Tente novamente.";
  const MSG_ERRO_SALVAR = "Não foi possível salvar os dados. Tente novamente.";
  const NOMES_STATUS = { recebida: "Recebida", analise: "Em análise", atendida: "Atendida" };
  const CAMPOS = ["apelido", "bairro", "categoria", "titulo", "descricao"];

  let propostas = [];      // lista em memória
  let idEmEdicao = null;   // id da proposta que está sendo editada (ou null)
  let temporizadorMensagem = null;

  const elementos = {
    formulario: document.getElementById("form-proposta"),
    tituloFormulario: document.getElementById("titulo-form"),
    botaoEnviar: document.getElementById("btn-enviar"),
    botaoCancelar: document.getElementById("btn-cancelar"),
    lista: document.getElementById("lista-propostas"),
    mensagemVazia: document.getElementById("msg-vazio"),
    mensagemGeral: document.getElementById("mensagem-geral")
  };

  /* Cria um elemento com classe e texto. */
  function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  /* Mostra uma mensagem geral acima do formulário. tipo: "ok" ou "erro". */
  function mostrarMensagem(texto, tipo) {
    const caixa = elementos.mensagemGeral;
    caixa.className = "mensagem mensagem--" + tipo;
    caixa.textContent = texto;
    caixa.hidden = false;
    clearTimeout(temporizadorMensagem);
    temporizadorMensagem = setTimeout(function () { caixa.hidden = true; }, 6000);
  }

  function limparErro(campo) {
    const aviso = document.getElementById("erro-" + campo);
    const entrada = elementos.formulario.elements[campo];
    if (aviso) aviso.textContent = "";
    if (entrada) {
      entrada.classList.remove("invalido");
      entrada.removeAttribute("aria-invalid");
    }
  }

  function limparErros() {
    CAMPOS.forEach(limparErro);
  }

  /* Mostra a mensagem de erro embaixo de cada campo inválido. */
  function mostrarErros(erros) {
    Object.keys(erros).forEach(function (campo) {
      const aviso = document.getElementById("erro-" + campo);
      const entrada = elementos.formulario.elements[campo];
      if (aviso) aviso.textContent = erros[campo];
      if (entrada) {
        entrada.classList.add("invalido");
        entrada.setAttribute("aria-invalid", "true");
      }
    });
    const primeiro = CAMPOS.find(function (campo) { return erros[campo]; });
    if (primeiro) elementos.formulario.elements[primeiro].focus();
  }

  /* LocalStorage */
  /* Confere se um item lido do armazenamento tem o formato esperado. */
  function propostaValida(item) {
    return Boolean(item) &&
      typeof item.id === "string" && item.id.length > 0 && item.id.length <= 40 &&
      Object.prototype.hasOwnProperty.call(NOMES_STATUS, item.status) &&
      !Number.isNaN(Date.parse(item.criadoEm)) &&
      PautaValidacao.validarProposta(item).valido;
  }

  /* Lê as propostas guardadas. Retorna null se algo falhar. */
  function carregarPropostas() {
    try {
      const texto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (!texto) return [];
      const lidas = JSON.parse(texto);
      if (!Array.isArray(lidas)) throw new Error("Formato inesperado dos dados");
      return lidas.filter(propostaValida);
    } catch (erro) {
      console.error("Falha ao carregar propostas:", erro); // detalhe técnico só no console
      return null;
    }
  }

  /* Guarda as propostas. Retorna true se deu certo. */
  function salvarPropostas() {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(propostas));
      return true;
    } catch (erro) {
      console.error("Falha ao salvar propostas:", erro);
      return false;
    }
  }

  function criarBotaoDeAcao(texto, acao, proposta, classeExtra) {
    const botao = criarElemento("button", "botao botao--pequeno " + classeExtra, texto);
    botao.type = "button";
    botao.dataset.acao = acao;
    botao.dataset.id = proposta.id;
    botao.setAttribute("aria-label", texto + " a proposta: " + proposta.titulo);
    return botao;
  }

  /* Monta o cartão de uma proposta. */
  function criarCartao(proposta) {
    const cartao = criarElemento("li", "cartao proposta");

    const topo = criarElemento("div", "proposta-topo");
    topo.append(
      criarElemento("h3", "", proposta.titulo),
      criarElemento("span", "selo selo--" + proposta.status, NOMES_STATUS[proposta.status])
    );

    const autor = proposta.apelido || "anônimo";
    const data = new Date(proposta.criadoEm).toLocaleDateString("pt-BR");
    const meta = criarElemento("p", "proposta-meta",
      proposta.bairro + " · " + proposta.categoria + " · por " + autor + " · " + data);

    const acoes = criarElemento("div", "acoes");
    acoes.append(
      criarBotaoDeAcao("Editar", "editar", proposta, "botao--claro"),
      criarBotaoDeAcao("Remover", "remover", proposta, "botao--perigo")
    );

    cartao.append(topo, meta, criarElemento("p", "", proposta.descricao), acoes);
    return cartao;
  }

  /* Atualiza a lista na tela com as propostas atuais. */
  function renderizarLista() {
    elementos.lista.replaceChildren(...propostas.map(criarCartao));
    elementos.mensagemVazia.hidden = propostas.length > 0;
  }

  /* Modo de edição */

  function entrarModoEdicao() {
    elementos.tituloFormulario.textContent = "Editar proposta";
    elementos.botaoEnviar.textContent = "Salvar alterações";
    elementos.botaoCancelar.hidden = false;
  }

  /* Volta o formulário ao modo "nova proposta" (não limpa os campos). */
  function sairModoEdicao() {
    idEmEdicao = null;
    elementos.tituloFormulario.textContent = "Nova proposta";
    elementos.botaoEnviar.textContent = "Enviar proposta";
    elementos.botaoCancelar.hidden = true;
    limparErros();
  }

  /* Preenche o formulário com os dados da proposta escolhida. */
  function iniciarEdicao(id) {
    const proposta = propostas.find(function (p) { return p.id === id; });
    if (!proposta) return;
    CAMPOS.forEach(function (campo) { elementos.formulario.elements[campo].value = proposta[campo]; });
    idEmEdicao = id;
    limparErros();
    entrarModoEdicao();
    elementos.formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    elementos.formulario.elements.titulo.focus();
  }

  /* Operações: adicionar, editar, remover */

  function criarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Há outra proposta com o mesmo título no mesmo bairro? (evita repetição/spam) */
  function existeDuplicada(dados, idIgnorado) {
    return propostas.some(function (p) {
      return p.id !== idIgnorado && p.bairro === dados.bairro &&
        p.titulo.toLowerCase() === dados.titulo.toLowerCase();
    });
  }

  /* Salva, atualiza a tela e registra o resultado no painel de atividades. */
  function concluirOperacao(acao, textoSucesso) {
    const salvou = salvarPropostas();
    renderizarLista();
    if (salvou) {
      PautaAtividades.registrar(acao, textoSucesso);
      mostrarMensagem(textoSucesso, "ok");
    } else {
      PautaAtividades.registrar(acao, "falha ao salvar os dados");
      mostrarMensagem(MSG_ERRO_SALVAR, "erro");
    }
  }

  function adicionarProposta(dados) {
    const nova = Object.assign({ id: criarId(), status: "recebida", criadoEm: new Date().toISOString() }, dados);
    propostas.unshift(nova);
    concluirOperacao("Adicionar", "Proposta adicionada com sucesso.");
  }

  function editarProposta(id, dados) {
    const proposta = propostas.find(function (p) { return p.id === id; });
    if (!proposta) {
      PautaAtividades.registrar("Editar", "proposta não encontrada");
      mostrarMensagem("Não foi possível editar a proposta. Tente novamente.", "erro");
      return;
    }
    Object.assign(proposta, dados);
    concluirOperacao("Editar", "Proposta editada com sucesso.");
  }

  function removerProposta(id) {
    const proposta = propostas.find(function (p) { return p.id === id; });
    if (!proposta) return;
    if (!window.confirm("Tem certeza que deseja remover esta proposta?")) {
      PautaAtividades.registrar("Remover", "cancelado pelo usuário");
      return;
    }
    propostas = propostas.filter(function (p) { return p.id !== id; });
    if (idEmEdicao === id) elementos.formulario.reset(); // sai do modo edição
    concluirOperacao("Remover", "Proposta removida com sucesso.");
  }

  /* Eventos */

  function lerFormulario() {
    const formulario = new FormData(elementos.formulario);
    const entrada = {};
    CAMPOS.forEach(function (campo) { entrada[campo] = formulario.get(campo) || ""; });
    return entrada;
  }

  /* Chamado ao enviar o formulário: valida e adiciona ou edita. */
  function tratarEnvio(evento) {
    evento.preventDefault();
    const acao = idEmEdicao ? "Editar" : "Adicionar";
    limparErros();

    const resultado = PautaValidacao.validarProposta(lerFormulario());
    if (resultado.valido && existeDuplicada(resultado.dados, idEmEdicao)) {
      resultado.valido = false;
      resultado.erros.titulo = "Já existe uma proposta com este título neste bairro.";
    }

    if (!resultado.valido) {
      mostrarErros(resultado.erros);
      mostrarMensagem("Confira os campos marcados em vermelho.", "erro");
      PautaAtividades.registrar(acao, "dados inválidos, nada foi salvo");
      return;
    }

    if (idEmEdicao) {
      const id = idEmEdicao;
      elementos.formulario.reset(); // também sai do modo edição
      editarProposta(id, resultado.dados);
    } else {
      elementos.formulario.reset();
      adicionarProposta(resultado.dados);
    }
  }

  /* Cliques nos botões Editar e Remover dos cartões. */
  function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    if (botao.dataset.acao === "editar") iniciarEdicao(botao.dataset.id);
    if (botao.dataset.acao === "remover") removerProposta(botao.dataset.id);
  }

  /* Começa tudo: carrega os dados, desenha a tela e liga os eventos. */
  function iniciar() {
    if (!elementos.formulario || !elementos.lista) return; // esta página não é a de propostas

    PautaAtividades.iniciar();

    const carregadas = carregarPropostas();
    if (carregadas === null) {
      propostas = [];
      mostrarMensagem(MSG_ERRO_CARREGAR, "erro");
      PautaAtividades.registrar("Carregar", "falha ao carregar os dados");
    } else {
      propostas = carregadas;
      PautaAtividades.registrar("Carregar", propostas.length + " proposta(s) carregada(s)");
    }
    renderizarLista();

    elementos.formulario.addEventListener("submit", tratarEnvio);
    elementos.formulario.addEventListener("reset", sairModoEdicao);
    elementos.formulario.addEventListener("input", function (evento) { limparErro(evento.target.name); });
    elementos.botaoCancelar.addEventListener("click", function () { elementos.formulario.reset(); });
    elementos.lista.addEventListener("click", tratarCliqueNaLista);
  }

  iniciar();
})();