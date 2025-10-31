let idTurmaAtual = null
const esqT = {
    'Manhã': 'manha',
    'Tarde': 'tarde',
    'Noite': 'noite'
}

async function telaTurmas() {

    mostrarMenus()

    const btn = `<button onclick="adicionarTurma()">Adicionar</button>`
    const nomeBase = 'turmas'
    const acumulado = `
        ${modeloTabela({ colunas: ['Nome', 'Turno', 'Plano de Aulas', ''], base: nomeBase, btnExtras: btn })}
    `
    titulo.textContent = 'Turmas'
    telaInterna.innerHTML = acumulado

    const base = await recuperarDados(nomeBase)
    for (const [id, dados] of Object.entries(base).reverse()) {
        await criarLinhaTurmas(id, dados)
    }

}

async function criarLinhaTurmas(idTurma, dados) {

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.turno || ''}</td>
        <td>
            <div style="${horizontal}">
                <img src="imagens/turmas.png" onclick="planoAulas('${idTurma}')" style="width: 2rem;">
            </div>
        </td>
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

            <hr>
            
            <div style="${horizontal}; width: 100%; justify-content: space-between;">
                <button onclick="salvarTurma(${idTurma ? `'${idTurma}'` : ''})">Salvar</button>
                ${idTurma ? `<button style="background-color: #B12425;" onclick="confirmarExclusaoTurma('${idTurma}')">Excluir</button>` : ''}
            </div>

        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function planoAulas(idTurma) {

    idTurmaAtual = idTurma

    const turma = await recuperarDado('turmas', idTurma)

    const strTurnos = turnos.map(turno => `
        <div style="${vertical}; align-items: center;">
            <input onchange="selecionarTurno('${turno}')" name="turno" type="radio" ${turma?.turno == turno ? 'checked' : ''}>
            <span>${turno}</span>
        </div>
        `).join('')

    const btnExtras = `
    <div id="planoAulas" class="contorno-dias" style="flex-direction: row; gap: 1rem;">
        ${strTurnos}
    </div>
    <div class="contorno-dias">
        <span>Nome da Turma</span>
        <span style="font-size: 1.2rem;">${turma.nome}</span>
    </div>
    <button onclick="telaTurmas()">Voltar</button>
    `
    const acumulado = `
        ${modeloTabela({ btnExtras, colunas: ['Disciplinas', 'Carga Horária', 'Dia da Semana', 'Início', 'Término', 'Professores'] })}
    `
    const planoAulas = document.getElementById('planoAulas')
    if (!planoAulas) telaInterna.innerHTML = acumulado

    const disciplinas = await recuperarDados('disciplinas')

    for (const [idDisciplina, dados] of Object.entries(disciplinas)) {
        criarLinhaDisciplinaTurma(idDisciplina, dados, turma?.turno)
    }

}

async function selecionarTurno(turno) {

    overlayAguarde()

    const turma = await recuperarDado('turmas', idTurmaAtual)
    turma.turno = turno

    enviar(`turmas/${idTurmaAtual}/turno`, turno)
    await inserirDados({ [idTurmaAtual]: turma }, 'turmas')

    await planoAulas(idTurmaAtual)

    removerOverlay()

}

async function balaoSemana(idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)
    const discpTurma = disciplina?.turmas?.[idTurmaAtual] || {}

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input name="${dia}" type="checkbox" ${discpTurma?.dispDias?.[dia] ? 'checked' : ''}>
            <span>${dia}</span>
        </div>
        `).join('')

    const acumulado = `
        <div style="${vertical}; background-color: #d2d2d2; padding: 2rem;">
            <div style="${horizontal}; gap: 2px;">
                ${strDias}
            </div>
            <hr>
            <button onclick="salvarDiasSemana('${idDisciplina}')">Salvar</button>
        </div>
    `

    popup(acumulado, 'Dias da Semana', true)
}

async function salvarDiasSemana(idDisciplina) {

    overlayAguarde()

    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    if (!disciplina.turmas) disciplina.turmas = {}
    if (!disciplina.turmas[idTurmaAtual]) disciplina.turmas[idTurmaAtual] = {}

    const dispDias = {}
    for (const dia of dias) {
        const input = document.querySelector(`[name="${dia}"]`)
        dispDias[dia] = input.checked
    }

    disciplina.turmas[idTurmaAtual].dispDias = dispDias

    enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/dispDias`, dispDias)
    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')

    await planoAulas(idTurmaAtual)

    removerPopup()

}

async function atualizarDatas(data, chave, idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    if (!disciplina.turmas) disciplina.turmas = {}
    if (!disciplina.turmas[idTurmaAtual]) disciplina.turmas[idTurmaAtual] = {}

    disciplina.turmas[idTurmaAtual][chave] = data

    if (data) {
        enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/${chave}`, data)
    } else {
        deletar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/${chave}`)
    }
    
    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')

    await planoAulas(idTurmaAtual)

}

async function criarLinhaDisciplinaTurma(idDisciplina, dados, turno) {

    const discpTurma = dados?.turmas?.[idTurmaAtual] || {}
    const professor = await recuperarDado('professores', discpTurma?.professor)

    let strDisp = ''
    for (const [dia, status] of Object.entries(discpTurma?.dispDias || {})) {
        if (status) strDisp += `<span class="contorno-dias-semana">${dia}</span>`
    }

    const chave = esqT?.[turno] || ''

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.[chave] || ''}</td>
        <td>
            <div style="${horizontal}; justify-content: space-between; gap: 2px;">
                <div style="${horizontal}; gap: 1px;">${strDisp}</div>
                <img src="imagens/lapis.png" style="width: 1.5rem;" onclick="balaoSemana('${idDisciplina}')">
            </div>
        </td>
        <td>
            <input style="background-color: ${discpTurma?.dtInicio ? '#64ff64' : '#ff7d7d'}" type="date" onchange="atualizarDatas(this.value, 'dtInicio', '${idDisciplina}')" value="${discpTurma?.dtInicio || ''}">
        </td>
        <td>
            <input style="background-color: ${discpTurma?.dtTermino ? '#64ff64' : '#ff7d7d'}" type="date" onchange="atualizarDatas(this.value, 'dtTermino', '${idDisciplina}')" value="${discpTurma?.dtTermino || ''}">
        </td>
        <td>
            <div style="${horizontal}; justify-content: space-between; gap: 3px;">
                <span>${professor?.nome || '...'}</span>
                <img onclick="professoresDisponiveis('${idDisciplina}')" src="imagens/lapis.png" style="width: 1.5rem;">
            </div>
        </td>
    `

    const trExistente = document.getElementById(idDisciplina)
    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idDisciplina}">${tds}</tr>`)
}


async function professoresDisponiveis(idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)
    const professores = await recuperarDados('professores')

    const profs = Object.keys(disciplina?.professores || {})

    profs.push('Sem professor')

    let strProfs = ''
    for (const prof of profs) {
        strProfs += `
        <div class="contorno-dias" style="justify-content: start; align-items: center; flex-direction: row; gap: 1rem; width: 100%;">
            <input onchange="salvarProfessorDisciplina('${idDisciplina}')" id="${prof}" name="professor" type="radio">
            <span>${professores?.[prof]?.nome || prof}</span>
        </div>
        `
    }

    const acumulado = `
        <div style="${vertical}; gap: 2px; background-color: #d2d2d2; padding: 2rem;">
            ${strProfs == '' ? 'Lista vazia' : strProfs}
        </div>
    `

    popup(acumulado, 'Selecione o professor', true)

}

async function salvarProfessorDisciplina(idDisciplina) {
    const selecionado = document.querySelector('input[name="professor"]:checked')
    const idProfessor = selecionado.id
    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    if (!disciplina.turmas) disciplina.turmas = {}
    if (!disciplina.turmas[idTurmaAtual]) disciplina.turmas[idTurmaAtual] = {}

    disciplina.turmas[idTurmaAtual].professor = idProfessor

    enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/professor`, idProfessor)
    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')
    await planoAulas(idTurmaAtual)
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