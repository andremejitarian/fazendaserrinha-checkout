document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('estadiaForm');
    
    // URL da webhook do n8n
    const WEBHOOK_URL = 'https://criadordigital-n8n-editor.kttqgl.easypanel.host/webhook-test/91479e0c-d686-42dd-a381-c3e44d50df7e';

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

    // ===== MELHORIA 2.A: MÁSCARA PARA CPF =====
    document.getElementById('cpf').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        
        // Limita a 11 dígitos
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        // Aplica a máscara: 000.000.000-00
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        
        e.target.value = value;
    });

    // ===== MELHORIA 2.B: MÁSCARA PARA CELULAR =====
    document.getElementById('celular').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        
        // Limita a 11 dígitos (DDD + 9 dígitos)
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        // Aplica a máscara: (00) 00000-0000 ou (00) 0000-0000
        if (value.length <= 10) {
            // Formato para telefone fixo: (00) 0000-0000
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            // Formato para celular: (00) 00000-0000
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        
        e.target.value = value;
    });

    // ===== VALIDAÇÃO DE CPF =====
    function validarCPF(cpf) {
        // Remove pontos e traços
        cpf = cpf.replace(/[^\d]+/g, '');
        
        // Verifica se tem 11 dígitos ou se todos são iguais
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        // Validação do primeiro dígito verificador
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) return false;
        
        // Validação do segundo dígito verificador
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(10))) return false;
        
        return true;
    }

    // ===== FUNÇÃO PARA MOSTRAR MENSAGENS ELEGANTES =====
    function mostrarMensagem(texto, tipo = 'sucesso') {
        // Remove mensagem anterior se existir
        const mensagemExistente = document.querySelector('.mensagem-feedback');
        if (mensagemExistente) {
            mensagemExistente.remove();
        }

        // Cria a nova mensagem
        const mensagem = document.createElement('div');
        mensagem.className = `mensagem-feedback ${tipo}`;
        mensagem.innerHTML = `
            <div class="mensagem-conteudo">
                <span class="mensagem-icone">${tipo === 'sucesso' ? '✅' : '❌'}</span>
                <span class="mensagem-texto">${texto}</span>
            </div>
        `;

        // Adiciona ao body
        document.body.appendChild(mensagem);

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (mensagem.parentNode) {
                mensagem.style.opacity = '0';
                setTimeout(() => mensagem.remove(), 300);
            }
        }, 5000);
    }

    // ===== FUNÇÃO PARA ENVIAR DADOS PARA N8N =====
    async function enviarParaN8N(dadosFormulario) {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    // Dados do formulário
                    ...dadosFormulario,
                    // Metadados adicionais para automação
                    metadata: {
                        timestamp: new Date().toISOString(),
                        source: 'formulario-check-in-fazenda',
                        userAgent: navigator.userAgent,
                        url: window.location.href
                    }
                })
            });

            // Verifica se a resposta foi bem-sucedida
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            // Tenta fazer parse da resposta JSON (se houver)
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                // Se não for JSON válido, pega o texto
                responseData = await response.text();
            }

            console.log('✅ Sucesso - Resposta do n8n:', responseData);
            return { success: true, data: responseData };

        } catch (error) {
            console.error('❌ Erro ao enviar para n8n:', error);
            return { success: false, error: error.message };
        }
    }

    // Manipulador do envio do formulário
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // ===== MELHORIA 3.A: LOADING ELEGANTE =====
        const submitButton = document.querySelector('.submit-button');
        const textoOriginal = submitButton.innerHTML;
        
        // Ativa o loading
        submitButton.innerHTML = '<span class="loading-spinner"></span> Enviando...';
        submitButton.disabled = true;
        submitButton.style.opacity = '0.7';

        // Coleta os dados do formulário
        const formData = {
            nomeCompleto: document.getElementById('nomeCompleto').value.trim(),
            cpf: document.getElementById('cpf').value,
            cpfLimpo: document.getElementById('cpf').value.replace(/[^\d]/g, ''), // CPF apenas números para automação
            email: document.getElementById('email').value.trim().toLowerCase(),
            celular: document.getElementById('celular').value,
            celularLimpo: document.getElementById('celular').value.replace(/[^\d]/g, ''), // Celular apenas números
            dataChegada: document.getElementById('dataChegada').value,
            dataSaida: document.getElementById('dataSaida').value,
            aceitoRegulamento: document.getElementById('aceitoRegulamento').checked,
            comunicacoesFazenda: document.querySelector('input[name="comunicacoesFazenda"]:checked') ? 
                document.querySelector('input[name="comunicacoesFazenda"]:checked').value : 'não informado'
        };

        // Função para restaurar o botão
        function restaurarBotao() {
            submitButton.innerHTML = textoOriginal;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }

        // Validação adicional
        if (!formData.aceitoRegulamento) {
            restaurarBotao();
            mostrarMensagem('Você deve aceitar o Regulamento Interno para prosseguir.', 'erro');
            return;
        }

        // Validação do CPF
        if (!validarCPF(formData.cpf)) {
            restaurarBotao();
            mostrarMensagem('Por favor, insira um CPF válido.', 'erro');
            return;
        }

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

// Validação de datas
const hoje = new Date();
const chegada = new Date(formData.dataChegada);
const saida = new Date(formData.dataSaida);

// Calcula a data limite (60 dias antes de hoje)
const dataLimite = new Date();
dataLimite.setDate(hoje.getDate() - 60);
dataLimite.setHours(0, 0, 0, 0);

// Normaliza as datas para comparação (remove horário)
const chegadaNormalizada = new Date(chegada);
chegadaNormalizada.setHours(0, 0, 0, 0);

const saidaNormalizada = new Date(saida);
saidaNormalizada.setHours(0, 0, 0, 0);

// Validação: data de chegada não pode ser anterior a 60 dias atrás
if (chegadaNormalizada < dataLimite) {
    restaurarBotao();
    mostrarMensagem('A data de chegada não pode ser anterior a 60 dias da data atual.', 'erro');
    return;
}

// Validação: data de saída deve ser posterior à data de chegada
if (saidaNormalizada <= chegadaNormalizada) {
    restaurarBotao();
    mostrarMensagem('A data de saída deve ser posterior à data de chegada.', 'erro');
    return;
}

        // ===== ENVIO PARA N8N =====
        console.log('📤 Enviando dados para n8n...', formData);
        
        const resultado = await enviarParaN8N(formData);

        if (resultado.success) {
            // Sucesso
            restaurarBotao();
            mostrarMensagem('✅ Check-in realizado com sucesso! Dados enviados para processamento.');
            
            // Limpa o formulário após 3 segundos e volta para a tela inicial
            setTimeout(() => {
                form.reset();
                showWelcomeScreen();
            }, 3000);

        } else {
            // Erro
            restaurarBotao();
            mostrarMensagem(`❌ Erro ao processar check-in: ${resultado.error}. Tente novamente.`, 'erro');
        }
    });
});
