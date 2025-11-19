let idTurmaAtual = null
const esqT = {
    'Manhã': 'manha',
    'Tarde': 'tarde',
    'Noite': 'noite',
    'MT': 'mt'
}

async function telaTurmas() {

    const btn = `<button onclick="adicionarTurma()">Adicionar</button>`
    const nomeBase = 'turmas'
    const acumulado = `
        ${modeloTabela({
        colunas: ['Nome', 'Turno', 'Andamento', 'Disciplinas Cursadas', 'Plano de Aulas', ''],
        funcao: `atualizarPlanoAulas()`,
        btnExtras: btn
    })}
    `
    titulo.textContent = 'Turmas'
    telaInterna.innerHTML = acumulado

    const disciplinas = await recuperarDados('disciplinas')
    const total = Object.keys(disciplinas).length

    const base = await recuperarDados(nomeBase)
    for (const [idTurma, dados] of Object.entries(base).reverse()) {

        let contador = 0
        for (const [, disciplina] of Object.entries(disciplinas)) {
            const turmas = disciplina?.turmas || {}
            const turma = turmas[idTurma]
            if (!turma) continue

            if (turma.finalizado == 'S') {
                contador++
                continue
            }

            const dt = turma.dtTermino
            if (!dt) continue

            const [ano, mes, dia] = dt.split('-').map(Number)
            const dataTermino = new Date(ano, mes - 1, dia)

            if (isNaN(dataTermino)) continue

            const hoje = new Date()
            if (dataTermino < hoje) contador++
        }

        await criarLinhaTurmas(idTurma, dados, contador, total)
    }

}

async function criarLinhaTurmas(idTurma, dados, contador, total) {

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.turno || ''}</td>
        <td>
            ${divPorcentagem(Number(((contador / total) * 100).toFixed(0)))}
        </td>
        <td>${contador || 0}</td>
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

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input onchange="marcarDiasPadrao()" data-dia="${dia}" ${turma?.dispDias?.[dia] ? 'checked' : ''} type="checkbox">
            <span>${dia}</span>
        </div>
        `).join('')

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
        <div id="diasPadrao" style="${horizontal}; gap: 2px;">
            ${strDias}
        </div>
        <div class="contorno-dias">
            <span>Nome da Turma</span>
            <span style="font-size: 1.2rem;">${turma.nome}</span>
        </div>
        <button onclick="telaTurmas()">Voltar</button>
    `
    const acumulado = `
        ${modeloTabela({
        btnExtras,
        colunas: ['Disciplinas', 'Encontros', 'Dia da Semana', 'Status', 'Início', 'Término', 'Professores']
    })}
    `
    const planoAulas = document.getElementById('planoAulas')
    if (!planoAulas) telaInterna.innerHTML = acumulado

    const disciplinas = await recuperarDados('disciplinas')

    for (const [idDisciplina, dados] of Object.entries(disciplinas)) {
        criarLinhaDisciplinaTurma(idDisciplina, dados, turma?.turno)
    }

}

async function atualizarPlanoAulas() {

    await sincronizarDados('turmas')
    await sincronizarDados('disciplinas')
    await sincronizarDados('professores')

    await telaTurmas()

}

async function marcarDiasPadrao() {

    const turma = await recuperarDado('turmas', idTurmaAtual)
    const inputs = [...document.querySelectorAll('#diasPadrao input')]
    const dispDias = Object.fromEntries(
        inputs.map(input => [input.dataset.dia, input.checked])
    )

    turma.dispDias = dispDias
    enviar(`turmas/${idTurmaAtual}/dispDias`, dispDias)

    const disciplinas = await recuperarDados('disciplinas')

    for (const [, dados] of Object.entries(disciplinas)) {
        if (!dados?.turmas?.[idTurmaAtual]) continue
        dados.turmas[idTurmaAtual].dispDias = dispDias
    }

    atualizarDiasSemana({ dispDias, idTurmaAtual })
    await inserirDados(disciplinas, 'disciplinas')
    await inserirDados({ [idTurmaAtual]: turma }, 'turmas')
    await planoAulas(idTurmaAtual)
}

async function atualizarDiasSemana({ dispDias, idTurmaAtual }) {

    const url = `${api}/dias-em-massa`
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispDias, idTurmaAtual })
    })

    if (!response.ok) {
        const err = await response.json()
        throw err
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

    await enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/dispDias/${dia}`, input.checked)

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
    const idProfessor = discpTurma?.professor
    const dProfessor = await recuperarDado('professores', idProfessor) || {}
    const d = await recuperarDado('dados_setores', idProfessor) || {}

    const professor = {
        ...d,
        ...Object.fromEntries(Object.entries(dProfessor).filter(([_, v]) => v !== '' && v != null))
    }

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


    const finalizado = discpTurma?.finalizado == 'S'

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.[chave] || ''}</td>
        <td>
            <div style="${horizontal}; gap: 2px;">
                ${strDias}
            </div>
        </td>
        <td>
            <div style="${horizontal}; gap: 5px;">
                <img onclick="finalizarCurso(this, '${idDisciplina}')" data-status="${discpTurma?.finalizado || 'N'}" src="imagens/${finalizado ? 'concluido' : 'cancel'}.png">
                <span>Finalizado</span>
            </div>
        </td>
        <td>
            <div style="${horizontal}; gap: 1rem;">
                <img src="imagens/${(finalizado || discpTurma?.dtInicio) ? 'concluido' : 'cancel'}.png" style="width: 2rem;">
                <input type="date" onchange="atualizarDatas(this.value, 'dtInicio', '${idDisciplina}')" value="${discpTurma?.dtInicio || ''}">
            </div> 
        </td>
        <td>
            <div style="${horizontal}; gap: 1rem;">
                <img src="imagens/${(finalizado || discpTurma?.dtTermino) ? 'concluido' : 'cancel'}.png" style="width: 2rem;">
                <input type="date" onchange="atualizarDatas(this.value, 'dtTermino', '${idDisciplina}')" value="${discpTurma?.dtTermino || ''}">
            </div> 
        </td>
        <td>
            <div style="${horizontal}; justify-content: space-between; gap: 3px;">
                <span>${professor?.nome_completo || '...'}</span>
                <img onclick="professoresDisponiveis('${idDisciplina}')" src="imagens/professor.png" style="width: 1.5rem;">
            </div>
        </td>
    `

    const trExistente = document.getElementById(idDisciplina)
    if (trExistente) return trExistente.innerHTML = tds
    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idDisciplina}">${tds}</tr>`)
}

async function finalizarCurso(img, idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    const status = img.dataset.status == 'S' ? 'N' : 'S'

    disciplina.turmas ??= {}
    disciplina.turmas[idTurmaAtual] ??= {}
    disciplina.turmas[idTurmaAtual].finalizado = status

    enviar(`disciplinas/${idDisciplina}/turmas/${idTurmaAtual}/finalizado`, status)

    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')
    await planoAulas(idTurmaAtual)

}

async function professoresDisponiveis(idDisciplina) {
    const disciplinas = await recuperarDados('disciplinas')
    const disciplina = disciplinas?.[idDisciplina] || {}
    const professores = await recuperarDados('professores')
    const turmas = await recuperarDados('turmas')
    const btnExtras = `
        <div style="${horizontal}; justify-content: space-between; width: 100%;">   
            <span style="padding: 5px; font-size: 1.5rem;">${disciplina.nome}</span>
            <div style="${horizontal}; gap: 5px; padding: 0.5rem;">
                <input type="radio" id="" name="professor" onchange="salvarProfessorDisciplina('${idDisciplina}')" style="width: 2rem; height: 2rem;">
                <span>Sem professor</span>
            </div>
        </div>
    `
    const turma = turmas[idTurmaAtual]
    const esquema = {
        btnExtras,
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
    const hoje = new Date().toISOString().split('T')[0] // formato AAAA-MM-DD

    for (const [idProfessor, dados] of Object.entries(professores)) {

        const d = await recuperarDado('dados_setores', idProfessor) || {}

        const professor = {
            ...dados,
            ...Object.fromEntries(Object.entries(d).filter(([_, v]) => v !== '' && v != null))
        }

        let pareamentoTURNO = false
        let strTurnos = ''

        for (const [turno, status] of Object.entries(professor?.dispTurnos || {})) {
            if (status) strTurnos += `<span class="contorno-dias-semana">${turno}</span>`
            if (turma.turno == turno && status) pareamentoTURNO = true
        }

        let strTurmas = ''
        let conflitos = false

        // Percorre TODAS as disciplinas e TODAS as turmas
        for (const [idDisc, disc] of Object.entries(disciplinas)) {
            for (const [idTurmaDiferente, turmaDiferente] of Object.entries(disc?.turmas || {})) {
                if (turmaDiferente.professor !== idProfessor) continue
                if (idTurmaDiferente == idTurmaAtual && idDisc == idDisciplina) continue

                // Verifica se a turma diferente já terminou
                const dtTermino = turmaDiferente?.dtTermino
                if (dtTermino && dtTermino < hoje) continue // já acabou, ignora

                const diasTurma = turmaDiferente?.dispDias || {}
                const dadosTurmaDiferente = turmas?.[idTurmaDiferente] || {}
                const turnoTurmaDiferente = dadosTurmaDiferente?.turno

                const mesmoTurno = turnoTurmaDiferente === turma.turno
                const mesmoDia = Object.entries(dispDias).some(([dia, ativo]) => ativo && diasTurma[dia])

                if (mesmoTurno && mesmoDia) {
                    conflitos = true
                    const nomeTurma = turmas?.[idTurmaDiferente]?.nome || `Turma ${idTurmaDiferente}`
                    const diasConflitantes = Object.keys(dispDias).filter(dia => dispDias[dia] && diasTurma[dia])
                    for (const dia of diasConflitantes) {
                        strTurmas += `
                            <div class="contorno-dias-semana" style="flex-direction: column; align-items: start;">
                                <div style="${horizontal}; justify-content: space-between; width: 100%; gap: 1rem;">
                                    <span><b>${nomeTurma}</b></span>
                                    <img onclick="irParaTurma('${idTurmaDiferente}')" src="imagens/ir.png" style="width: 1.2rem;">
                                </div>
                                <span>${disc.nome}</span>
                                <span>${turnoTurmaDiferente} - ${dia}</span>
                            </div>
                        `
                    }
                }
            }
        }

        if (!strTurmas && !conflitos) strTurmas = 'Sem conflitos'

        let pareamentoDIAS = false
        let strDias = ''
        for (const [dia, status] of Object.entries(professor?.dispDias || {})) {
            if (dispDias[dia] && status) pareamentoDIAS = true
            if (status) strDias += `<span class="contorno-dias-semana">${dia}</span>`
        }

        const celulas = `
            <td><img onclick="adicionarProfessor('${idProfessor}')" src="imagens/professor.png" style="width: 1.8rem;"></td>
            <td>${professor.nome_completo}</td>
            <td>
                <div style="${horizontal}; gap: 2px;">
                    <div style="${vertical}; gap: 1px; max-width: 220px;">
                        ${strTurmas}
                    </div>
                    <img src="imagens/${conflitos ? 'cancel' : 'concluido'}.png" style="width: 1.8rem;">
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
                <input id="${idProfessor}" onchange="salvarProfessorDisciplina('${idDisciplina}')" 
                    ${disciplina?.turmas?.[idTurmaAtual]?.professor == idProfessor ? 'checked' : ''} 
                    name="professor" style="width: 2rem; height: 2rem;" type="radio">
            </td>
        `

        const existente = document.getElementById(`PROF_${idProfessor}`)
        if (existente) {
            existente.innerHTML = celulas
        } else {
            body.insertAdjacentHTML('beforeend', `<tr id="PROF_${idProfessor}">${celulas}</tr>`)
        }
    }
}

async function irParaTurma(idTurma) {

    const telaInterna = document.querySelector('.telaInterna')
    telaInterna.innerHTML = ''

    removerPopup()
    await planoAulas(idTurma)

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

    const nome = obVal('nome')

    enviar(`turmas/${idTurma}/nome`, nome)

    const turma = await recuperarDado('turmas', idTurma) || {}
    turma.nome = nome

    await inserirDados({ [idTurma]: turma }, 'turmas')

    removerPopup()

    criarLinhaTurmas(idTurma, turma)

}