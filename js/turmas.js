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

async function salvarDiasSemana(input, idDisciplina) {

    const dia = input.dataset.dia
    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    disciplina.turmas ??= {}
    disciplina.turmas[idTurmaAtual] ??= {}
    disciplina.turmas[idTurmaAtual].dispDias ??= {}

    disciplina.turmas[idTurmaAtual].dispDias[dia] = input.checked

    const resposta = await enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/dispDias/${dia}`, input.checked)
    console.log(resposta)
    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')

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

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input onchange="salvarDiasSemana(this, '${idDisciplina}')" data-dia="${dia}" type="checkbox" ${discpTurma?.dispDias?.[dia] ? 'checked' : ''}>
            <span>${dia}</span>
        </div>
        `).join('')

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.[chave] || ''}</td>
        <td>
            <div style="${horizontal}; gap: 2px;">
                ${strDias}
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
                <img onclick="professoresDisponiveis('${idDisciplina}')" src="imagens/professor.png" style="width: 1.5rem;">
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
    const turmas = await recuperarDados('turmas')
    const todasDisciplinas = await recuperarDados('disciplinas')
    const turma = turmas[idTurmaAtual]
    const esquema = {
        btnExtras: `<span style="padding: 5px; font-size: 1.5rem;">${disciplina.nome}</span>`,
        removerPesquisa: true,
        body: 'body3',
        colunas: ['Editar', 'Professores', 'Turmas', 'Turnos', 'Dias escolhidos', 'Interesse nessa aula', 'Selecione']
    }

    const acumulado = `
        <div id="divProfs" data-disciplina="${idDisciplina}" style="${vertical}; gap: 2px; background-color: #d2d2d2; padding: 2rem;">
            ${modeloTabela(esquema)}
        </div>
    `
    const dispDias = disciplina?.turmas?.[idTurmaAtual]?.dispDias || {}

    const divProfs = document.getElementById('divProfs')
    if (!divProfs) popup(acumulado, 'Gerenciar professores', true)
    const body = document.getElementById('body3')

    for (const [idProfessor, professor] of Object.entries(professores)) {
        let pareamentoTURNO = false
        let strTurnos = ''

        for (const [turno, status] of Object.entries(professor?.dispTurnos || {})) {
            if (status) strTurnos += `<span class="contorno-dias-semana">${turno}</span>`
            if (turma.turno == turno && status) pareamentoTURNO = true
        }

        let strTurmas = ''
        let turmasOk = true // Assume que está tudo OK inicialmente

        // Verifica se o professor está em outra turma DESTA MESMA disciplina
        for (const [idTurma, turmaInfo] of Object.entries(disciplina?.turmas || {})) {
            if (turmaInfo.professor == idProfessor && idTurma !== idTurmaAtual) {
                strTurmas += `${turmas?.[idTurma]?.nome} `
                
                // 1. Se o turno é igual -> CANCEL
                if (turmaInfo.turno === turma.turno) {
                    turmasOk = false
                }
            }
        }

        // 2. Verifica se existe outra disciplina no mesmo dia e turno
        if (turmasOk) {
            for (const [idOutraDisciplina, outraDisciplina] of Object.entries(todasDisciplinas || {})) {
                for (const [idTurmaOutra, turmaOutra] of Object.entries(outraDisciplina?.turmas || {})) {
                    if (turmaOutra.professor == idProfessor && 
                        idOutraDisciplina !== idDisciplina && // É outra disciplina
                        turmaOutra.turno === turma.turno) { // Mesmo turno
                        
                        // Verifica se tem dia em comum
                        const temDiaComum = Object.keys(turmaOutra.dispDias || {}).some(dia => 
                            dispDias[dia] && turmaOutra.dispDias[dia]
                        )
                        
                        if (temDiaComum) {
                            turmasOk = false
                            break
                        }
                    }
                }
                if (!turmasOk) break
            }
        }

        let pareamentoDIAS = false
        let strDias = ''
        for (const [dia, status] of Object.entries(professor?.dispDias || {})) {
            // Verificar se o dia da disciplina coincide com os dias do professor;
            if (dispDias[dia] && status) pareamentoDIAS = true
            if (status) strDias += `<span class="contorno-dias-semana">${dia}</span>`
        }

        const celulas = `
            <td>
                <img onclick="adicionarProfessor('${idProfessor}')" src="imagens/professor.png" style="width: 1.8rem;">
            </td>
            <td>${professor.nome}</td>
            <td>
                <div style="${horizontal}; gap: 2px;">
                    <div style="${vertical}; gap: 1px;">
                        ${strTurmas || 'Nenhuma turma'}
                    </div>
                    <img src="imagens/${turmasOk ? 'concluido' : 'cancel'}.png" style="width: 1.8rem;">
                </div>
            </td>
            <td>
                <div style="${horizontal}; gap: 2px;">
                    <div style="${vertical}; gap: 1px;">
                        ${strTurnos}
                    </div>
                    <img src="imagens/${pareamentoTURNO ? 'concluido' : 'cancel'}.png" style="width: 1.8rem;">
                </div>
            </td>
            <td>
                <div style="${horizontal}; gap: 2px;">
                    <div style="${vertical}; gap: 1px;">
                        ${strDias}
                    </div>
                    <img src="imagens/${pareamentoDIAS ? 'concluido' : 'cancel'}.png" style="width: 1.8rem;">
                </div>
            </td>
            <td>
                <img src="imagens/${disciplina.professores?.[idProfessor] ? 'concluido' : 'cancel'}.png" style="width: 1.8rem;">
            </td>
            <td>
                <input id="${idProfessor}" onchange="salvarProfessorDisciplina('${idDisciplina}')" ${disciplina?.turmas?.[idTurmaAtual]?.professor == idProfessor ? 'checked' : ''} name="professor" style="width: 2rem; height: 2rem;" type="radio">
            </td>
        `

        const existente = document.getElementById(`PROF_${idProfessor}`)
        if (existente) {
            existente.innerHTML = celulas
            continue
        }

        body.insertAdjacentHTML('beforeend', `<tr id="PROF_${idProfessor}">${celulas}</tr>`)
    }
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