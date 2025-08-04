document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('estadiaForm');
    
    // URL da webhook do n8n (apenas para envio final)
    const WEBHOOK_URL = 'https://criadordigital-n8n-editor.kttqgl.easypanel.host/webhook-test/91479e0c-d686-42dd-a381-c3e44d50df7e';

// ===== NOVA: PREENCHIMENTO VIA URL =====
    
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
        
        console.log('🔄 Preenchendo campos automaticamente...');
        
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
                        // Se o valor não tem R\$, adiciona formatação
                        if (!valorDecodificado.includes('R\$')) {
                            // Assume que o valor está em formato numérico (ex: 150.00 ou 150)
                            const valorNumerico = parseFloat(valorDecodificado.replace(',', '.')) || 0;
                            const valorCentavos = Math.round(valorNumerico * 100);
                            elemento.value = valorCentavos.toString();
                            // Dispara evento para aplicar máscara
                            elemento.dispatchEvent(new Event('input'));
                        } else {
                            elemento.value = valorDecodificado;
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
        
        // Mostra mensagem de sucesso
        setTimeout(() => {
            mostrarMensagem(`📋 ${Object.keys(parametros).length} campo(s) preenchido(s) automaticamente via URL`, 'sucesso');
        }, 500);
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
            return;
        }
        value = (parseInt(value) / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        e.target.value = 'R\$ ' + value;
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
    });

    // ===== VALIDAÇÃO DE CPF LOCAL (SUA FUNÇÃO ADAPTADA) =====
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

        // Validação do CPF (usando sua função)
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
        console.log('📤 Enviando dados para n8n...', formData);
        const resultado = await enviarParaN8N(formData);

        if (resultado.success) {
            restaurarBotao();
            mostrarMensagem('✅ Check-in realizado com sucesso! Dados enviados para processamento.');
            setTimeout(() => {
                form.reset();
                showWelcomeScreen();
            }, 3000);
        } else {
            restaurarBotao();
            mostrarMensagem(`❌ Erro ao processar check-in: ${resultado.error}. Tente novamente.`, 'erro');
        }
    });
});
