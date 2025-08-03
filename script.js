document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('estadiaForm');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Impede o envio padrão do formulário

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

        // Validação adicional (exemplo: se você quisesse mais do que apenas o 'required' do HTML)
        if (!formData.aceitoRegulamento) {
            alert('Você deve aceitar o Regulamento Interno para prosseguir.');
            return;
        }

        // Simula o envio dos dados (neste caso, apenas loga no console)
        console.log('Dados do Formulário:', formData);

        alert('Formulário enviado com sucesso! Verifique o console para os dados.');

        // Aqui você faria uma requisição AJAX (fetch ou XMLHttpRequest) para enviar os dados para um servidor.
        /*
        fetch('/api/submit-form', { // Substitua por sua URL de API
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
            form.reset(); // Limpa o formulário após o envio
        })
        .catch((error) => {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao enviar o formulário.');
        });
        */
    });
});
