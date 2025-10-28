async function telaTurmas() {

    mostrarMenus()

    const btn = `<button onclick="adicionarTurma()">Adicionar</button>`
    const nomeBase = 'turmas'
    const acumulado = `
        ${modeloTabela(['Nome', 'Data de Início', 'Data de Término', 'Professor', ''], nomeBase, btn)}
    `
    titulo.textContent = 'Turmas'
    telaInterna.innerHTML = acumulado

    const base = await recuperarDados(nomeBase)
    for (const [id, dados] of Object.entries(base).reverse()) {
        await criarLinhaTurmas(id, dados)
    }

}

async function criarLinhaTurmas(idTurma, dados) {

    const professor = await recuperarDado('professores', dados.idProfessor)

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dtFormatada(dados?.dtInicio)}</td>
        <td>${dtFormatada(dados?.dtTermino)}</td>
        <td>${professor?.nome || ''}</td>
        <td>
            <img onclick="adicionarTurma('${idTurma}')" src="imagens/pesquisar.png" style="width: 2rem;">
        </td>
    `

    const trExistente = document.getElementById(idTurma)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idTurma}">${tds}</tr>`)
}

async function adicionarTurma(idTurma) {

    const turma = await recuperarDado('turmas', idTurma)
    const professor = await recuperarDado('professores', turma?.idProfessor)

    const acumulado = `
        <div class="formulario">
            
            ${modeloLivre('Nome/Código da Turma', `<input name="nome" value="${turma?.nome || ''}">`)}
            ${modeloLivre('Data de Início', `<input type="date" name="dtInicio" type="number" value="${turma?.dtInicio || ''}">`)}
            ${modeloLivre('Data de Término', `<input type="date" name="dtTermino" type="number" value="${turma?.dtTermino || ''}">`)}
            
            ${modeloLivre('Professor', 
            `<span 
            class="opcoes" 
            name="professor"
            ${professor ? `id="${turma.idProfessor}"` : ''}
            onclick="cxOpcoes('professor', 'professores', ['nome'])">
                ${professor?.nome || 'Selecione'}
            </span>`)}

            <hr>
            
            <div style="${horizontal}; width: 100%; justify-content: space-between;">
                <button onclick="salvarTurma(${idTurma ? `'${idTurma}'` : ''})">Salvar</button>
                ${idTurma ? `<button style="background-color: #B12425;" onclick="confirmarExclusaoTurma('${idTurma}')">Excluir</button>` : ''}
            </div>

        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function confirmarExclusaoTurma(idTurma) {

    const acumulado = `
        <div style="${horizontal}; background-color: #d2d2d2; padding: 2rem; gap: 1rem;">

            <img src="gifs/alerta.gif" style="width: 3rem;">
            <span>Você tem certeza disso?</span>
            <button onclick="excluirTurma('${idTurma}')">Confirmar</button>

        </div>
    `

    popup(acumulado, 'Tem certeza?', true)

}

async function excluirTurma(idTurma) {

    removerPopup() // telaProf
    removerPopup() // popup conf
    overlayAguarde()

    const resposta = await deletar(`turmas/${idTurma}`)

    if (!resposta.err) {
        deletarDB('turmas', idTurma)
        const linha = document.getElementById(idTurma)
        if (linha) linha.remove()
        removerOverlay()
    }

}

async function salvarTurma(idTurma) {

    overlayAguarde()

    idTurma = idTurma || ID5digitos()

    const turma = {
        nome: obVal('nome'),
        dtInicio: obVal('dtInicio'),
        dtTermino: obVal('dtInicio'),
        idProfessor: document.querySelector('[name="professor"]').id
    }

    enviar(`turmas/${idTurma}`, turma)
    await inserirDados({ [idTurma]: turma }, 'turmas')

    removerPopup()

    criarLinhaTurmas(idTurma, turma)

}