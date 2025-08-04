document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('estadiaForm');
    
    // URL da webhook do n8n (apenas para envio final)
    const WEBHOOK_URL = 'https://criadordigital-n8n-editor.kttqgl.easypanel.host/webhook-test/91479e0c-d686-42dd-a381-c3e44d50df7e';

    // ===== CONFIGURAÇÃO DAS TAXAS DE PAGAMENTO =====
    
    const taxasPagamento = {
        cartao: {
            1: { nome: 'Cartão - À vista', taxaFixa: 0.49, taxaPercentual: 0.0399 },
            2: { nome: 'Cartão - 2 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0449 },
            3: { nome: 'Cartão - 3 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0449 },
            4: { nome: 'Cartão - 4 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0449 },
            5: { nome: 'Cartão - 5 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0449 },
            6: { nome: 'Cartão - 6 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0449 },
            7: { nome: 'Cartão - 7 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 },
            8: { nome: 'Cartão - 8 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 },
            9: { nome: 'Cartão - 9 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 },
            10: { nome: 'Cartão - 10 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 },
            11: { nome: 'Cartão - 11 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 },
            12: { nome: 'Cartão - 12 parcelas', taxaFixa: 0.49, taxaPercentual: 0.0499 }
        },
        pix: {
            1: { nome: 'PIX - À vista', taxaFixa: 0.00, taxaPercentual: 0.0000 },
            2: { nome: 'PIX - 2 parcelas', taxaFixa: 1.99, taxaPercentual: 0.0200 },
            3: { nome: 'PIX - 3 parcelas', taxaFixa: 1.99, taxaPercentual: 0.0200 }
        }
    };

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
        const valorBrutoOriginal = (valorNumerico + taxa.taxaFixa) / (1 - taxa.taxaPercentual);
        
        // --- INÍCIO DA NOVA CORREÇÃO DE ARREDONDAMENTO (todas as parcelas arredondadas para cima) ---
        
        // 1. Calcular o valor de cada parcela sem arredondamento
        const valorPorParcelaRaw = valorBrutoOriginal / parcelas;
        
        // 2. Arredondar o valor de CADA parcela para cima, para 2 casas decimais
        // Ex: 185.61857... -> 185.62
        const valorPorParcela = Math.ceil(valorPorParcelaRaw * 100) / 100;
        
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

    // Função para gerar opções do dropdown dinamicamente
    function gerarOpcoesDropdown() {
        const campoValor = document.getElementById('valor');
        const valorLiquido = extrairValorNumerico(campoValor.value);
        
        const optgroupCartao = document.getElementById('optgroup-cartao'); 
        const optgroupPix = document.getElementById('optgroup-pix');

        
        // Limpa opções existentes
        optgroupCartao.innerHTML = '';
        optgroupPix.innerHTML = '';
        
        if (valorLiquido <= 0) {
            // Se não há valor, mostra opções genéricas
            optgroupCartao.innerHTML = '<option value="" disabled selected>Informe um valor primeiro</option>';
            optgroupPix.innerHTML = '<option value="" disabled>Informe um valor primeiro</option>';
            return;
        }
        
        // Gera opções para Cartão
        for (let parcelas = 1; parcelas <= 12; parcelas++) {
            const calculo = calcularValorComTaxas(valorLiquido, 'cartao', parcelas);
            if (calculo) {
                const option = document.createElement('option');
                option.value = `cartao_${parcelas}`;

                const tipoPagamento = getPaymentTypeName('cartao'); // "cartão"
                
                if (parcelas === 1) {
                    option.textContent = `À vista no ${tipoPagamento} - ${formatarParaMoeda(calculo.total)}`;
                } else {
                    option.textContent = `${parcelas} parcelas no ${tipoPagamento} - ${formatarParaMoeda(calculo.porParcela)}/mês (Total: ${formatarParaMoeda(calculo.total)})`;
                }
                
                optgroupCartao.appendChild(option);
            }
        }
        
        // Gera opções para PIX
        for (let parcelas = 1; parcelas <= 3; parcelas++) {
            const calculo = calcularValorComTaxas(valorLiquido, 'pix', parcelas);
            if (calculo) {
                const option = document.createElement('option');
                option.value = `pix_${parcelas}`;

                const tipoPagamento = getPaymentTypeName('pix'); // "pix"
                
                if (parcelas === 1) {
                    option.textContent = `À vista no ${tipoPagamento} - ${formatarParaMoeda(calculo.total)}`;
                } else {
                    option.textContent = `${parcelas} parcelas no ${tipoPagamento} - ${formatarParaMoeda(calculo.porParcela)}/mês (Total: ${formatarParaMoeda(calculo.total)})`;
                }
                
                optgroupPix.appendChild(option);
            }
        }
    }

    // Função para atualizar o valor calculado E a descrição
function atualizarValorCalculado() {
    const campoValor = document.getElementById('valor');
    const campoFormaPagamento = document.getElementById('formaPagamento');
    const campoValorCalculado = document.getElementById('valorCalculado');
    const campoDescricaoDisplay = document.getElementById('formaPagamentoDescricaoDisplay'); // <-- NOVO ELEMENTO AQUI

    if (!campoValor || !campoFormaPagamento || !campoValorCalculado || !campoDescricaoDisplay) {
        console.warn('⚠️ Campos necessários não encontrados');
        return;
    }
    
    const valorLiquido = extrairValorNumerico(campoValor.value);
    // Pega a opção que está atualmente selecionada no dropdown
    const selectedOption = campoFormaPagamento.options[campoFormaPagamento.selectedIndex]; 
    
    // Limpa os campos se não houver seleção ou valor líquido
    campoValorCalculado.value = '';
    campoValorCalculado.placeholder = 'Selecione uma forma de pagamento';
    campoDescricaoDisplay.textContent = ''; // Limpa a descrição
    
    if (!selectedOption || !selectedOption.value || valorLiquido <= 0) {
        // Se não há opção selecionada ou valor líquido é inválido, sai.
        if (valorLiquido <= 0) {
            campoValorCalculado.placeholder = 'Informe um valor válido';
        }
        return;
    }
    
    const formaPagamentoValue = selectedOption.value; // Ex: "cartao_1", "pix_2"
    const formaPagamentoText = selectedOption.textContent; // Ex: "À vista no pix - R\$ 1.010,20"
    
    console.log(`�� Atualizando cálculo - Valor: ${valorLiquido}, Forma: ${formaPagamentoValue}`);
    
    // Parse da forma de pagamento selecionada
    const [tipo, parcelas] = formaPagamentoValue.split('_');
    const calculo = calcularValorComTaxas(valorLiquido, tipo, parseInt(parcelas));
    
    if (calculo) {
        // Mantém o input 'valorCalculado' com apenas o valor formatado
        campoValorCalculado.value = formatarParaMoeda(calculo.total);
        campoValorCalculado.placeholder = '';
        
        // Define o texto descritivo completo no novo elemento
        campoDescricaoDisplay.textContent = formaPagamentoText; 
        
        // Mostra diferença se houver taxa
        if (calculo.total > valorLiquido) {
            const diferenca = calculo.total - valorLiquido;
            console.log(`💡 Taxa aplicada: ${formatarParaMoeda(diferenca)}`);
        }
    } else {
        campoValorCalculado.value = '';
        campoValorCalculado.placeholder = 'Erro no cálculo';
        campoDescricaoDisplay.textContent = 'Erro ao carregar descrição';
    }
}

    // Função para obter dados da forma de pagamento selecionada
    function obterDadosFormaPagamento(formaPagamento) {
        if (!formaPagamento) return null;
        
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
        
        console.log('📋 Parâmetros encontrados na URL:', parametros);
        return parametros;
    }
    
    // Função para preencher os campos do formulário
    function preencherCamposViaURL() {
        const parametros = obterParametrosURL();
        
        // Se não há parâmetros, não faz nada
        if (Object.keys(parametros).length === 0) {
            console.log('ℹ️ Nenhum parâmetro encontrado na URL');
            return;
        }
        
        console.log('�� Preenchendo campos automaticamente...');
        
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
            }
            else {
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

    // Máscara para Valor (Moeda)
    document.getElementById('valor').addEventListener('input', function(e) {
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

        const formData = {
            nomeCompleto: document.getElementById('nomeCompleto').value.trim(),
            cpf: document.getElementById('cpf').value,
            cpfLimpo: document.getElementById('cpf').value.replace(/[^\d]/g, ''),
            email: document.getElementById('email').value.trim().toLowerCase(),
            celular: document.getElementById('celular').value,
            celularLimpo: document.getElementById('celular').value.replace(/[^\d]/g, ''),
            nomeEvento: document.getElementById('nomeEvento').value.trim(),
            valor: document.getElementById('valor').value,
            valorNumerico: converterValorParaNumero(document.getElementById('valor').value),
            formaPagamento: document.getElementById('formaPagamento').value,
            formaPagamentoTipo: dadosFormaPagamento?.tipo || '',
            formaPagamentoParcelas: dadosFormaPagamento?.parcelas || 0,
            formaPagamentoNome: dadosFormaPagamento?.nome || '',
            valorCalculado: document.getElementById('valorCalculado').value,
            valorCalculadoNumerico: extrairValorNumerico(document.getElementById('valorCalculado').value),
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

        // Envio para N8N
        console.log('�� Enviando dados para n8n...', formData);
        const resultado = await enviarParaN8N(formData);

        if (resultado.success) {
            restaurarBotao();
            mostrarMensagem('✅ Check-in realizado com sucesso! Dados enviados para processamento.');
            setTimeout(() => {
                form.reset();
                document.getElementById('valorCalculado').value = '';
                document.getElementById('valorCalculado').placeholder = 'Selecione uma forma de pagamento';
                // Limpa as opções do dropdown
                document.getElementById('optgroup-cartao').innerHTML = '';
                document.getElementById('optgroup-pix').innerHTML = '';
                showWelcomeScreen();
            }, 3000);
        } else {
            restaurarBotao();
            mostrarMensagem(`❌ Erro ao processar check-in: ${resultado.error}. Tente novamente.`, 'erro');
        }
    });

    // Chamadas iniciais para garantir que o dropdown esteja populado 
    // e o cálculo seja feito quando a página carrega, mesmo sem interação do usuário.
    gerarOpcoesDropdown(); 
    atualizarValorCalculado();
});
