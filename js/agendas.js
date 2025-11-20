const meses = {
    '1': 'Janeiro',
    '2': 'Fevereiro',
    '3': 'Março',
    '4': 'Abril',
    '5': 'Maio',
    '6': 'Junho',
    '7': 'Julho',
    '8': 'Agosto',
    '9': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
}

async function telaAgendas() {

    mostrarMenus()

    const professores = await recuperarDados('dados_setores')
    const disciplinas = await recuperarDados('disciplinas')

    const opcProf = Object.entries(professores)
        .sort((a, b) => a[1].nome_completo.localeCompare(b[1].nome_completo))
        .map(([idProfessor, professor]) => `<option id="${idProfessor}">${professor.nome_completo}</option>`)
        .join('')

    const opcDisc = `<option></option>${Object.entries(disciplinas)
        .map(([idDisciplina, disciplina]) => `<option id="${idDisciplina}">${disciplina.nome}</option>`)
        .join('')}`

    const modelo = (texto, elemento) => `
    <div style="${vertical}; gap: 5px;">
      <span>${texto}</span>
      ${elemento}
    </div>
  `

    const acumulado = `
    <div class="painel-agenda">
      <img src="gifs/agenda.gif">
      ${modelo('Professores', `<select name="prof">${opcProf}</select>`)}
      ${modelo('Disciplinas', `<select name="disciplina">${opcDisc}</select>`)}
      ${modelo('Data Início', `<input name="dtIni" type="date">`)}
      ${modelo('Data Final', `<input name="dtFin" type="date">`)}
      <button onclick="filtrarAgendas()">Filtrar</button>
    </div>
    <div class="calendarios"></div>
  `

    titulo.textContent = 'Agendas'
    telaInterna.innerHTML = acumulado
}

async function filtrarAgendas() {
    overlayAguarde()

    const disciplinas = await recuperarDados('disciplinas')
    const turmas = await recuperarDados('turmas')

    const el = (name) => document.querySelector(`[name="${name}"]`)
    const prof = el('prof')
    const disciplinaProf = el('disciplina')
    const dtIniInput = el('dtIni')
    const dtFinInput = el('dtFin')

    const idProf = prof?.options[prof.selectedIndex]?.id
    const idDisciplinaSelect = disciplinaProf?.options[disciplinaProf.selectedIndex]?.id

    // define limites se informados
    const filtroIni = dtIniInput?.value ? new Date(dtIniInput.value + 'T00:00:00Z') : null
    const filtroFin = dtFinInput?.value ? new Date(dtFinInput.value + 'T00:00:00Z') : null

    const datas = {}

    for (const [idDisciplina, discip] of Object.entries(disciplinas)) {
        if (idDisciplinaSelect && idDisciplina !== idDisciplinaSelect) continue

        for (const [idTurma, dados] of Object.entries(discip?.turmas || {})) {
            if (!dados.dtInicio || !dados.dtTermino || !dados.dispDias) continue
            if (idProf && dados.professor !== idProf) continue

            datas[idDisciplina] ??= {}
            datas[idDisciplina].lista ??= []
            datas[idDisciplina].idTurma = turmas?.[idTurma]?.nome || '--'

            const inicio = new Date(dados.dtInicio + "T00:00:00Z")
            const fim = new Date(dados.dtTermino + "T00:00:00Z")

            for (let d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
                if (filtroIni && d < filtroIni) continue
                if (filtroFin && d > filtroFin) continue

                const diaSemana = d.getUTCDay()
                const chaves = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
                const chaveDia = chaves[diaSemana]

                if (dados.dispDias[chaveDia]) {
                    const dataStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
                    datas[idDisciplina].lista.push(dataStr)
                }
            }
        }
    }

    await criarCalendario(datas)
    removerOverlay()
}


async function criarCalendario(datas) {

    const ths = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        .map(sem => `<th>${sem}</th>`).join('')

    const disciplinas = await recuperarDados('disciplinas')
    const cores = {}
    const randomColor = () => `hsl(${Math.floor(Math.random() * 360)} 65% 55%)`
    for (const cod in datas) cores[cod] = disciplinas?.[cod]?.cor || randomColor()

    const mapaDatas = {}
    for (const [cod, obj] of Object.entries(datas)) {
        for (const dt of obj.lista) {
            if (!mapaDatas[dt]) mapaDatas[dt] = []
            if (!mapaDatas[dt].includes(cod)) mapaDatas[dt].push(cod)
        }
    }

    const grupos = {}
    for (const dtStr of Object.keys(mapaDatas)) {
        const [ano, mes, dia] = dtStr.split('-').map(Number)
        const chave = `${ano}-${String(mes).padStart(2, '0')}`
        if (!grupos[chave]) grupos[chave] = { ano, mes, dias: {} }
        grupos[chave].dias[dia] = mapaDatas[dtStr]
    }

    let calendarios = ''

    for (const chave in grupos) {
        const { ano, mes, dias } = grupos[chave]
        const diasMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()

        let trs = ''
        let tds = ''
        let primeiroDia = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay()

        for (let v = 0; v < primeiroDia; v++) tds += `<td></td>`

        for (let i = 1; i <= diasMes; i++) {
            const disciplinasDia = dias[i] || []
            let estilo = ''
            let title = ''

            if (disciplinasDia.length) {
                // monta tooltip com os nomes das disciplinas
                title = disciplinasDia
                    .map(cod => disciplinas?.[cod]?.nome || '(Sem nome)')
                    .join(' / ')

                if (disciplinasDia.length) {
                    title = disciplinasDia
                        .map(cod => {
                            const disc = disciplinas?.[cod]
                            const nome = disc?.nome || '(Sem nome)'
                            const turma = datas[cod]?.idTurma || '(Sem turma)'
                            return `${turma} > ${nome}`
                        })
                        .join(' / ')

                    if (disciplinasDia.length === 1) {
                        estilo = `style="background:${cores[disciplinasDia[0]]}; color:#fff; font-weight:600"`
                    } else {
                        const n = disciplinasDia.length
                        const gradientes = disciplinasDia
                            .map((cod, idx) => {
                                const start = (idx * 100) / n
                                const end = ((idx + 1) * 100) / n
                                return `${cores[cod]} ${start}% ${end}%`
                            })
                            .join(', ')
                        estilo = `style="background: linear-gradient(90deg, ${gradientes}); color:#fff; font-weight:600"`
                    }
                }

            }

            const sem = new Date(Date.UTC(ano, mes - 1, i)).getUTCDay()
            tds += `<td ${estilo} title="${title}">${i}</td>`

            if (sem === 6) {
                trs += `<tr>${tds}</tr>`
                tds = ''
            }
        }

        if (tds) {
            for (let v = new Date(Date.UTC(ano, mes - 1, diasMes)).getUTCDay() + 1; v <= 6; v++) tds += `<td></td>`
            trs += `<tr>${tds}</tr>`
        }

        calendarios += `
      <div class="borda-tabela">
        <div class="topo-tabela">
          <span style="padding:5px;">${meses[mes]} ${ano}</span>
        </div>
        <div class="div-tabela">
          <table class="tabela">
            <thead><tr>${ths}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
      </div>
    `
    }

    const divCalendarios = document.querySelector('.calendarios')
    if (divCalendarios) divCalendarios.innerHTML = calendarios
}
