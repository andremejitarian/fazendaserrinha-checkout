document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('estadiaForm');

    // URL da webhook do n8n (apenas para envio final)
    const WEBHOOK_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/7a993f54-3b5d-4151-911e-f2e8c6d89e57';

    // ===== VARIÁVEIS GLOBAIS =====
    let dadosPoliticas = {};
    let dadosProjetos = {};

    // ===== CONFIGURAÇÃO DAS TAXAS DE PAGAMENTO =====

    const taxasPagamento = {
        cartao: {
            1: { nome: 'Cartão - À vista', taxaFixa: 0.00, taxaPercentual: 0.04 },
            6: { nome: 'Cartão - até 6 parcelas sem juros', taxaFixa: 0.00, taxaPercentual: 0.00 }
        },
        pix: {
            1: { nome: 'PIX - À vista', taxaFixa: 0.00, taxaPercentual: 0.08 },
            A: { nome: 'PIX - Opção A', taxaFixa: 0.00, taxaPercentual: 0.08 }
        }
    };

    // ===== FUNÇÃO PARA OBTER FORMAS DE PAGAMENTO PERMITIDAS =====
    function obterFormasPagamentoPermitidas(projeto) {
        // Ler do arquivo projeto.json carregado
        if (dadosProjetos.projetos && dadosProjetos.projetos[projeto] && dadosProjetos.projetos[projeto].formas_pagamento_permitidas) {
            return dadosProjetos.projetos[projeto].formas_pagamento_permitidas;
        }
        
        // Fallback caso não encontre no JSON
        console.warn(`Formas de pagamento não encontradas para o projeto: ${projeto}. Usando valor padrão: todas.`);
        return ["cartao", "pix", "pix_antecipado", "pix_sinal"];
    }

    // ===== CARREGAMENTO DE DADOS =====
    async function carregarPoliticas() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/andremejitarian/fazendaserrinha-checkout/main/politica_cancelamento.json');
            dadosPoliticas = await response.json();
            console.log('Políticas carregadas:', dadosPoliticas);
        } catch (error) {
            console.error('Erro ao carregar políticas:', error);
            // Fallback com políticas padrão
            dadosPoliticas = {
                "politicas": {
                    "1": {
                        "titulo": "Política de Cancelamento - PIX Antecipado",
                        "texto": "⚠️ **Atenção**: Pagamentos antecipados via PIX não são reembolsáveis. Em caso de cancelamento, será emitido um voucher válido por 12 meses para uso em futuras estadias.",
                        "aplicavel_para": ["pix_antecipado"]
                    },
                    "2": {
                        "titulo": "Política de Cancelamento -- PIX Sinal",
                        "texto": "📋 Em caso de cancelamento da participação, a restituição de valores seguirá os seguintes critérios: Restituição integral, desde que comunicado com antecedência mínima de 30 dias antes do início da data de estadia. Restituição de 50%, desde que comunicado até 15 dias antes do início da data de estadia. Para os outros casos, não haverá restituição.",
                        "aplicavel_para": ["pix_sinal"]
                    },
                    "3": {
                        "titulo": "Política de Cancelamento - Outras Formas",
                        "texto": "🔄 **Cancelamento Flexível**: Cancelamentos até 7 dias antes da chegada: reembolso integral. Entre 3-7 dias: reembolso de 50%. Menos de 3 dias: sem reembolso, mas possibilidade de reagendamento.",
                        "aplicavel_para": ["cartao", "pix_1", "outras"]
                    }
                }
            };
        }
    }

    async function carregarProjetos() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/andremejitarian/fazendaserrinha-checkout/main/projeto.json');
            dadosProjetos = await response.json();
            console.log('Dados de projetos carregados:', dadosProjetos);
            preencherProjetos();
        } catch (error) {
            console.error('Erro ao carregar projetos:', error);
            // Fallback com projetos padrão
            dadosProjetos = {
                "projetos": {
                    "fazenda_serrinha": {
                        "nome": "Fazenda Serrinha",
                        "formas_pagamento_permitidas": ["cartao", "pix", "pix_antecipado", "pix_sinal"],
                        "descricao": "Projeto principal da fazenda com todas as opções de pagamento"
                    }
                }
            };
            preencherProjetos();
        }
    }

    function preencherProjetos() {
        const projetoSelect = document.getElementById('projeto');
        projetoSelect.innerHTML = '<option value="">Selecione um projeto</option>';
        
        if (dadosProjetos.projetos) {
            Object.entries(dadosProjetos.projetos).forEach(([key, projeto]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = projeto.nome;
                option.title = projeto.descricao;
                projetoSelect.appendChild(option);
            });
        }
    }

    // ===== FUNÇÃO PARA OBTER PROJETO + NOME COMBINADOS =====
    function getProjetoCompleto() {
        const projetoSelecionado = document.getElementById('projeto').value;
        
        if (!projetoSelecionado) {
            return '';
        }
        
        // Buscar o nome do projeto
        let nomeProjeto = '';
        if (dadosProjetos.projetos && dadosProjetos.projetos[projetoSelecionado]) {
            nomeProjeto = dadosProjetos.projetos[projetoSelecionado].nome;
        }
        
        // Retornar nome do projeto
        if (nomeProjeto) {
            return nomeProjeto;
        }
        
        return '';
    }

    // ===== FUNÇÕES DE POLÍTICA DE CANCELAMENTO =====

    // NOVA FUNÇÃO: Determinar qual política aplicar
    function determinarPolitica(formaPagamento) {
        if (!dadosPoliticas || !formaPagamento) {
            return null;
        }
        
        // Ler do arquivo politica_cancelamento.json carregado
        if (dadosPoliticas.politicas) {
            // Regras conforme especificado
            if (formaPagamento === 'pix_antecipado') {
                return dadosPoliticas.politicas['1'];
            } else if (formaPagamento === 'pix_sinal') {
                return dadosPoliticas.politicas['2'];
            } else if (formaPagamento === 'pix_1') {
                return dadosPoliticas.politicas['3'];
            } else if (formaPagamento === 'cartao_1') {
                return dadosPoliticas.politicas['4'];
            } else if (formaPagamento === 'cartao_6') {
                return dadosPoliticas.politicas['5'];
            } else {
                // Todas as outras formas de pagamento
                return dadosPoliticas.politicas['6'];
            }
        }
        
        // Fallback caso não encontre no JSON
        console.warn(`Política não encontrada para a forma de pagamento: ${formaPagamento}. Usando política padrão.`);
        return null;
    }

    // NOVA FUNÇÃO: Exibir política de cancelamento
    function exibirPoliticaCancelamento(formaPagamento) {
        const container = document.getElementById('politicaCancelamento');
        const titulo = document.getElementById('politicaTitulo');
        const texto = document.getElementById('politicaTexto');
        
        if (!container || !titulo || !texto) {
            console.warn('⚠️ Elementos da política de cancelamento não encontrados');
            return;
        }
        
        if (!formaPagamento) {
            // Esconde a política se não há forma de pagamento selecionada
            container.style.display = 'none';
            container.classList.remove('show');
            return;
        }
        
        const politica = determinarPolitica(formaPagamento);
        
        if (!politica) {
            console.warn('⚠️ Política não encontrada para:', formaPagamento);
            container.style.display = 'none';
            container.classList.remove('show');
            return;
        }
        
        // Atualiza o conteúdo
        titulo.textContent = politica.titulo;
        
        // Converte markdown básico para HTML
        let textoHTML = politica.texto
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **texto** -> <strong>texto</strong>
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // *texto* -> <em>texto</em>
            .replace(/\n/g, '<br>'); // quebras de linha
        
        texto.innerHTML = textoHTML;
        
        // Mostra a política com animação
        container.style.display = 'block';
        
        // Pequeno delay para garantir que o display seja aplicado antes da animação
        setTimeout(() => {
            container.classList.add('show');
        }, 10);
        
        console.log(`📋 Política exibida: ${politica.titulo} para ${formaPagamento}`);
    }

    // ===== FUNÇÕES DE CÁLCULO DE TAXAS =====

    // Função para calcular o valor com taxas
    function calcularValorComTaxas(valorLiquido, tipo, parcelas) {
        if (!tipo || !parcelas || !taxasPagamento[tipo] || !taxasPagamento[tipo][parcelas]) {
            return null;
        }

        const taxa = taxasPagamento[tipo][parcelas];
        const valorNumerico = parseFloat(valorLiquido) || 0;

        if (valorNumerico <= 0) {
            return null;
        }

        // Fórmula: V_bruto = (V_liquido + T_fixa) / (1 - P_percentual)
        const valorBrutoOriginal = (valorNumerico + taxa.taxaFixa) * (1 - taxa.taxaPercentual);

        // --- INÍCIO DA NOVA CORREÇÃO DE ARREDONDAMENTO (todas as parcelas arredondadas para cima) ---

        // 1. Calcular o valor de cada parcela sem arredondamento
        const valorPorParcelaRaw = valorBrutoOriginal / parcelas;

        // 2. Arredondar o valor de CADA parcela para baixo, para 2 casas decimais
        // Ex: 185.61857... -> 185.62
        const valorPorParcela = Math.floor(valorPorParcelaRaw * 100) / 100;

        // 3. O valor total agora será o valor da parcela arredondado para cima multiplicado pelo número de parcelas
        // Isso garante que (parcela * quantidade) = total exibido
        const valorBrutoTotalCorrigido = parseFloat((valorPorParcela * parcelas).toFixed(2));

        // --- FIM DA NOVA CORREÇÃO DE ARREDONDAMENTO ---

        console.log(`💰 Cálculo de taxa:`, {
            valorLiquido: valorNumerico,
            tipo: tipo,
            parcelas: parcelas,
            formaPagamento: taxa.nome,
            taxaFixa: taxa.taxaFixa,
            taxaPercentual: (taxa.taxaPercentual * 100).toFixed(2) + '%',
            valorBrutoOriginal: valorBrutoOriginal.toFixed(2), // Valor bruto calculado antes de ajustar parcelas
            valorPorParcelaExibido: valorPorParcela.toFixed(2), // Valor de cada parcela exibido (arredondado para cima)
            valorBrutoTotalCorrigido: valorBrutoTotalCorrigido.toFixed(2) // O novo valor total para exibição
        });

        return {
            total: valorBrutoTotalCorrigido, // O valor total agora reflete a soma das parcelas arredondadas para cima
            porParcela: valorPorParcela, // O valor de cada parcela (arredondado para cima)
            taxa: taxa
        };
    }

    // Função para formatar valor para moeda
    function formatarParaMoeda(valor) {
        if (!valor || isNaN(valor)) return '';

        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    // Função para extrair valor numérico do campo formatado
    function extrairValorNumerico(valorFormatado) {
        if (!valorFormatado) return 0;

        // Remove R\$, espaços, pontos (milhares) e converte vírgula para ponto
        let valor = valorFormatado
            .replace(/R\$\s?/g, '')
            .replace(/\./g, '')
            .replace(',', '.');

        return parseFloat(valor) || 0;
    }

    // NOVO: Função auxiliar para obter o nome amigável do tipo de pagamento
    function getPaymentTypeName(tipo) {
        if (tipo === 'cartao') {
            return 'Cartão';
        } else if (tipo === 'pix') {
            return 'PIX';
        }
        return ''; // Retorna vazio se o tipo não for reconhecido
    }

    // NOVA FUNÇÃO: Verificar se a data de chegada permite pagamento antecipado
    function permitePagamentoAntecipado() {
        const dataChegada = document.getElementById('dataChegada').value;
        if (!dataChegada) return false;

        const hoje = new Date();
        const chegada = new Date(dataChegada);
        const diferenca = chegada.getTime() - hoje.getTime();
        const diasDiferenca = Math.ceil(diferenca / (1000 * 3600 * 24));

        return diasDiferenca >= 30;
    }

    // NOVA FUNÇÃO: Verificar se a data de chegada permite pagamento PIX à vista
    function permitePagamentoPIXVista() {
        const dataChegada = document.getElementById('dataChegada').value;
        if (!dataChegada) return true; // Se não há data, permite por padrão

        const hoje = new Date();
        const chegada = new Date(dataChegada);
        const diferenca = chegada.getTime() - hoje.getTime();
        const diasDiferenca = Math.ceil(diferenca / (1000 * 3600 * 24));

        return diasDiferenca < 30; // Permite PIX à vista apenas se for MENOS de 30 dias
    }

    // ===== LÓGICA DE PAGAMENTO =====
    function atualizarFormaPagamento() {
        const projetoSelecionado = document.getElementById('projeto').value;
        const formaPagamentoSelect = document.getElementById('formaPagamento');
        
        if (!projetoSelecionado) {
            // Se não há projeto selecionado, limpa e desabilita
            formaPagamentoSelect.value = '';
            formaPagamentoSelect.innerHTML = '<option value="" disabled selected>Selecione um projeto primeiro</option>';
            return;
        }
        
        // Regenera as opções baseadas no projeto
        gerarOpcoesDropdown();
    }

    // Função para gerar opções do dropdown dinamicamente (MODIFICADA)
    function gerarOpcoesDropdown() {
        const campoValor = document.getElementById('valor');
        const campoProjeto = document.getElementById('projeto');
        const valorLiquido = extrairValorNumerico(campoValor.value);
        const projetoSelecionado = campoProjeto.value;

        const optgroupCartao = document.getElementById('optgroup-cartao');
        const optgroupPix = document.getElementById('optgroup-pix');

        // Limpa opções existentes
        optgroupCartao.innerHTML = '';
        optgroupPix.innerHTML = '';

        // NOVA VALIDAÇÃO: Verifica se projeto foi selecionado
        if (!projetoSelecionado) {
            optgroupCartao.innerHTML = '<option value="" disabled>Selecione um projeto primeiro</option>';
            optgroupPix.innerHTML = '<option value="" disabled>Selecione um projeto primeiro</option>';
            return;
        }

        if (valorLiquido <= 0) {
            optgroupCartao.innerHTML = '<option value="" disabled>Informe um valor primeiro</option>';
            optgroupPix.innerHTML = '<option value="" disabled>Informe um valor primeiro</option>';
            return;
        }

        // NOVA LÓGICA: Obter formas de pagamento permitidas para o projeto
        const formasPermitidas = obterFormasPagamentoPermitidas(projetoSelecionado);
        console.log(`🏗️ Formas de pagamento permitidas para ${projetoSelecionado}:`, formasPermitidas);

        // Gera opções para Cartão (apenas se permitido)
        if (formasPermitidas.includes('cartao')) {
            for (let parcelas = 1; parcelas <= 12; parcelas++) {
                const calculo = calcularValorComTaxas(valorLiquido, 'cartao', parcelas);
                if (calculo) {
                    const option = document.createElement('option');
                    option.value = `cartao_${parcelas}`;

                    const tipoPagamento = getPaymentTypeName('cartao');
                    if (parcelas === 1) {
                        option.textContent = `À vista no ${tipoPagamento} - ${formatarParaMoeda(calculo.total)}`;
                    } else {
                        option.textContent = `Até ${parcelas} parcelas sem juros no ${tipoPagamento} - ${formatarParaMoeda(calculo.porParcela)}/mês (Total: ${formatarParaMoeda(calculo.total)})`;
                    }

                    optgroupCartao.appendChild(option);
                }
            }
        } else {
            optgroupCartao.innerHTML = '<option value="" disabled>Não disponível para este projeto</option>';
        }

        // Gera opções para PIX (apenas as permitidas)
        let pixAdicionado = false;

        // PIX à vista (apenas se permitido)
        if (formasPermitidas.includes('pix') && permitePagamentoPIXVista()) {
            const calculo = calcularValorComTaxas(valorLiquido, 'pix', 1);
            if (calculo) {
                const option = document.createElement('option');
                option.value = 'pix_1';
                option.textContent = `À vista no PIX - ${formatarParaMoeda(calculo.total)}`;
                optgroupPix.appendChild(option);
                pixAdicionado = true;
            }
        }

        // PIX parcelado (2 e 3 parcelas, apenas se PIX for permitido)
        if (formasPermitidas.includes('pix')) {
            for (let parcelas = 2; parcelas <= 3; parcelas++) {
                const calculo = calcularValorComTaxas(valorLiquido, 'pix', parcelas);
                if (calculo) {
                    const option = document.createElement('option');
                    option.value = `pix_${parcelas}`;
                    option.textContent = `${parcelas} parcelas no PIX - ${formatarParaMoeda(calculo.porParcela)}/mês (Total: ${formatarParaMoeda(calculo.total)})`;
                    optgroupPix.appendChild(option);
                    pixAdicionado = true;
                }
            }
        }

        // PIX Antecipado (apenas se permitido)
        if (formasPermitidas.includes('pix_antecipado') && permitePagamentoAntecipado()) {
            const valorComDesconto = valorLiquido * 0.87;
            const option1 = document.createElement('option');
            option1.value = 'pix_antecipado';
            option1.textContent = `PIX Antecipado - ${formatarParaMoeda(valorComDesconto)}`;
            optgroupPix.appendChild(option1);
            pixAdicionado = true;
        }

        // PIX Sinal (apenas se permitido)
        if (formasPermitidas.includes('pix_sinal')) {
            const valorSinal = valorLiquido * 0.30 * 0.92;
            const valorRestante = valorLiquido * 0.70 * 0.92;
            const option2 = document.createElement('option');
            option2.value = 'pix_sinal';
            option2.textContent = `PIX Sinal - 30% agora (${formatarParaMoeda(valorSinal)}) + 70% no check-out (${formatarParaMoeda(valorRestante)}) (Total: ${formatarParaMoeda(valorLiquido * 0.92)})`;
            optgroupPix.appendChild(option2);
            pixAdicionado = true;
        }

        // Se nenhuma opção PIX foi adicionada
        if (!pixAdicionado) {
            optgroupPix.innerHTML = '<option value="" disabled>Não disponível para este projeto</option>';
        }
    }

    // Função para atualizar o valor calculado
    function atualizarValorCalculado() {
        const campoValor = document.getElementById('valor');
        const campoFormaPagamento = document.getElementById('formaPagamento');
        const campoValorCalculado = document.getElementById('valorCalculado');

        if (!campoValor || !campoFormaPagamento || !campoValorCalculado) {
            console.warn('⚠️ Campos necessários não encontrados');
            return;
        }

        const valorLiquido = extrairValorNumerico(campoValor.value);
        const formaPagamento = campoFormaPagamento.value;

        console.log(`🔄 Atualizando cálculo - Valor: ${valorLiquido}, Forma: ${formaPagamento}`);

        if (!formaPagamento) {
            campoValorCalculado.value = '';
            campoValorCalculado.placeholder = 'Selecione uma forma de pagamento';
            
            // NOVO: Esconde a política quando não há forma de pagamento
            exibirPoliticaCancelamento(null);
            return;
        }

        if (valorLiquido <= 0) {
            campoValorCalculado.value = '';
            campoValorCalculado.placeholder = 'Informe um valor válido';
            
            // NOVO: Esconde a política quando não há valor válido
            exibirPoliticaCancelamento(null);
            return;
        }

        // NOVA LÓGICA: Verificar se é uma das novas formas de pagamento
        if (formaPagamento === 'pix_antecipado') {
            const valorComDesconto = valorLiquido * 0.87;
            campoValorCalculado.value = formatarParaMoeda(valorComDesconto);
            campoValorCalculado.placeholder = '';
            
            // NOVO: Exibe a política de cancelamento correspondente
            exibirPoliticaCancelamento(formaPagamento);
            return;
        }

        if (formaPagamento === 'pix_sinal') {
            campoValorCalculado.value = formatarParaMoeda(valorLiquido * 0.92);
            campoValorCalculado.placeholder = '';
            
            // NOVO: Exibe a política de cancelamento correspondente
            exibirPoliticaCancelamento(formaPagamento);
            return;
        }

        // Parse da forma de pagamento selecionada (lógica original)
        const [tipo, parcelas] = formaPagamento.split('_');
        const calculo = calcularValorComTaxas(valorLiquido, tipo, parseInt(parcelas));

        if (calculo) {
            campoValorCalculado.value = formatarParaMoeda(calculo.total);
            campoValorCalculado.placeholder = '';

            // Mostra diferença se houver taxa
            if (calculo.total > valorLiquido) {
                const diferenca = calculo.total - valorLiquido;
                console.log(`💡 Taxa aplicada: ${formatarParaMoeda(diferenca)}`);
            }
        } else {
            campoValorCalculado.value = '';
            campoValorCalculado.placeholder = 'Erro no cálculo';
        }

        // NOVO: Exibe a política de cancelamento correspondente
        exibirPoliticaCancelamento(formaPagamento);
    }

    // Função para obter dados da forma de pagamento selecionada
    function obterDadosFormaPagamento(formaPagamento) {
        if (!formaPagamento) return null;

        // NOVA LÓGICA: Verificar se é uma das novas formas de pagamento
        if (formaPagamento === 'pix_antecipado') {
            return {
                tipo: 'pix_antecipado',
                parcelas: 1,
                nome: 'PIX Antecipado',
                taxa: { taxaFixa: 0, taxaPercentual: 0 }
            };
        }

        if (formaPagamento === 'pix_sinal') {
            return {
                tipo: 'pix_sinal',
                parcelas: 1,
                nome: 'PIX Sinal - 30% + 70% no check-out',
                taxa: { taxaFixa: 0, taxaPercentual: 0 }
            };
        }

        // Lógica original para outras formas de pagamento
        const [tipo, parcelas] = formaPagamento.split('_');
        const parcelasNum = parseInt(parcelas);

        if (taxasPagamento[tipo] && taxasPagamento[tipo][parcelasNum]) {
            return {
                tipo: tipo,
                parcelas: parcelasNum,
                nome: taxasPagamento[tipo][parcelasNum].nome,
                taxa: taxasPagamento[tipo][parcelasNum]
            };
        }

        return null;
    }

    // ===== PREENCHIMENTO VIA URL =====

    // Função para extrair parâmetros da URL
    function obterParametrosURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const parametros = {};

        // Lista de parâmetros suportados e seus campos correspondentes
        const mapeamentoParametros = {
            'nome': 'nomeCompleto',
            'cpf': 'cpf',
            'email': 'email',
            'celular': 'celular',
            'evento': 'nomeEvento',
            'projeto': 'projeto', // NOVO PARÂMETRO
            'valor': 'valor',
            'pagamento': 'formaPagamento',
            'chegada': 'dataChegada',
            'saida': 'dataSaida'
        };

        // Extrai todos os parâmetros da URL
        for (const [parametroURL, campoFormulario] of Object.entries(mapeamentoParametros)) {
            if (urlParams.has(parametroURL)) {
                parametros[campoFormulario] = urlParams.get(parametroURL);
            }
        }

        console.log('🔍 Parâmetros encontrados na URL:', parametros);
        return parametros;
    }

    // ===== FUNÇÃO PARA BLOQUEAR CAMPOS =====
    function bloquearCampo(elemento, motivo = 'Campo preenchido automaticamente') {
        if (elemento) {
            elemento.readOnly = true;
            elemento.disabled = true;
            elemento.style.backgroundColor = '#f5f5f5';
            elemento.style.color = '#666';
            elemento.style.cursor = 'not-allowed';
            elemento.title = motivo;
            
            // Adiciona uma classe para identificação visual
            elemento.classList.add('campo-bloqueado');
            
            console.log(`🔒 Campo '${elemento.id}' foi bloqueado: ${motivo}`);
        }
    }

    // Função para preencher os campos do formulário
    function preencherCamposViaURL() {
        const parametros = obterParametrosURL();

        // Se não há parâmetros, não faz nada
        if (Object.keys(parametros).length === 0) {
            console.log('ℹ️ Nenhum parâmetro encontrado na URL');
            return;
        }

        console.log('🚀 Preenchendo campos automaticamente...');

        // Preenche cada campo encontrado
        Object.entries(parametros).forEach(([campo, valor]) => {
            const elemento = document.getElementById(campo);

            if (elemento) {
                // Decodifica o valor (para caracteres especiais)
                const valorDecodificado = decodeURIComponent(valor);

                // Tratamento especial para diferentes tipos de campo
                switch (campo) {
                    case 'cpf':
                        // Remove formatação e aplica máscara
                        const cpfLimpo = valorDecodificado.replace(/\D/g, '');
                        elemento.value = cpfLimpo;
                        // Dispara evento para aplicar máscara
                        elemento.dispatchEvent(new Event('input'));
                        break;

                    case 'celular':
                        // Remove formatação e aplica máscara
                        const celularLimpo = valorDecodificado.replace(/\D/g, '');
                        elemento.value = celularLimpo;
                        // Dispara evento para aplicar máscara
                        elemento.dispatchEvent(new Event('input'));
                        break;

                    case 'valor':
                        console.log(`🔍 Processando valor da URL: "${valorDecodificado}"`);

                        // Se o valor já tem R\$, usa diretamente
                        if (valorDecodificado.includes('R\$')) {
                            elemento.value = valorDecodificado;
                            console.log(`✅ Valor com R\$ aplicado diretamente: ${valorDecodificado}`);
                        } else {
                            // Converte valor numérico para formato monetário brasileiro
                            let valorNumerico = parseFloat(valorDecodificado.replace(',', '.')) || 0;
                            console.log(`🔢 Valor numérico extraído: ${valorNumerico}`);

                            // Formata para moeda brasileira
                            const valorFormatado = valorNumerico.toFixed(2)
                                .replace('.', ',')
                                .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

                            const valorFinal = 'R\$ ' + valorFormatado;
                            elemento.value = valorFinal;
                            console.log(`💰 Valor formatado final: ${valorFinal}`);
                        }
                        
                        // BLOQUEIA O CAMPO DE VALOR
                        bloquearCampo(elemento, 'Valor definido via URL - não pode ser alterado');
                        break;

                    case 'nomeEvento':
                        elemento.value = valorDecodificado;
                        
                        // BLOQUEIA O CAMPO DO NOME DO EVENTO
                        bloquearCampo(elemento, 'Nome do evento definido via URL - não pode ser alterado');
                        break;

                    case 'projeto':
                        // Valida se o projeto existe no JSON carregado
                        if (dadosProjetos.projetos && dadosProjetos.projetos[valorDecodificado]) {
                            elemento.value = valorDecodificado;
                            console.log(`🏗️ Projeto selecionado: ${valorDecodificado}`);

                        // NOVO: BLOQUEIA O CAMPO DO PROJETO
                        bloquearCampo(elemento, 'Projeto definido via URL - não pode ser alterado');
                        break;
                            
                            // Dispara evento para atualizar formas de pagamento
                            elemento.dispatchEvent(new Event('change'));
                        } else {
                            console.warn(`⚠️ Projeto inválido: ${valorDecodificado}`);
                        }
                        break;

                    case 'formaPagamento':
                        // Valida se a forma de pagamento existe no novo formato
                        const [tipoPagamento, numParcelas] = valorDecodificado.split('_');
                        if (taxasPagamento[tipoPagamento] && taxasPagamento[tipoPagamento][parseInt(numParcelas)]) {
                            elemento.value = valorDecodificado;
                            console.log(`💳 Forma de pagamento selecionada: ${valorDecodificado}`);
                        } else {
                            console.warn(`⚠️ Forma de pagamento inválida: ${valorDecodificado}`);
                        }
                        break;

                    case 'dataChegada':
                    case 'dataSaida':
                        // Converte diferentes formatos de data para YYYY-MM-DD
                        const dataFormatada = formatarDataParaInput(valorDecodificado);
                        if (dataFormatada) {
                            elemento.value = dataFormatada;
                        }
                        break;

                    default:
                        // Para campos de texto simples
                        elemento.value = valorDecodificado;
                        break;
                }

                console.log(`✅ Campo '${campo}' preenchido com: '${valorDecodificado}'`);

                // Adiciona uma classe visual para indicar preenchimento automático
                elemento.classList.add('preenchido-automaticamente');

            } else {
                console.warn(`⚠️ Campo '${campo}' não encontrado no formulário`);
            }
        });

        // Atualiza o cálculo após preencher os campos
        setTimeout(() => {
            // Garante que as opções do dropdown sejam geradas após o valor ser preenchido
            gerarOpcoesDropdown();
            atualizarValorCalculado();
        }, 100);
    }

    // Função auxiliar para formatar datas
    function formatarDataParaInput(dataString) {
        try {
            // Tenta diferentes formatos de data
            let data;

            // Formato: DD/MM/YYYY ou DD-MM-YYYY
            if (dataString.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
                const partes = dataString.split(/[\/\-]/);
                data = new Date(partes[2], partes[1] - 1, partes[0]);
            }
            // Formato: YYYY-MM-DD (já correto)
            else if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dataString;
            }
            // Formato: DD/MM/YY
            else if (dataString.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{2}$/)) {
                const partes = dataString.split(/[\/\-]/);
                const ano = parseInt(partes[2]) + (parseInt(partes[2]) > 50 ? 1900 : 2000);
                data = new Date(ano, partes[1] - 1, partes[0]);
            } else {
                // Tenta parsing direto
                data = new Date(dataString);
            }

            // Verifica se a data é válida
            if (isNaN(data.getTime())) {
                console.warn(`⚠️ Data inválida: ${dataString}`);
                return null;
            }

            // Retorna no formato YYYY-MM-DD
            return data.toISOString().split('T')[0];

        } catch (error) {
            console.warn(`⚠️ Erro ao formatar data '${dataString}':`, error);
            return null;
        }
    }

    // Executa o preenchimento automático quando a página carrega
    preencherCamposViaURL();

    // ===== NAVEGAÇÃO ENTRE TELAS =====

    // Função para mostrar a tela do formulário
    window.showFormScreen = function() {
        document.getElementById('welcomeScreen').classList.remove('active');
        document.getElementById('formScreen').classList.add('active');
    }

    // Função para mostrar a tela de boas-vindas
    window.showWelcomeScreen = function() {
        document.getElementById('formScreen').classList.remove('active');
        document.getElementById('welcomeScreen').classList.add('active');
    }

    // NOVA FUNÇÃO: Mostrar a tela de pagamento
    window.showPaymentScreen = function(paymentUrl) {
        // Esconde todas as outras telas
        document.getElementById('welcomeScreen').classList.remove('active');
        document.getElementById('formScreen').classList.remove('active');
        
        // Mostra a tela de pagamento
        document.getElementById('paymentScreen').classList.add('active');
        
        // Atualiza o link do botão de pagamento
        const paymentButton = document.getElementById('paymentButton');
        if (paymentButton && paymentUrl) {
            paymentButton.href = paymentUrl;
            console.log('🔗 Link de pagamento configurado:', paymentUrl);
        }
    }

    // NOVA FUNÇÃO: Voltar para o início (reiniciar processo)
    window.restartProcess = function() {
        // Limpa o formulário
        form.reset();
        document.getElementById('valorCalculado').value = '';
        document.getElementById('valorCalculado').placeholder = 'Selecione uma forma de pagamento';
        
        // NOVO: Redefine o projeto para estado inicial
        document.getElementById('projeto').value = '';
        
        // Limpa as opções do dropdown
        document.getElementById('optgroup-cartao').innerHTML = '';
        document.getElementById('optgroup-pix').innerHTML = '';
        
        // NOVO: Esconde a política de cancelamento
        const container = document.getElementById('politicaCancelamento');
        if (container) {
            container.style.display = 'none';
            container.classList.remove('show');
        }
        
        // Volta para a tela inicial
        document.getElementById('paymentScreen').classList.remove('active');
        document.getElementById('formScreen').classList.remove('active');
        document.getElementById('welcomeScreen').classList.add('active');
        
        console.log('🔄 Processo reiniciado');
    }

    // ===== MÁSCARAS DE FORMATAÇÃO =====

    // Máscara para CPF
    document.getElementById('cpf').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });

    // Máscara para Celular
    document.getElementById('celular').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        if (value.length <= 10) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        e.target.value = value;
    });

    // Máscara para Valor (Moeda) - MODIFICADA para verificar se o campo está bloqueado
    document.getElementById('valor').addEventListener('input', function(e) {
        // Verifica se o campo está bloqueado
        if (e.target.classList.contains('campo-bloqueado')) {
            return; // Não aplica a máscara se o campo estiver bloqueado
        }

        let value = e.target.value.replace(/\D/g, '');
        if (!value) {
            e.target.value = '';
            gerarOpcoesDropdown(); // Chamar aqui para limpar as opções quando o valor é vazio
            atualizarValorCalculado();
            return;
        }
        value = (parseInt(value) / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        e.target.value = 'R\$ ' + value;

        // Atualiza as opções do dropdown e o valor calculado em tempo real
        gerarOpcoesDropdown(); // Adicionado aqui para recalcular as opções quando o valor muda
        atualizarValorCalculado();
    });

    document.getElementById('valor').addEventListener('blur', function(e) {
        // Verifica se o campo está bloqueado
        if (e.target.classList.contains('campo-bloqueado')) {
            return; // Não aplica a formatação se o campo estiver bloqueado
        }

        let value = e.target.value;
        if (value && !value.startsWith('R\$ ')) {
            let numericValue = value.replace(/\D/g, '');
            if (numericValue) {
                numericValue = (parseInt(numericValue) / 100).toFixed(2);
                numericValue = numericValue.replace('.', ',');
                numericValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                e.target.value = 'R\$ ' + numericValue;
            }
        }
        // Atualiza o valor calculado após perder o foco
        atualizarValorCalculado();
    });

    // Event listener para forma de pagamento
    document.getElementById('formaPagamento').addEventListener('change', function(e) {
        console.log(`💳 Forma de pagamento alterada para: ${e.target.value}`);
        atualizarValorCalculado();
    });

    // NOVO: Event listener para mudanças no projeto
    document.getElementById('projeto').addEventListener('change', function(e) {
        console.log(`🏗️ Projeto alterado para: ${e.target.value}`);
        
        // Limpa a forma de pagamento quando projeto muda
        document.getElementById('formaPagamento').value = '';
        document.getElementById('valorCalculado').value = '';
        document.getElementById('valorCalculado').placeholder = 'Selecione uma forma de pagamento';
        
        // Esconde a política de cancelamento
        exibirPoliticaCancelamento(null);
        
        // Atualiza as formas de pagamento disponíveis
        atualizarFormaPagamento();
    });

    // NOVO: Event listener para mudanças na data de chegada (para recalcular opções de pagamento)
    document.getElementById('dataChegada').addEventListener('change', function(e) {
        console.log(`📅 Data de chegada alterada para: ${e.target.value}`);
        gerarOpcoesDropdown();
        atualizarValorCalculado();
    });

    // ===== VALIDAÇÃO DE CPF LOCAL =====
    function validarCPF(cpf) {
        // Remove possíveis caracteres de formatação
        cpf = cpf.replace(/\D/g, '');

        // Verifica a quantidade de dígitos do CPF
        if (cpf.length !== 11) {
            return false;
        }

        // Verifica se todos os dígitos são iguais (casos como 111.111.111-11)
        if (/^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        // Extrai a base do CPF e os dígitos verificadores
        const base = cpf.slice(0, 9);
        const dvInformado = cpf.slice(9, 11);

        // Função para calcular cada dígito verificador
        const calcularDV = (base, pesoInicial) => {
            const soma = base.split('').reduce((accumulator, num, index) => {
                return accumulator + parseInt(num) * (pesoInicial - index);
            }, 0);

            const resto = soma % 11;
            return (resto < 2) ? '0' : String(11 - resto);
        };

        // Cálculo do primeiro dígito verificador
        const dv1 = calcularDV(base, 10);

        // Cálculo do segundo dígito verificador (utilizando a base + primeiro dígito verificador)
        const dv2 = calcularDV(base + dv1, 11);

        // Retorna verdadeiro se o CPF informado é igual ao calculado
        return dv1 + dv2 === dvInformado;
    }

    // ===== FUNÇÕES AUXILIARES =====

    function converterValorParaNumero(valorFormatado) {
        if (!valorFormatado) return 0;
        let valor = valorFormatado.replace(/R\$\s?/g, '').replace(/\./g, '');
        valor = valor.replace(',', '.');
        return parseFloat(valor) || 0;
    }

    function mostrarMensagem(texto, tipo = 'sucesso') {
        const mensagemExistente = document.querySelector('.mensagem-feedback');
        if (mensagemExistente) {
            mensagemExistente.remove();
        }

        const mensagem = document.createElement('div');
        mensagem.className = `mensagem-feedback ${tipo}`;
        mensagem.innerHTML = `
            <div class="mensagem-conteudo">
                <span class="mensagem-icone">${tipo === 'sucesso' ? '✅' : '❌'}</span>
                <span class="mensagem-texto">${texto}</span>
            </div>
        `;

        document.body.appendChild(mensagem);

        setTimeout(() => {
            if (mensagem.parentNode) {
                mensagem.style.opacity = '0';
                setTimeout(() => mensagem.remove(), 300);
            }
        }, 5000);
    }

    async function enviarParaN8N(dadosFormulario) {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ...dadosFormulario,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        source: 'formulario-check-in-fazenda',
                        userAgent: navigator.userAgent,
                        url: window.location.href
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                responseData = await response.text();
            }

            console.log('✅ Sucesso - Resposta do n8n:', responseData);
            return { success: true, data: responseData };

        } catch (error) {
            console.error('❌ Erro ao enviar para n8n:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== MANIPULADOR DO FORMULÁRIO =====

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = document.querySelector('.submit-button');
        const textoOriginal = submitButton.innerHTML;

        // Ativa o loading
        submitButton.innerHTML = '<span class="loading-spinner"></span> Validando dados...';
        submitButton.disabled = true;
        submitButton.style.opacity = '0.7';

        // Coleta os dados do formulário
        const dadosFormaPagamento = obterDadosFormaPagamento(document.getElementById('formaPagamento').value);
        const valorLiquido = converterValorParaNumero(document.getElementById('valor').value);

        // NOVA LÓGICA: Calcular valorCalculadoNumerico baseado na forma de pagamento
        let valorCalculadoNumerico;
        const formaPagamento = document.getElementById('formaPagamento').value;

        if (formaPagamento === 'pix_antecipado') {
            valorCalculadoNumerico = valorLiquido * 0.95;
        } else if (formaPagamento === 'pix_sinal' || formaPagamento === 'pix_1'){
            valorCalculadoNumerico = valorLiquido * 0.98;
        } else {
            valorCalculadoNumerico = extrairValorNumerico(document.getElementById('valorCalculado').value);
        }

        // ===== ADICIONAR CAMPO COMBINADO ANTES DO ENVIO =====
        const projetoCompleto = getProjetoCompleto();
        
        const formData = {
            nomeCompleto: document.getElementById('nomeCompleto').value.trim(),
            cpf: document.getElementById('cpf').value,
            cpfLimpo: document.getElementById('cpf').value.replace(/[^\d]/g, ''),
            email: document.getElementById('email').value.trim().toLowerCase(),
            celular: document.getElementById('celular').value,
            celularLimpo: document.getElementById('celular').value.replace(/[^\d]/g, ''),
            nomeEvento: document.getElementById('nomeEvento').value.trim(),
            projeto: document.getElementById('projeto').value, // NOVO CAMPO
            projetoNome: projetoCompleto, // NOVO CAMPO
            valor: document.getElementById('valor').value,
            valorNumerico: valorLiquido,
            formaPagamento: formaPagamento,
            formaPagamentoTipo: dadosFormaPagamento?.tipo || '',
            formaPagamentoParcelas: dadosFormaPagamento?.parcelas || 0,
            formaPagamentoNome: dadosFormaPagamento?.nome || '',
            valorCalculado: document.getElementById('valorCalculado').value,
            valorCalculadoNumerico: valorCalculadoNumerico,
            dataChegada: document.getElementById('dataChegada').value,
            dataSaida: document.getElementById('dataSaida').value,
            aceitoRegulamento: document.getElementById('aceitoRegulamento').checked,
            comunicacoesFazenda: document.querySelector('input[name="comunicacoesFazenda"]:checked') ?
                document.querySelector('input[name="comunicacoesFazenda"]:checked').value : 'não informado'
        };

        function restaurarBotao() {
            submitButton.innerHTML = textoOriginal;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }

        // ===== VALIDAÇÕES =====

        // NOVA VALIDAÇÃO: Projeto obrigatório
        if (!formData.projeto) {
            restaurarBotao();
            mostrarMensagem('Por favor, selecione um projeto.', 'erro');
            return;
        }

        // Validação do regulamento
        if (!formData.aceitoRegulamento) {
            restaurarBotao();
            mostrarMensagem('Você deve aceitar o Regulamento Interno para prosseguir.', 'erro');
            return;
        }

        // Validação do CPF
        console.log('🔍 Validando CPF localmente:', formData.cpfLimpo);
        if (!validarCPF(formData.cpf)) {
            restaurarBotao();
            mostrarMensagem('❌ CPF inválido. Por favor, verifique e digite um CPF válido.', 'erro');
            return;
        }
        console.log('✅ CPF válido!');

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            restaurarBotao();
            mostrarMensagem('Por favor, insira um email válido.', 'erro');
            return;
        }

        // Validação de celular (mínimo 10 dígitos)
        if (formData.celularLimpo.length < 10) {
            restaurarBotao();
            mostrarMensagem('Por favor, insira um número de celular válido.', 'erro');
            return;
        }

        // Validação do nome do evento
        if (formData.nomeEvento.length < 3) {
            restaurarBotao();
            mostrarMensagem('O nome do evento deve ter pelo menos 3 caracteres.', 'erro');
            return;
        }

        // Validação do valor
        if (formData.valorNumerico <= 0) {
            restaurarBotao();
            mostrarMensagem('Por favor, insira um valor válido maior que zero.', 'erro');
            return;
        }

        // Validação da forma de pagamento
        if (!formData.formaPagamento) {
            restaurarBotao();
            mostrarMensagem('Por favor, selecione uma forma de pagamento.', 'erro');
            return;
        }

        // NOVA VALIDAÇÃO: Verificar se a forma de pagamento é permitida para o projeto
        const formasPermitidas = obterFormasPagamentoPermitidas(formData.projeto);
        const [tipoFormaPagamento] = formData.formaPagamento.split('_');
        
        if (!formasPermitidas.includes(tipoFormaPagamento) && !formasPermitidas.includes(formData.formaPagamento)) {
            restaurarBotao();
            mostrarMensagem('A forma de pagamento selecionada não é permitida para este projeto.', 'erro');
            return;
        }

        // NOVA VALIDAÇÃO: Para PIX antecipado, verificar se ainda está dentro do prazo
        if (formData.formaPagamento === 'pix_antecipado' && !permitePagamentoAntecipado()) {
            restaurarBotao();
            mostrarMensagem('O pagamento antecipado com desconto só está disponível até 30 dias antes da data de chegada.', 'erro');
            return;
        }

        // Validação do valor calculado
        if (formData.valorCalculadoNumerico <= 0) {
            restaurarBotao();
            mostrarMensagem('Erro no cálculo do valor. Verifique os dados informados.', 'erro');
            return;
        }

        // Validação de datas
        const hoje = new Date();
        const chegada = new Date(formData.dataChegada);
        const saida = new Date(formData.dataSaida);
        const dataLimite = new Date();
        dataLimite.setDate(hoje.getDate() - 60);
        dataLimite.setHours(0, 0, 0, 0);

        const chegadaNormalizada = new Date(chegada);
        chegadaNormalizada.setHours(0, 0, 0, 0);
        const saidaNormalizada = new Date(saida);
        saidaNormalizada.setHours(0, 0, 0, 0);

        if (chegadaNormalizada < dataLimite) {
            restaurarBotao();
            mostrarMensagem('A data de chegada não pode ser anterior a 60 dias da data atual.', 'erro');
            return;
        }

        if (saidaNormalizada <= chegadaNormalizada) {
            restaurarBotao();
            mostrarMensagem('A data de saída deve ser posterior à data de chegada.', 'erro');
            return;
        }

        // Atualiza loading para envio
        submitButton.innerHTML = '<span class="loading-spinner"></span> Enviando dados...';

        // ===== DEBUG PARA VERIFICAR SE OS CAMPOS DE PROJETO ESTÃO SENDO ENVIADOS =====
        console.log('Payload final completo:', formData);
        console.log('Campo projeto no payload:', formData.projeto);
        console.log('Campo projetoNome no payload:', formData.projetoNome);

        // Envio para N8N
        console.log('📦 Enviando dados para n8n...', formData);
        const resultado = await enviarParaN8N(formData);

        if (resultado.success) {
            restaurarBotao();
            
            // NOVA LÓGICA: Verifica se a resposta contém uma URL de pagamento
            let paymentUrl = null;
            
            // Tenta extrair a URL da resposta (pode vir em diferentes formatos)
            if (typeof resultado.data === 'string') {
                // Se a resposta é uma string, assume que é a URL diretamente
                paymentUrl = resultado.data.trim();
            } else if (resultado.data && typeof resultado.data === 'object') {
                // Se a resposta é um objeto, procura por campos comuns de URL
                paymentUrl = resultado.data.url || 
                           resultado.data.payment_url || 
                           resultado.data.link || 
                           resultado.data.checkout_url ||
                           resultado.data.paymentUrl;
            }
            
            console.log('🔗 URL de pagamento extraída:', paymentUrl);
            
            // Valida se a URL é válida
            if (paymentUrl && (paymentUrl.startsWith('http://') || paymentUrl.startsWith('https://'))) {
                // Mostra a tela de pagamento com a URL
                showPaymentScreen(paymentUrl);
            } else {
                // Fallback: se não conseguir extrair a URL, mostra mensagem de sucesso e volta ao início
                mostrarMensagem('✅ Check-in realizado com sucesso! Dados enviados para processamento.');
                setTimeout(() => {
                    restartProcess();
                }, 3000);
            }
            
        } else {
            restaurarBotao();
            mostrarMensagem(`❌ Erro ao processar check-in: ${resultado.error}. Tente novamente.`, 'erro');
        }
    });

// ===== INICIALIZAÇÃO (CORRIGIDA) =====

// Carrega as políticas e projetos no início
await Promise.all([
    carregarPoliticas(),
    carregarProjetos()
]);

// CORREÇÃO: Executa o preenchimento VIA URL APÓS carregar os dados
preencherCamposViaURL();

// Chamadas iniciais para garantir que o dropdown esteja populado
// e o cálculo seja feito quando a página carrega, mesmo sem interação do usuário.
gerarOpcoesDropdown();
atualizarValorCalculado();
});
