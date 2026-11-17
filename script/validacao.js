"use strict";

const PautaValidacao = (function () {
    // Listas permitidas (devem ser iguais às opções do formulário em propostas.html)
    const BAIRROS = ["Centro", "Jardim das Flores", "Vila Nova", "Parque Industrial"];
    const CATEGORIAS = ["Iluminação", "Praças e áreas verdes", "Calçadas e ruas", "Transporte", "Outro"];

    const LIMITES = { apelidoMax: 20, tituloMin: 5, tituloMax: 60, descricaoMin: 10, descricaoMax: 300 };

    // Apelido: só letras (com acento), números e espaço
    const PADRAO_APELIDO = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]+$/;
    // Caracteres usados para injetar código (XSS)
    const PADRAO_CARACTERES_PERIGOSOS = /[<>{}\\]/;
    // 8 ou mais dígitos seguidos (telefone, CPF...): evita dados pessoais (LGPD)
    const PADRAO_NUMERO_LONGO = /\d(?:[ .\-()]*\d){7,}/;

    /* Remove espaços sobrando no começo, no fim e repetidos. Garante tipo texto. */
    function limparTexto(valor) {
        if (typeof valor !== "string") return "";
        return valor.replace(/[ \t]+/g, " ").trim();
    }

    /* Retorna a mensagem de erro se o texto tiver conteúdo inseguro; senão, "". */
    function verificarConteudoSeguro(texto) {
        if (PADRAO_CARACTERES_PERIGOSOS.test(texto)) {
            return "Use apenas letras, números e pontuação simples.";
        }
        if (PADRAO_NUMERO_LONGO.test(texto)) {
            return "Não escreva telefone, CPF ou outros números de documentos.";
        }
        return "";
    }

    /* Valida um texto obrigatório com tamanho mínimo e máximo. */
    function validarTexto(valor, regras) {
        if (valor.length === 0) return regras.vazio;
        if (valor.length < regras.min) return regras.curto;
        if (valor.length > regras.max) return regras.longo;
        return verificarConteudoSeguro(valor);
    }

    function validarApelido(valor) {
        if (valor.length === 0) return ""; // campo opcional
        if (valor.length > LIMITES.apelidoMax) return "O apelido pode ter no máximo 20 letras.";
        if (!PADRAO_APELIDO.test(valor)) return "No apelido, use apenas letras e números.";
        return verificarConteudoSeguro(valor);
    }

    function validarEscolha(valor, listaPermitida, mensagem) {
        return listaPermitida.includes(valor) ? "" : mensagem;
    }

    function validarTitulo(valor) {
        return validarTexto(valor, {
            min: LIMITES.tituloMin, max: LIMITES.tituloMax,
            vazio: "Escreva um título para a sua ideia.",
            curto: "O título precisa ter pelo menos 5 letras.",
            longo: "O título pode ter no máximo 60 letras."
        });
    }

    function validarDescricao(valor) {
        return validarTexto(valor, {
            min: LIMITES.descricaoMin, max: LIMITES.descricaoMax,
            vazio: "Explique a sua ideia.",
            curto: "A explicação precisa ter pelo menos 10 letras.",
            longo: "A explicação pode ter no máximo 300 letras."
        });
    }

    /*
    Valida todos os campos da proposta.
    @param {object} entrada - valores brutos digitados pelo usuário
    @returns {{valido: boolean, erros: object, dados: object}}
    erros: mensagem por campo | dados: valores já limpos
     */
    function validarProposta(entrada) {
        const origem = entrada || {};
        const dados = {
            apelido: limparTexto(origem.apelido),
            bairro: limparTexto(origem.bairro),
            categoria: limparTexto(origem.categoria),
            titulo: limparTexto(origem.titulo),
            descricao: limparTexto(origem.descricao)
        };

        const mensagens = {
            apelido: validarApelido(dados.apelido),
            bairro: validarEscolha(dados.bairro, BAIRROS, "Escolha o seu bairro na lista."),
            categoria: validarEscolha(dados.categoria, CATEGORIAS, "Escolha o assunto na lista."),
            titulo: validarTitulo(dados.titulo),
            descricao: validarDescricao(dados.descricao)
        };

        // Guarda só os campos que tiveram erro
        const erros = {};
        Object.keys(mensagens).forEach(function (campo) {
            if (mensagens[campo]) erros[campo] = mensagens[campo];
        });

        return { valido: Object.keys(erros).length === 0, erros: erros, dados: dados };
    }

    return { validarProposta: validarProposta };
})();
