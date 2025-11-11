const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const turnos = ['Manhã', 'Tarde', 'Noite', 'MT']
const permissoes = ['coordenador', 'professor', 'administrativo', 'novo']

async function telaUsuarios() {

    mostrarMenus()

    const nomeBase = 'professores'
    const acumulado = `
        ${modeloTabela({ colunas: ['Nome', 'Setor', 'Dias da Semana', 'Turnos', 'Disciplinas de Interesse', 'E-mail', 'Telefone', ''], base: nomeBase })}
    `
    titulo.textContent = 'Gerenciar Professores'
    telaInterna.innerHTML = acumulado

    const dados = await recuperarDados(`dados_setores`)
    for (const [usuario, d] of Object.entries(dados).reverse()) {

        const professor = await recuperarDado('professores', usuario) || {}

        const mesclado = {
            ...d,
            ...Object.fromEntries(Object.entries(professor).filter(([_, v]) => v !== '' && v != null))
        }

        await criarLinhaUsuarios(usuario, mesclado)
    }

}

async function criarLinhaUsuarios(usuario, dados) {

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input onchange="salvarPrefs(this, '${usuario}')" data-chave="${dia}" data-objeto="dispDias" type="checkbox" ${dados?.dispDias?.[dia] ? 'checked' : ''}>
            <span>${dia}</span>
        </div>
        `).join('')

    const strTurnos = turnos.map(turno => `
        <div class="contorno-dias">
            <input onchange="salvarPrefs(this, '${usuario}')" data-chave="${turno}" data-objeto="dispTurnos" type="checkbox" ${dados?.dispTurnos?.[turno] ? 'checked' : ''}>
            <span>${turno}</span>
        </div>
        `).join('')

    const tds = `
        <td>${dados?.nome_completo || ''}</td>
        <td>${dados?.permissao || ''}</td>
        <td>
            <div style="${horizontal}; gap: 1px;">
                ${strDias}
            </div>
        </td>
        <td>
            <div style="${horizontal}; gap: 1px;">
                ${strTurnos}
            </div>
        </td>
        <td>
            <img onclick="painelDisciplinas('${usuario}')" src="imagens/turmas.png" style="width: 2.3rem;">
        </td>
        <td>${dados?.email || ''}</td>
        <td>${dados?.telefone || ''}</td>
        <td>
           <img onclick="adicionarProfessor('${usuario}')" src="imagens/pesquisar.png" style="width: 2rem;">
        </td>
    `

    const trExistente = document.getElementById(usuario)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${usuario}">${tds}</tr>`)
}

async function painelDisciplinas(idProfessor) {

    const acumulado = `
    <div style="background-color: #d2d2d2; padding: 2rem;">
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

    const acesso = JSON.parse(localStorage.getItem('acesso')) || {}

    const dadosProfessor = await recuperarDado('professores', idProfessor) || {}

    const professor = {
        ...await recuperarDado('dados_setores', idProfessor),
        ...Object.fromEntries(Object.entries(dadosProfessor).filter(([_, v]) => v !== '' && v != null))
    }

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


    const exclusivo = `
        <hr>
        ${modeloLivre('Permissão',
        `<select onchange="configuracoes('${idProfessor}', 'permissao', this.value)">
                ${permissoes.map(op => `<option ${professor?.permissao == op ? 'selected' : ''}>${op}</option>`).join('')}
            </select>`)
        }`

    const acumulado = `
        <div class="formulario">
            
            ${modeloLivre('Nome', `<input name="nome_completo" value="${professor?.nome_completo || ''}">`)}
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
            
            <div style="${horizontal}; gap: 1rem;">
                <span>Disciplinas de Interesse</span>
                <img onclick="painelDisciplinas('${idProfessor}')" src="imagens/turmas.png" style="width: 2.3rem;">
            </div>
            ${modeloLivre('E-mail', `<input name="email" value="${professor?.email || ''}">`)}
            ${modeloLivre('Telefone', `<input name="contato" value="${professor?.telefone || ''}">`)}

            ${acesso?.permissao == 'coordenador' ? exclusivo : ''}    

            <hr>
            
            <div style="${horizontal}; width: 100%; justify-content: space-between;">
                <button onclick="salvarProfessor(${idProfessor ? `'${idProfessor}'` : ''})">Salvar</button>
            </div>

        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function salvarProfessor(usuario) {

    overlayAguarde()

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

    const campos = {
        nome_completo: obVal('nome_completo'),
        email: obVal('email'),
        contato: obVal('contato'),
        dispDias,
        dispTurnos
    }

    await Promise.all(
        Object.entries(campos).map(([campo, valor]) =>
            enviar(`professores/${usuario}/${campo}`, valor)
        )
    )

    await inserirDados({ [usuario]: campos }, 'professores')

    removerPopup()

    const divProfs = document.getElementById('divProfs')
    if (divProfs) {
        const idDisciplina = divProfs.dataset.disciplina
        return await professoresDisponiveis(idDisciplina)
    }

    telaUsuarios()

}

async function salvarPrefs(input, usuario) {
    const { objeto, chave } = input.dataset
    const valor = input.checked

    const professor = await recuperarDado('professores', usuario) || {}

    professor[objeto] ??= {}
    professor[objeto][chave] = valor

    enviar(`professores/${usuario}/${objeto}/${chave}`, valor)
    inserirDados({ [usuario]: professor }, 'professores')
}