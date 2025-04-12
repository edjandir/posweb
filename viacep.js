function consultarCEP() {
    const cep = document.getElementById('cep').value;

    const url = `https://viacep.com.br/ws/${cep}/json/`;

    fetch(url)
        .then(resposta => resposta.json())
        .then(dados => {
            if (dados.erro) {
                document.getElementById('resultado').innerHTML = 'CEP não encontrado.';
            } else {
                document.getElementById('resultado').innerHTML = `
                    <strong>Endereço:</strong><br>
                    ${dados.logradouro} - ${dados.bairro}<br>
                    ${dados.localidade} - ${dados.uf}<br>
                    CEP: ${dados.cep}
                `;
            }
        })
        .catch(erro => {
            console.error("Erro na requisição:", erro);
            document.getElementById('resultado').innerHTML = "Erro ao consultar o CEP.";
        });
}