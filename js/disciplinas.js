async function telaDisciplinas() {

    mostrarMenus()

    const btn = `<button onclick="adicionarDisciplina()">Adicionar</button>`
    const nomeBase = 'disciplinas'
    const acumulado = `
        ${modeloTabela(['Nome', 'Manhã (4h)', 'Tarde (4h)', 'Noite (2h)', ''], nomeBase, btn)}
    `
    titulo.textContent = 'Disciplinas'
    telaInterna.innerHTML = acumulado

    const base = await recuperarDados(nomeBase)
    for (const [id, dados] of Object.entries(base).reverse()) {
        criarLinhaDisciplinas(id, dados)
    }

}

function criarLinhaDisciplinas(idDisciplina, dados) {

    const tds = `
        <td>${dados?.nome || ''}</td>
        <td>${dados?.manha || ''}</td>
        <td>${dados?.tarde || ''}</td>
        <td>${dados?.noite || ''}</td>
        <td>
            <img onclick="adicionarDisciplina('${idDisciplina}')" src="imagens/pesquisar.png" style="width: 2rem;">
        </td>
    `

    const trExistente = document.getElementById(idDisciplina)
    if (trExistente) return trExistente.innerHTML = tds

    document.getElementById('body').insertAdjacentHTML('beforeend', `<tr id="${idDisciplina}">${tds}</tr>`)
}

async function adicionarDisciplina(idDisciplina) {

    const disciplina = await recuperarDado('disciplinas', idDisciplina)

    const acumulado = `
        <div class="formulario">
            
            ${modeloLivre('Nome', `<input name="nome" value="${disciplina?.nome || ''}">`)}
            ${modeloLivre('Manhã', `<input name="manha" type="number" value="${disciplina?.manha || ''}">`)}
            ${modeloLivre('Tarde', `<input name="tarde" type="number" value="${disciplina?.tarde || ''}">`)}
            ${modeloLivre('Noite', `<input name="noite" type="number" value="${disciplina?.noite || ''}">`)}

            <hr>
            
            <div style="${horizontal}; width: 100%; justify-content: space-between;">
                <button onclick="salvarDisciplina(${idDisciplina ? `'${idDisciplina}'` : ''})">Salvar</button>
                ${idDisciplina ? `<button style="background-color: #B12425;" onclick="confirmarExclusaoDisciplina('${idDisciplina}')">Excluir</button>` : ''}
            </div>

        </div>
    `

    popup(acumulado, 'Gerenciar', true)

}

async function confirmarExclusaoDisciplina(idDisciplina) {

    const acumulado = `
        <div style="${horizontal}; background-color: #d2d2d2; padding: 2rem; gap: 1rem;">

            <img src="gifs/alerta.gif" style="width: 3rem;">
            <span>Você tem certeza disso?</span>
            <button onclick="excluirDisciplina('${idDisciplina}')">Confirmar</button>

        </div>
    `

    popup(acumulado, 'Tem certeza?', true)

}

async function excluirDisciplina(idDisciplina) {

    removerPopup() // telaProf
    removerPopup() // popup conf
    overlayAguarde()

    const resposta = await deletar(`disciplinas/${idDisciplina}`)

    if (!resposta.err) {
        deletarDB('disciplinas', idDisciplina)
        const linha = document.getElementById(idDisciplina)
        if (linha) linha.remove()
        removerOverlay()
    }

}

async function salvarDisciplina(idDisciplina) {

    overlayAguarde()

    idDisciplina = idDisciplina || ID5digitos()

    const disciplina = {
        nome: obVal('nome'),
        manha: Number(obVal('manha')),
        tarde: Number(obVal('tarde')),
        noite: Number(obVal('noite'))
    }

    enviar(`disciplinas/${idDisciplina}`, disciplina)
    await inserirDados({ [idDisciplina]: disciplina }, 'disciplinas')

    removerPopup()

    criarLinhaDisciplinas(idDisciplina, disciplina)

}