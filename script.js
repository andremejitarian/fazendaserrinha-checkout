document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('estadiaForm');

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

    // Manipulador do envio do formulário
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Coleta os dados do formulário
        const formData = {
            nomeCompleto: document.getElementById('nomeCompleto').value,
            cpf: document.getElementById('cpf').value,
            email: document.getElementById('email').value,
            celular: document.getElementById('celular').value,
            dataChegada: document.getElementById('dataChegada').value,
            dataSaida: document.getElementById('dataSaida').value,
            aceitoRegulamento: document.getElementById('aceitoRegulamento').checked,
            comunicacoesFazenda: document.querySelector('input[name="comunicacoesFazenda"]:checked') ? document.querySelector('input[name="comunicacoesFazenda"]:checked').value : 'não informado'
        };

        // Validação adicional
        if (!formData.aceitoRegulamento) {
            alert('Você deve aceitar o Regulamento Interno para prosseguir.');
            return;
        }

        // Simula o envio dos dados
        console.log('Dados do Formulário:', formData);
        alert('Formulário enviado com sucesso! Verifique o console para os dados.');

        // Aqui você faria uma requisição AJAX para enviar os dados para um servidor
        /*
        fetch('/api/submit-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Sucesso:', data);
            alert('Formulário enviado com sucesso!');
            form.reset();
            showWelcomeScreen(); // Volta para a tela inicial
        })
        .catch((error) => {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao enviar o formulário.');
        });
        */
    });
});
