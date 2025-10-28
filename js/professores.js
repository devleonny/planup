const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']

async function telaProfessores() {

    mostrarMenus()

    const btn = `<button onclick="adicionarProfessor()">Adicionar</button>`
    const nomeBase = 'professores'
    const acumulado = `
        ${modeloTabela(['Nome', 'Disponibilidade', 'E-mail', 'Contato', ''], nomeBase, btn)}
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
    for (const [dia, status] of Object.entries(dados.disponibilidade || {})) {
        if (status) strDisp += `<span class="contorno-dias" style="background-color: #fdf7beff;">${dia}</span>`
    }

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>
            <div style="${horizontal}; gap: 2px;">
                ${strDisp}
            </div>
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

async function adicionarProfessor(idProfessor) {

    const professor = await recuperarDado('professores', idProfessor)
    const disponibilidade = professor?.disponibilidade || {}

    const strDias = dias.map(dia => `
        <div class="contorno-dias">
            <input name="${dia}" type="checkbox" ${disponibilidade?.[dia] ? 'checked' : ''}>
            <span>${dia}</span>
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

    const disponibilidade = {}

    for (const dia of dias) {
        const input = document.querySelector(`[name="${dia}"]`)
        disponibilidade[dia] = input.checked
    }

    const professor = {
        nome: obVal('nome'),
        email: obVal('email'),
        contato: obVal('contato'),
        disponibilidade
    }

    enviar(`professores/${idProfessor}`, professor)
    await inserirDados({ [idProfessor]: professor }, 'professores')

    removerPopup()

    criarLinhaProfessores(idProfessor, professor)

}