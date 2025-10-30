const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const turnos = ['Manhã', 'Tarde', 'Noite']

async function telaProfessores() {

    mostrarMenus()

    const btn = `<button onclick="adicionarProfessor()">Adicionar</button>`
    const nomeBase = 'professores'
    const acumulado = `
        ${modeloTabela({ colunas: ['Nome', 'Semanal', 'Turno', 'Disciplinas', 'E-mail', 'Contato', ''], base: nomeBase, btnExtras: btn })}
    `
    titulo.textContent = 'Professores'
    telaInterna.innerHTML = acumulado

    const base = await recuperarDados(nomeBase)
    for (const [id, dados] of Object.entries(base).reverse()) {
        criarLinhaProfessores(id, dados)
    }

}

function criarLinhaProfessores(idProfessor, dados) {

    let strDisp = ''
    for (const [dia, status] of Object.entries(dados?.dispDias || {})) {
        if (status) strDisp += `<span class="contorno-dias-semana">${dia}</span>`
    }

    let strDispTurno = ''
    for (const [turno, status] of Object.entries(dados?.dispTurnos || {})) {
        if (status) strDispTurno += `<span class="contorno-dias-semana">${turno}</span>`
    }

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>
            <div style="${horizontal}; gap: 2px;">
                ${strDisp}
            </div>
        </td>
        <td>
            <div style="${horizontal}; gap: 2px;">
                ${strDispTurno}
            </div>
        </td>
        <td>
            <img onclick="painelDisciplinas('${idProfessor}')" src="imagens/turmas.png" style="width: 1.8rem;">
        </td>
        <td>${dados?.email || ''}</td>
        <td>${dados?.contato || ''}</td>
        <td>
            <img onclick="adicionarProfessor('${idProfessor}')" src="imagens/pesquisar.png" style="width: 2rem;">
        </td>
    `

    const trExistente = document.getElementById(idProfessor)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idProfessor}">${tds}</tr>`)
}

async function painelDisciplinas(idProfessor) {

    const acumulado = `
    <div style="background-color: #d2d2d2; padding; 2rem;">
        ${modeloTabela({ colunas: ['Nome', 'Selecione'], body: 'body2', removerPesquisa: true })}
    </div>
    `

    popup(acumulado, 'Selecione as disciplinas', true)

    const disciplinas = await recuperarDados('disciplinas')
    const body = document.getElementById('body2')

    for (const [idDisciplina, dados] of Object.entries(disciplinas)) {
        const tr = `
        <tr>
            <td>${dados.nome}</td>
            <td>
                <input ${dados?.professores?.[idProfessor] ? 'checked' : ''} style="width: 2rem; height: 2rem;" type="checkbox" onchange="gerenciarProfessor(this, '${idProfessor}', '${idDisciplina}')">
            </td>
        </tr>
        `
        body.insertAdjacentHTML('beforeend', tr)
    }

}

async function gerenciarProfessor(input, idProfessor, idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    if (!disciplina.professores) disciplina.professores = {}

    if (input.checked) {
        disciplina.professores[idProfessor] = {}
        enviar(`disciplinas/${idDisciplina}/professores/${idProfessor}`, true)
    } else {
        delete disciplina.professores[idProfessor]
        deletar(`disciplinas/${idDisciplina}/professores/${idProfessor}`)
    }


    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')

}

async function adicionarProfessor(idProfessor) {

    const professor = await recuperarDado('professores', idProfessor)

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input name="${dia}" type="checkbox" ${professor?.dispDias?.[dia] ? 'checked' : ''}>
            <span>${dia}</span>
        </div>
        `).join('')

    const strTurnos = turnos.map(turno => `
        <div class="contorno-dias">
            <input name="${turno}" type="checkbox" ${professor?.dispTurnos?.[turno] ? 'checked' : ''}>
            <span>${turno}</span>
        </div>
        `).join('')

    const acumulado = `
        <div class="formulario">
            
            ${modeloLivre('Nome', `<input name="nome" value="${professor?.nome || ''}">`)}
            ${modeloLivre('Disponibilidade', `
                <div style="${horizontal}; gap: 3px;">
                    ${strDias}
                </div>
                `)}
            ${modeloLivre('Turnos', `
                <div style="${horizontal}; gap: 3px;">
                    ${strTurnos}
                </div>
                `)}
            ${modeloLivre('E-mail', `<input name="email" value="${professor?.email || ''}">`)}
            ${modeloLivre('Contato', `<input name="contato" value="${professor?.contato || ''}">`)}

            <hr>
            
            <div style="${horizontal}; width: 100%; justify-content: space-between;">
                <button onclick="salvarProfessor(${idProfessor ? `'${idProfessor}'` : ''})">Salvar</button>
                ${idProfessor ? `<button style="background-color: #B12425;" onclick="confirmarExclusaoProfessor('${idProfessor}')">Excluir</button>` : ''}
            </div>

        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function confirmarExclusaoProfessor(idProfessor) {

    const acumulado = `
        <div style="${horizontal}; background-color: #d2d2d2; padding: 2rem; gap: 1rem;">

            <img src="gifs/alerta.gif" style="width: 3rem;">
            <span>Você tem certeza disso?</span>
            <button onclick="excluirProfessor('${idProfessor}')">Confirmar</button>

        </div>
    `

    popup(acumulado, 'Tem certeza?', true)

}

async function excluirProfessor(idProfessor) {

    removerPopup() // telaProf
    removerPopup() // popup conf
    overlayAguarde()

    const resposta = await deletar(`professores/${idProfessor}`)

    if (!resposta.err) {
        deletarDB('professores', idProfessor)
        const linha = document.getElementById(idProfessor)
        if (linha) linha.remove()
        removerOverlay()
    }

}

async function salvarProfessor(idProfessor) {

    overlayAguarde()

    idProfessor = idProfessor || ID5digitos()

    const dispDias = {}
    const dispTurnos = {}

    for (const dia of dias) {
        const input = document.querySelector(`[name="${dia}"]`)
        dispDias[dia] = input.checked
    }

    for (const turno of turnos) {
        const input = document.querySelector(`[name="${turno}"]`)
        dispTurnos[turno] = input.checked
    }

    const professor = {
        nome: obVal('nome'),
        email: obVal('email'),
        contato: obVal('contato'),
        dispDias,
        dispTurnos
    }

    enviar(`professores/${idProfessor}`, professor)
    await inserirDados({ [idProfessor]: professor }, 'professores')

    removerPopup()

    criarLinhaProfessores(idProfessor, professor)

}