const tela = document.getElementById('tela')
const toolbar = document.querySelector('.toolbar')
const titulo = toolbar.querySelector('span')
const horizontal = `display: flex; align-items: center; justify-content: center;`
const vertical = `display: flex; align-items: start; justify-content: start; flex-direction: column`
const nomeBaseCentral = 'PlanUP'
const nomeStore = 'Bases'
const api = `https://leonny.dev.br`
const servidor = 'PLANUP'
let dados_distritos = {}
let etapasProvisorias = {}
let stream;
let telaInterna = null
let emAtualizacao = false
const voltarClientes = `<button style="background-color: #3131ab;" onclick="telaClientes()">Voltar</button>`

function obVal(name) {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? el.value : '';
}

const modelo = (texto, valor, name) => `
    <div style="${vertical};">
        <span>${texto}</span>
        <input name="${name}" placeholder="${texto}" value="${valor || ''}">
    </div>
`
const modeloLivre = (texto, elemento) => `
    <div style="${vertical}; padding: 10px;">
        <span>${texto}</span>
        <div style="width: 90%;">${elemento}</div>
    </div>
`
const dtFormatada = (data) => {
    if (!data) return '--'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

const modeloTabela = (colunas, base, btnExtras) => {

    const ths = colunas
        .map(col => `<th>${col}</th>`).join('')

    const thead = (colunas && colunas.length > 0) ? `<thead>${ths}</thead>` : ''

    return `
    <div class="blocoTabela">
        <div class="painelBotoes">
            <div class="botoes">
                <div class="pesquisa">
                    <input oninput="pesquisar(this, 'body')" placeholder="Pesquisar" style="width: 100%;">
                    <img src="imagens/pesquisar2.png">
                </div>
                ${btnExtras || ''}
            </div>
            <img class="atualizar" src="imagens/atualizar.png" onclick="atualizarDados('${base}')">
        </div>
        <div class="recorteTabela">
            <table class="tabela">
                ${thead}
                <tbody id="body"></tbody>
            </table>
        </div>
        <div class="rodapeTabela"></div>
    </div>
`}

const mensagem = (mensagem, imagem) => `
    <div class="mensagem">
        <img src="${imagem || 'gifs/alerta.gif'}">
        <label>${mensagem}</label>
    </div>
    `
const btnRodape = (texto, funcao) => `
    <button class="btnRodape" onclick="${funcao}">${texto}</button>
`
const btnPadrao = (texto, funcao) => `
        <span class="btnPadrao" onclick="${funcao}">${texto}</span>
`
const btn = (img, valor, funcao) => `
    <div class="btnLateral" onclick="${funcao}">
        <img src="imagens/${img}.png">
        <div>${valor}</div>
    </div>
`
telaLogin()

setInterval(async function () {
    await reprocessarOffline()
}, 30 * 1000)

function exibirSenha(img) {

    let inputSenha = img.previousElementSibling
    const atual = inputSenha.type == 'password'
    inputSenha.type = atual ? 'text' : 'password'
    img.src = `imagens/${atual ? 'olhoAberto' : 'olhoFechado'}.png`

}

function cadastrar() {

    const campos = ['Nome Completo', 'Usuário', 'Senha', 'E-mail', 'Telefone']

    const acumulado = `
        <div class="camposCadastro">
            ${campos.map(campo => `${modelo(campo)}`).join('')}
            <hr style="width: 100%;">
            ${btnPadrao('Criar acesso', 'salvarCadastro()')}
        </div>
        `

    popup(acumulado, 'Cadastro')

}

async function acessoLogin() {

    overlayAguarde()
    const divAcesso = document.getElementById('acesso')
    divAcesso.style.display = 'none'

    const inputs = divAcesso.querySelectorAll('input')
    const url = `${api}/acesso`

    if (inputs[0].value == '' || inputs[1].value == '') {
        popup(mensagem('Senha e/ou usuário não informado(s)'), 'ALERTA', true)
        divAcesso.style.display = 'flex'

    } else {

        const requisicao = {
            tipoAcesso: 'login',
            servidor,
            dados: {
                usuario: inputs[0].value,
                senha: inputs[1].value
            }
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requisicao)
            })
            if (!response.ok) {
                const err = await response.json()
                throw err
            }

            const data = await response.json()

            if (data.mensagem) {
                divAcesso.style.display = 'flex'
                return popup(mensagem(data.mensagem), 'Alerta', true);

            } if (data.permissao == 'novo') {
                popup(mensagem('Alguém do setor de SUPORTE precisa autorizar sua entrada', 'imagens/concluido.png'), 'ALERTA', true)
            } else if (data.permissao !== 'novo') {
                localStorage.setItem('acesso', JSON.stringify(data));
                telaPrincipal()
                removerOverlay()
            }

            divAcesso.style.display = 'flex'

        } catch (e) {
            popup(mensagem(e), 'Alerta', true);
        }

    }
}

async function verificarSupervisor(usuario, senha) {

    const url = `${api}/acesso`
    const requisicao = {
        tipoAcesso: 'login',
        servidor,
        dados: { usuario, senha }
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requisicao)
        })

        if (!response.ok) {
            const err = await response.json()
            throw err
        }

        const data = await response.json()

        if (data.permissao) {
            return 'Senha válida'
        } else {
            return 'Senha Supervisão inválida'
        }
    } catch (e) {
        console.log(e);
        return 'Não foi possível no momento'
    }
}

// NOVO USUÁRIO ; 

function salvarCadastro() {

    overlayAguarde()

    const camposCadastro = document.querySelector('.camposCadastro')
    const campos = camposCadastro.querySelectorAll('input')
    const nome_completo = campos[0].value
    const usuario = campos[1].value
    const senha = campos[2].value
    const email = campos[3].value
    const telefone = campos[4].value

    if (usuario == "" || senha == "" || email == "") {

        popup(mensagem('Senha, usuário ou e-mail não informado(s)'), 'AVISO', true)

    } else {

        const payload = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                servidor,
                tipoAcesso: 'cadastro',
                dados: {
                    usuario,
                    senha,
                    email,
                    nome_completo,
                    telefone
                }
            })
        }

        fetch(`${api}/acesso`, payload)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {

                console.log(data);

                if (data.mensagem) {
                    return popup(mensagem(data.mensagem), 'AVISO', true);
                }

                if (data.permissao == 'novo') {
                    return popup(mensagem('Seu cadastro foi realizado! Alguém do setor de SUPORTE precisa autorizar sua entrada!'), 'ALERTA')
                }

                popup(mensagem('Servidor Offline... fale com o Setor de SUPORTE'), 'AVISO', true)

            })
            .catch(error => {
                popup(mensagem(error.mensagem), 'AVISO', true)
            })

    }

}

function popup(elementoHTML, titulo, naoRemoverAnteriores) {

    const acumulado = `
        <div id="tempPop" class="overlay">

            <div class="janela_fora">
                
                <div class="toolbarPopup">

                    <div style="width: 90%;">${titulo || 'Popup'}</div>
                    <span style="width: 10%" onclick="removerPopup()">×</span>

                </div>
                
                <div class="janela">

                    ${elementoHTML}

                </div>

            </div>

        </div>`

    removerPopup(naoRemoverAnteriores)
    removerOverlay()
    document.body.insertAdjacentHTML('beforeend', acumulado);

}

async function removerPopup(naoRemoverAnteriores) {

    const popUps = document.querySelectorAll('#tempPop')

    if (naoRemoverAnteriores) return

    if (popUps.length > 1) {
        popUps[popUps.length - 1].remove()

    } else {
        popUps.forEach(pop => {
            pop.remove()
        })
    }

    const aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()

}

function removerOverlay() {
    let aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()
}

function overlayAguarde() {

    const aguarde = document.querySelector('.aguarde')
    if (aguarde) aguarde.remove()

    const elemento = `
        <div class="aguarde">
            <img src="gifs/loading.gif">
        </div>
    `
    document.body.insertAdjacentHTML('beforeend', elemento)

    let pageHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
    );

    document.querySelector('.aguarde').style.height = `${pageHeight}px`;

}

async function telaPrincipal() {

    toolbar.style.display = 'flex'
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const acumulado = `

    <div class="menu-container">

        <div class="side-menu" id="sideMenu">

            <br>

            <div class="nomeUsuario">
                <span><strong>${inicialMaiuscula(acesso.permissao)}</strong> ${acesso.usuario}</span>
            </div>

            ${btn('atualizar', 'Atualizar', 'atualizarApp()')}
            ${btn('agenda', 'Agenda', '')}
            ${btn('professor', 'Professores', '')}
            ${btn('disciplina', 'Disciplinas', '')}
            ${btn('perfil', 'Usuários', 'usuarios()')}
            ${btn('configuracoes', 'Configurações', 'telaConfiguracoes()')}
            ${btn('sair', 'Desconectar', 'deslogar()')}

        </div>

        <div class="telaInterna">
            <div class="plano-fundo">
                <img src="imagens/logo.png" style="width: 20rem">
                <p>Seja bem vindo!</p>
            </div>
        </div>
    </div>
    `

    tela.innerHTML = acumulado
    telaInterna = document.querySelector('.telaInterna')

    atualizarApp()

}

async function atualizarApp() {

    if (emAtualizacao) return

    emAtualizacao = true

    mostrarMenus(true)
    sincronizarApp()
    let status = { total: 11, atual: 1 }

    const basesAuxiliares = [
        'professores',
        'disciplinas',
        'agendas',
        'dados_setores'
    ];

    for (const base of basesAuxiliares) {
        sincronizarApp(status)
        await sincronizarDados(base, true)
        status.atual++
    }

    dados_distritos = await recuperarDados('dados_distritos')

    sincronizarApp({ remover: true })

    emAtualizacao = false
}

function sincronizarApp({ atual, total, remover } = {}) {

    if (remover) {

        setTimeout(() => {
            const loader = document.querySelector('.circular-loader')
            if (loader) loader.remove()
            return
        }, 2000)

        return

    } else if (atual) {

        const circumference = 2 * Math.PI * 50;
        const percent = (atual / total) * 100;
        const offset = circumference - (circumference * percent / 100);
        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = offset;
        percentageText.textContent = `${percent.toFixed(0)}%`;

        return

    } else {

        const carregamentoHTML = `
        <div class="circular-loader">
            <svg>
                <circle class="bg" cx="60" cy="60" r="50"></circle>
                <circle class="progress" cx="60" cy="60" r="50"></circle>
            </svg>
            <div class="percentage">0%</div>
        </div>
        `
        const botoesMenu = document.querySelector('.side-menu')
        botoesMenu.insertAdjacentHTML('afterbegin', carregamentoHTML)

        progressCircle = document.querySelector('.circular-loader .progress');
        percentageText = document.querySelector('.circular-loader .percentage');
    }

}

function pesquisarGenerico(coluna, texto, filtro, id) {

    filtro[coluna] = String(texto).toLowerCase().replace('.', '')

    let tbody = document.getElementById(id);
    let trs = tbody.querySelectorAll('tr');
    let contador = 0

    trs.forEach(function (tr) {
        let tds = tr.querySelectorAll('td');
        let mostrarLinha = true;

        for (var col in filtro) {
            let filtroTexto = filtro[col];

            if (filtroTexto && col < tds.length) {
                let element = tds[col].querySelector('input') || tds[col].querySelector('textarea') || tds[col].querySelector('select') || tds[col].textContent
                let conteudoCelula = element.value ? element.value : element
                let texto_campo = String(conteudoCelula).toLowerCase().replace('.', '')

                if (!texto_campo.includes(filtroTexto)) {
                    mostrarLinha = false;
                    break;
                }
            }
        }

        mostrarLinha ? contador++ : ''

        tr.style.display = mostrarLinha ? '' : 'none';
    });

    let contagem = document.getElementById('contagem')
    if (contagem) {
        contagem.textContent = contador
    }

}

async function salvarConfigs() {

    overlayAguarde()

    const emailFolha = document.getElementById('emailFolha').value
    const emailAlertas = document.getElementById('emailAlertas').value

    const configuracoes = {
        emailFolha,
        emailAlertas
    }

    await enviar('configuracoes', configuracoes)
    await inserirDados(configuracoes, 'configuracoes')

    popup(mensagem('Configurações Salvas', 'imagens/concluido.png'), 'Sucesso', true)
}

function verificarClique(event) {
    const menu = document.querySelector('.side-menu');
    if (menu && menu.classList.contains('active') && !menu.contains(event.target)) menu.classList.remove('active')
}

async function usuarios() {

    mostrarMenus()

    const nomeBase = 'dados_setores'
    const acumulado = `
        ${modeloTabela(['Nome', 'Usuário', 'Setor', 'Permissão', ''], nomeBase)}
    `
    titulo.textContent = 'Gerenciar Usuários'
    telaInterna.innerHTML = acumulado

    const dados_setores = await recuperarDados(nomeBase)
    for (const [id, usuario] of Object.entries(dados_setores).reverse()) criarLinha(usuario, id, nomeBase)

}

async function sincronizarDados(base, overlayOff) {

    if (!overlayOff) overlayAguarde()

    let nuvem = await receber(base) || {}
    await inserirDados(nuvem, base)

    if (!overlayOff) removerOverlay()
}

async function atualizarDados(base) {

    overlayAguarde()
    await sincronizarDados(base)

    const dados = await recuperarDados(base)
    for (const [id, objeto] of Object.entries(dados).reverse()) criarLinha(objeto, id, base)
    removerOverlay()

}

function deslogar() {
    localStorage.removeItem('acesso')
    telaLogin()
}

function mostrarMenus(operacao) {
    const menu = document.querySelector('.side-menu').classList

    if (operacao === 'toggle' || operacao === undefined) {
        return menu.toggle('active')
    }

    operacao ? menu.add('active') : menu.remove('active')
}

async function gerenciarUsuario(id) {

    const usuario = await recuperarDado('dados_setores', id)

    const modelo = (texto, elemento) => `
        <div style="${vertical}; gap: 3px;">
            <span style="text-align: left;"><strong>${texto}</strong></span>
            <div>${elemento}</div>
        </div>
    `

    const permissoes = ['', 'novo', 'adm', 'user', 'analista']
        .map(op => `<option ${usuario?.permissao == op ? 'selected' : ''}>${op}</option>`).join('')

    const setores = ['', 'SUPORTE', 'GESTÃO', 'LOGÍSTICA']
        .map(op => `<option ${usuario?.setor == op ? 'selected' : ''}>${op}</option>`).join('')

    const acumulado = `
        <div style="${vertical}; gap: 5px; padding: 2vw; background-color: #d2d2d2;">
            ${modelo('Nome', usuario?.nome_completo || '--')}
            ${modelo('E-mail', usuario?.email || '--')}
            ${modelo('Permissão', `<select onchange="configuracoes('${id}', 'permissao', this.value)">${permissoes}</select>`)}
            ${modelo('Setor', `<select onchange="configuracoes('${id}', 'setor', this.value)">${setores}</select>`)}
        </div>
    `

    popup(acumulado, 'Usuário')
}

function dinheiro(valor) {
    if (!valor) return '€ 0,00';

    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'EUR'
    });
}


function unicoID() {
    var d = new Date().getTime();
    if (window.performance && typeof window.performance.now === "function") {
        d += performance.now();
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

function telaLogin() {

    const acesso = JSON.parse(localStorage.getItem('acesso'))
    if (acesso) return telaPrincipal()

    toolbar.style.display = 'none'

    const acumulado = `
        
        <div id="acesso" class="loginBloco">

            <div class="botaoSuperiorLogin">
                <span>Acesso ao sistema</span>
            </div>

            <div class="baixoLogin">

                <br>
                <img src="imagens/acesso.png" class="cadeado">

                <div style="padding: 20px; display: flex; flex-direction: column; align-items: start; justify-content: center;">

                    <label>Usuário</label>
                    <input type="text" placeholder="Usuário">

                    <label>Senha</label>
                    <div style="${horizontal}; gap: 10px;">
                        <input type="password" placeholder="Senha">
                        <img src="imagens/olhoFechado.png" class="olho" onclick="exibirSenha(this)">
                    </div>

                    <br>
                    <button onclick="acessoLogin()">Entrar</button>

                </div>
                <div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                    <label>Primeiro acesso?</label>
                    <button style="background-color: #097fe6; white-space: nowrap;" onclick="cadastrar()">Cadastre-se</button>
                </div>
                <br>
            </div>

        </div>
    `

    tela.innerHTML = acumulado
}

// API
function enviar(caminho, info) {
    return new Promise((resolve) => {
        let objeto = {
            caminho: caminho,
            valor: info,
            servidor
        };

        fetch(`${api}/salvar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(objeto)
        })
            .then(data => resolve(data))
            .catch(() => {
                salvarOffline(objeto, 'enviar')
                resolve();
            });
    });
}

function erroConexao() {
    const acumulado = `
        <div id="erroConexao" style="${horizontal}; gap: 1rem; background-color: #d2d2d2; padding: 1rem;">
            <img src="gifs/alerta.gif" style="width: 2rem;">
            <span><b>Dados não sincronizados:</b> tente novamente em minutos.</span>
        </div>
    `
    const erroConexao = document.getElementById('erroConexao')
    if (!erroConexao) popup(acumulado, 'Sincronização', true)

    sincronizarApp({ remover: true })
    emAtualizacao = false

}

async function receber(chave) {

    const chavePartes = chave.split('/')
    let timestamp = 0
    const dados = await recuperarDados(chavePartes[0]) || {}

    for (const [, objeto] of Object.entries(dados)) {
        if (objeto.timestamp && objeto.timestamp > timestamp) timestamp = objeto.timestamp
    }

    const objeto = {
        servidor,
        chave: chave,
        timestamp: timestamp
    };

    const obs = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(objeto)
    };

    return new Promise((resolve, reject) => {
        fetch(`${api}/dados`, obs)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data)
            })
            .catch(err => {
                erroConexao()
                resolve({})
            });
    })
}

async function deletar(chave) {
    const url = `${api}/deletar`;
    const acesso = JSON.parse(localStorage.getItem('acesso'))
    const objeto = {
        chave,
        usuario: acesso.usuario,
        servidor
    }

    return new Promise((resolve) => {
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(objeto)
        })
            .then(response => response.json())
            .then(data => {
                resolve(data);
            })
            .catch((err) => {
                salvarOffline(objeto, 'deletar', idEvento);
                popup(mensagem(err), 'Aviso', true)
                resolve();
            });
    });
}

async function cxOpcoes(name, nomeBase, campos, funcaoAux) {

    let base = await recuperarDados(nomeBase)
    let opcoesDiv = ''

    for ([cod, dado] of Object.entries(base)) {

        const labels = campos
            .map(campo => `${(dado[campo] && dado[campo] !== '') ? `<label>${dado[campo]}</label>` : ''}`)
            .join('')

        opcoesDiv += `
            <div name="camposOpcoes" class="atalhos" onclick="selecionar('${name}', '${cod}', '${dado[campos[0]]}' ${funcaoAux ? `, '${funcaoAux}'` : ''})" style="${vertical}; gap: 2px; max-width: 40vw;">
                ${labels}
            </div>`
    }

    const acumulado = `
        <div style="${horizontal}; justify-content: left; background-color: #b1b1b1;">
            <div style="${horizontal}; padding-left: 1vw; padding-right: 1vw; margin: 5px; background-color: white; border-radius: 10px;">
                <input oninput="pesquisarCX(this)" placeholder="Pesquisar itens" style="width: 100%;">
                <img src="imagens/pesquisar2.png" style="width: 1.5vw;">
            </div>
        </div>
        <div style="padding: 1vw; gap: 5px; ${vertical}; background-color: #d2d2d2; width: 30vw; max-height: 40vh; height: max-content; overflow-y: auto; overflow-x: hidden;">
            ${opcoesDiv}
        </div>
    `

    popup(acumulado, 'Selecione o item', true)

}

async function selecionar(name, id, termo, funcaoAux) {
    const elemento = document.querySelector(`[name='${name}']`)
    elemento.textContent = termo
    elemento.id = id
    removerPopup()

    if (funcaoAux) await eval(funcaoAux)
}

function pesquisarCX(input) {

    const termoPesquisa = String(input.value).toLowerCase()

    const divs = document.querySelectorAll(`[name='camposOpcoes']`)

    for (const div of divs) {

        const termoDiv = String(div.textContent).toLocaleLowerCase()

        div.style.display = (termoDiv.includes(termoPesquisa) || termoPesquisa == '') ? '' : 'none'

    }

}

function inicialMaiuscula(string) {
    if (string == undefined) {
        return ''
    }
    string.includes('_') ? string = string.split('_').join(' ') : ''

    if (string.includes('lpu')) return string.toUpperCase()
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function configuracoes(usuario, campo, valor) {

    let dados_usuario = await recuperarDado('dados_setores', usuario)
    dados_usuario[campo] = valor
    await inserirDados({ [usuario]: dados_usuario }, 'dados_setores')
    criarLinha(dados_usuario, usuario, 'dados_setores')

    return new Promise((resolve, reject) => {
        fetch(`${api}/configuracoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, campo, valor, servidor })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                console.log(err)
                reject()
            });
    })
}

function porcentagemHtml(valor) {
    valor = conversor(valor);
    const percentual = isNaN(valor) ? 0 : Math.max(0, valor).toFixed(0);

    let cor;
    if (percentual < 50) cor = 'red';
    else if (percentual < 100) cor = 'orange';
    else if (percentual > 100) cor = 'blue';
    else cor = 'green';

    return `
    <div style="display:flex; align-items:center; gap:4px;">
        <span style="color:#888; font-size:14px;">${percentual}%</span>
        <div class="barra" style="flex:1; height:8px; background:#ddd;">
            <div style="width:${percentual}%; height:100%; background:${cor};"></div>
        </div>
    </div>
  `;
}

async function caixa(id, button) {

    const existente = document.getElementById('caixa-temporaria');
    if (existente) existente.remove();

    const caixa = document.createElement('div');
    caixa.id = 'caixa-temporaria';
    caixa.classList = 'caixa'

    const rect = button.getBoundingClientRect();
    caixa.style.top = (window.scrollY + rect.bottom) + 'px';
    caixa.style.left = (window.scrollX + rect.left) + 'px';

    caixa.innerHTML = `
        <span onclick="editarTarefa('${id}', 'novo')">Etapa</span>
        <span onclick="editarTarefa('${id}', 'novo', 'novo')">Tarefa</span>
    `;

    document.body.appendChild(caixa);

    const removerCaixa = (e) => {
        if (!caixa.contains(e.target) && e.target !== button) {
            caixa.remove();
            document.removeEventListener('click', removerCaixa);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', removerCaixa);
    }, 0);
}

function pesquisar(input, idTbody) {
    const termo = input.value.trim().toLowerCase();
    const tbody = document.getElementById(idTbody);
    const trs = tbody.querySelectorAll('tr');

    trs.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        let encontrou = false;

        tds.forEach(td => {
            let texto = td.textContent.trim().toLowerCase();

            const inputInterno = td.querySelector('input, textarea, select');
            if (inputInterno) {
                texto += ' ' + inputInterno.value.trim().toLowerCase();
            }

            if (termo && texto.includes(termo)) {
                encontrou = true;
            }
        });

        if (!termo || encontrou) {
            tr.style.display = ''; // mostra
        } else {
            tr.style.display = 'none'; // oculta
        }
    });
}

function conversor(stringMonetario) {
    if (typeof stringMonetario === 'number') {
        return stringMonetario;
    } else if (!stringMonetario || stringMonetario.trim() === "") {
        return 0;
    } else {
        stringMonetario = stringMonetario.trim();
        stringMonetario = stringMonetario.replace(/[^\d,]/g, '');
        stringMonetario = stringMonetario.replace(',', '.');
        var valorNumerico = parseFloat(stringMonetario);

        if (isNaN(valorNumerico)) {
            return 0;
        }

        return valorNumerico;
    }
}

function ID5digitos() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
        const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
        id += caracteres.charAt(indiceAleatorio);
    }
    return id;
}

function base64ToFile(base64, filename = 'foto.png') {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

async function importarAnexos({ input, foto }) {
    const formData = new FormData();

    if (foto) {
        const imagem = base64ToFile(foto);
        formData.append('arquivos', imagem);
    } else {
        for (const file of input.files) {
            formData.append('arquivos', file);
        }
    }

    try {
        const response = await fetch(`${api}/upload/RECONST`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (err) {
        popup(mensagem(`Erro na API: ${err}`));
        throw err;
    }
}

function criarAnexoVisual({ link, funcao }) {

    let displayExcluir = 'flex'

    if (!funcao) displayExcluir = 'none'

    return `
        <div class="contornoAnexos" name="${link}">
            <div onclick="abrirArquivo('${link}')" class="contornoInterno">
                <img src="imagens/anexo2.png">
                <label>Arquivo</label>
            </div>
            <img src="imagens/cancel.png" style="display: ${displayExcluir};" onclick="${funcao}">
        </div>`
}

function abrirArquivo(link) {
    link = `${api}/uploads/RECONST/${link}`;
    const imagens = ['png', 'jpg', 'jpeg'];

    const extensao = link.split('.').pop().toLowerCase(); // pega sem o ponto

    if (imagens.includes(extensao)) {
        const acumulado = `
            <div class="fundoImagens">
                <img src="${link}">
            </div>
        `
        return popup(acumulado, 'Arquivo', true);
    }

    window.open(link, '_blank');
}

function salvarOffline(objeto, operacao, idEvento) {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline')) || {}
    idEvento = idEvento || ID5digitos()

    if (!dados_offline[operacao]) dados_offline[operacao] = {}
    dados_offline[operacao][idEvento] = objeto

    localStorage.setItem('dados_offline', JSON.stringify(dados_offline))
}

async function reprocessarOffline() {
    let dados_offline = JSON.parse(localStorage.getItem('dados_offline')) || {};

    for (let [operacao, operacoes] of Object.entries(dados_offline)) {
        const ids = Object.keys(operacoes);

        for (let idEvento of ids) {
            const evento = operacoes[idEvento];

            if (operacao === 'enviar') {
                await enviar(evento.caminho, evento.valor, idEvento);
            } else if (operacao === 'deletar', idEvento) {
                await deletar(evento.chave, idEvento);
            }

        }
    }
}