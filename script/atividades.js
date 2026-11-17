"use strict";

const PautaAtividades = (function () {
    const MAXIMO_DE_REGISTROS = 50; // evita o painel crescer sem limite
    let lista = null;

    function doisDigitos(numero) {
        return String(numero).padStart(2, "0");
    }

    /* Formata uma data como dd/mm/aaaa hh:mm */
    function formatarDataHora(data) {
        return doisDigitos(data.getDate()) + "/" + doisDigitos(data.getMonth() + 1) + "/" +
            data.getFullYear() + " " + doisDigitos(data.getHours()) + ":" + doisDigitos(data.getMinutes());
    }

    function criarItemVazio() {
        const item = document.createElement("li");
        item.className = "log-vazio";
        item.textContent = "Nenhuma atividade registrada ainda.";
        return item;
    }

    /* Prepara o painel (remove o exemplo do HTML). */
    function iniciar() {
        lista = document.getElementById("log-atividades");
        if (lista) lista.replaceChildren(criarItemVazio());
    }

    /*
      Adiciona uma linha no topo do painel.
      @param {string} acao - o que foi feito (ex.: "Adicionar")
      @param {string} resultado - como terminou (ex.: "Proposta adicionada com sucesso")
     */
    function registrar(acao, resultado) {
        if (!lista) iniciar();
        if (!lista) return; // página sem painel

        const agora = new Date();
        const vazio = lista.querySelector(".log-vazio");
        if (vazio) vazio.remove();

        const horario = document.createElement("time");
        horario.dateTime = agora.toISOString();
        horario.textContent = formatarDataHora(agora);

        const nomeAcao = document.createElement("span");
        nomeAcao.className = "log-acao";
        nomeAcao.textContent = acao;

        const item = document.createElement("li");
        item.append(horario, " — ", nomeAcao, " — ", resultado); // textos entram como texto, nunca como HTML
        lista.prepend(item);

        while (lista.children.length > MAXIMO_DE_REGISTROS) lista.lastElementChild.remove();
    }

    return { iniciar: iniciar, registrar: registrar };
})();
