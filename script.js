document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNÇÕES DE NOTIFICAÇÃO (TOAST)
    // ==========================================
    function mostrarToast(mensagem, tipo = 'sucesso') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-msg ${tipo}`;
        toast.innerText = mensagem;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ==========================================
    // 1. LOGIN, MODAL DE SAIR E NAVEGAÇÃO
    // ==========================================
    document.querySelector('.btn-login').addEventListener('click', () => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'flex';
        abrirAba('aba-inicio');
        carregarLogs();
    });

    const btnSair = document.getElementById('btn-sair');
    const modalSair = document.getElementById('modal-sair');
    const btnCancelarSair = document.getElementById('btn-cancelar-sair');
    const btnConfirmarSair = document.getElementById('btn-confirmar-sair');

    btnSair.addEventListener('click', (e) => {
        e.preventDefault();
        modalSair.style.display = 'flex';
    });

    btnCancelarSair.addEventListener('click', () => {
        modalSair.style.display = 'none';
    });

    btnConfirmarSair.addEventListener('click', () => {
        modalSair.style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.querySelector('.login-form').reset();
        abrirAba('aba-inicio');
    });

    const linksNav = document.querySelectorAll('.horizontal-nav a:not(#btn-sair)');
    const secoes = document.querySelectorAll('.view-section');

    function abrirAba(idAba) {
        secoes.forEach(s => s.style.display = 'none');
        linksNav.forEach(l => l.classList.remove('active'));

        document.getElementById(idAba).style.display = 'block';
        const linkAtivo = document.querySelector(`.horizontal-nav a[data-target="${idAba}"]`);
        if (linkAtivo) linkAtivo.classList.add('active');

        const itensMenu = document.querySelectorAll('.horizontal-nav ul li');
        if (idAba === 'aba-inicio') {
            itensMenu.forEach((item, index) => {
                if (index < itensMenu.length - 1) item.style.display = 'none';
                else item.style.display = '';
            });
        } else {
            itensMenu.forEach(item => item.style.display = '');
        }
    }

    linksNav.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        abrirAba(e.target.getAttribute('data-target'));
    }));

    document.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => {
        abrirAba(card.getAttribute('data-target'));
    }));

    // ==========================================
    // 2. BANCO DE DADOS LOCAL E CADASTRO
    // ==========================================
    let baseDeAlunos = [];
    let agenda = [];
    let caixa = 0;

    const formCadastro = document.getElementById('form-novo-aluno');
    const tabelaAlunos = document.getElementById('tabela-alunos');

    formCadastro.addEventListener('submit', (e) => {
        e.preventDefault();

        const novoAluno = {
            id: Date.now(),
            nome: document.getElementById('nome-aluno').value,
            whats: document.getElementById('whats-aluno').value,
            queixa: document.getElementById('queixa-aluno').value,
            servico: document.getElementById('servico-aluno').value,
            vencimento: document.getElementById('vencimento-aluno').value,
            evolucoes: [],
            statusPgto: 'Pendente'
        };

        baseDeAlunos.push(novoAluno);
        baseDeAlunos.sort((a, b) => a.nome.localeCompare(b.nome));

        atualizarTelas();
        formCadastro.reset();
        mostrarToast("Aluno cadastrado com sucesso!", "sucesso");
    });

    function atualizarTelas() {
        tabelaAlunos.innerHTML = '';
        baseDeAlunos.forEach(aluno => {
            tabelaAlunos.innerHTML += `<tr>
                <td><strong>${aluno.nome}</strong></td>
                <td>${aluno.whats}</td>
                <td>${aluno.queixa}</td>
                <td>Dia ${aluno.vencimento}</td>
            </tr>`;
        });

        const selectAgenda = document.getElementById('agenda-aluno-select');
        const selectProntuario = document.getElementById('prontuario-busca');

        selectAgenda.innerHTML = '<option value="" disabled selected>Selecione o Aluno</option>';
        selectProntuario.innerHTML = '<option value="" disabled selected>Selecione um aluno para ver o prontuário...</option>';

        baseDeAlunos.forEach(aluno => {
            selectAgenda.innerHTML += `<option value="${aluno.id}">${aluno.nome}</option>`;
            selectProntuario.innerHTML += `<option value="${aluno.id}">${aluno.nome}</option>`;
        });

        atualizarVencimentos();
    }

    // ==========================================
    // 3. AGENDA (COM BLOQUEIO DE DUPLICIDADE)
    // ==========================================
    document.getElementById('form-agenda').addEventListener('submit', (e) => {
        e.preventDefault();
        const select = document.getElementById('agenda-aluno-select');
        const nomeAluno = select.options[select.selectedIndex].text;
        const dia = document.getElementById('agenda-dia').value;
        const hora = document.getElementById('agenda-hora').value;

        // VERIFICAÇÃO INTELIGENTE: Impede de agendar no mesmo dia
        const jaAgendado = agenda.find(item => item.nome === nomeAluno && item.dia === dia);
        if (jaAgendado) {
            mostrarToast(`Erro: ${nomeAluno} já tem aula na ${dia}!`, 'erro');
            return; // Bloqueia a ação aqui
        }

        agenda.push({ nome: nomeAluno, dia: dia, hora: hora });

        const lista = document.getElementById('lista-agenda');
        lista.innerHTML = '';
        agenda.forEach(item => {
            lista.innerHTML += `<div style="background:#f4f6f8; padding:15px; margin-bottom:10px; border-radius:6px; border-left: 4px solid var(--azul-premium);">
                <strong style="color:var(--azul-premium);">${item.dia} às ${item.hora}</strong> - ${item.nome}
            </div>`;
        });

        mostrarToast("Horário agendado com sucesso!", "sucesso");
    });

    // ==========================================
    // 4. PRONTUÁRIOS E GERAÇÃO DE PDF
    // ==========================================
    const buscaProntuario = document.getElementById('prontuario-busca');
    let alunoAtivoId = null;

    buscaProntuario.addEventListener('change', (e) => {
        alunoAtivoId = e.target.value;
        const aluno = baseDeAlunos.find(a => a.id == alunoAtivoId);
        if (aluno) {
            document.getElementById('area-prontuario').style.display = 'block';
            document.getElementById('pront-nome').innerText = aluno.nome;
            document.getElementById('pront-queixa').innerText = aluno.queixa;
            renderizarEvolucoes(aluno);
        }
    });

    document.getElementById('btn-salvar-evolucao').addEventListener('click', () => {
        const texto = document.getElementById('texto-evolucao').value;
        if (texto === '') return;

        const aluno = baseDeAlunos.find(a => a.id == alunoAtivoId);
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        aluno.evolucoes.push({ data: dataHoje, texto: texto });

        document.getElementById('texto-evolucao').value = '';
        renderizarEvolucoes(aluno);
        mostrarToast("Evolução salva no prontuário!", "sucesso");
    });

    function renderizarEvolucoes(aluno) {
        const divHist = document.getElementById('historico-evolucao');
        divHist.innerHTML = '';
        aluno.evolucoes.forEach(evo => {
            divHist.innerHTML += `<div style="border-bottom:1px solid #ccc; padding-bottom:15px; margin-bottom:15px;">
                <small style="color:#0A2463; font-weight:bold;">Data: ${evo.data}</small>
                <p style="margin-top: 5px; line-height: 1.5;">${evo.texto}</p>
            </div>`;
        });
    }

    document.getElementById('btn-gerar-pdf').addEventListener('click', () => {
        if (!alunoAtivoId) {
            mostrarToast("Por favor, selecione um paciente primeiro!", "erro");
            return;
        }
        mostrarToast("Gerando PDF do prontuário...", "sucesso");

        const aluno = baseDeAlunos.find(a => a.id == alunoAtivoId);
        const relatorioPDF = document.createElement('div');
        relatorioPDF.style.padding = '30px';
        relatorioPDF.style.fontFamily = 'Arial, sans-serif';
        relatorioPDF.style.color = '#1F2937';

        let evolucoesHtml = aluno.evolucoes.length === 0
            ? '<p>Nenhuma evolução registrada para este paciente ainda.</p>'
            : aluno.evolucoes.map(evo => `
                <div style="border-bottom: 1px solid #E5E7EB; padding-bottom: 15px; margin-bottom: 15px;">
                    <span style="color: #0A2463; font-weight: bold; display: block; margin-bottom: 5px;">Data: ${evo.data}</span>
                    <p style="line-height: 1.5; margin: 0;">${evo.texto}</p>
                </div>
            `).join('');

        relatorioPDF.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0A2463; padding-bottom: 10px;">
                <h1 style="color: #0A2463; margin: 0; text-transform: uppercase;">Sistema Pilates</h1>
                <h3 style="margin: 5px 0 0 0; color: #4B5563;">Prontuário Clínico de Evolução</h3>
            </div>
            <div style="background: #F4F6F8; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 1.2rem;"><strong>Paciente:</strong> ${aluno.nome}</p>
                <p style="margin: 0;"><strong>Queixa Inicial:</strong> ${aluno.queixa}</p>
            </div>
            <h3 style="color: #0A2463; margin-bottom: 20px;">Histórico de Acompanhamento</h3>
            ${evolucoesHtml}
            <div style="margin-top: 50px; text-align: center; font-size: 0.8rem; color: #9CA3AF;">
                <p>Documento gerado automaticamente pelo Sistema</p>
                <p>Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
        `;

        html2pdf().set({
            margin: 10,
            filename: `Prontuario_${aluno.nome.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(relatorioPDF).save();
    });

    // ==========================================
    // 5. VENCIMENTOS E EMISSÃO DE RECIBOS (PDF & WHATSAPP)
    // ==========================================
    function atualizarVencimentos() {
        const tabelaVenc = document.getElementById('tabela-vencimentos');
        tabelaVenc.innerHTML = '';

        baseDeAlunos.forEach(aluno => {
            // Se pendente, mostra "Dar Baixa". Se pago, mostra botões de Recibo
            const btnAcao = aluno.statusPgto === 'Pendente'
                ? `<button onclick="receberPagamento(${aluno.id}, '${aluno.servico}')" style="background:#16a34a; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; white-space:nowrap;">Dar Baixa</button>`
                : `<div style="display:flex; gap:5px;">
                     <button onclick="enviarRecibo(${aluno.id})" style="background:#25D366; color:white; border:none; padding:8px 10px; border-radius:4px; cursor:pointer; font-weight:bold; white-space:nowrap;">📱 Whats</button>
                     <button onclick="baixarReciboPDF(${aluno.id})" style="background:#dc2626; color:white; border:none; padding:8px 10px; border-radius:4px; cursor:pointer; font-weight:bold; white-space:nowrap;">📄 PDF</button>
                   </div>`;

            tabelaVenc.innerHTML += `<tr>
                <td><strong>${aluno.nome}</strong></td>
                <td>${aluno.servico}</td>
                <td>Dia ${aluno.vencimento}</td>
                <td>${btnAcao}</td>
            </tr>`;
        });
    }

    window.receberPagamento = function (idAluno, servicoStr) {
        const aluno = baseDeAlunos.find(a => a.id == idAluno);
        aluno.statusPgto = 'Pago';

        const valor = parseFloat(servicoStr.replace(/[^0-9,]/g, '').replace(',', '.'));
        caixa += valor;

        document.getElementById('total-caixa').innerText = `R$ ${caixa.toFixed(2).replace('.', ',')}`;
        atualizarVencimentos();

        mostrarToast("Pagamento recebido! Caixa atualizado.", "sucesso");
    };

    window.enviarRecibo = function (idAluno) {
        const aluno = baseDeAlunos.find(a => a.id == idAluno);
        const numeroLimpo = aluno.whats.replace(/\D/g, '');
        const mensagem = `Olá, ${aluno.nome}! Confirmamos o recebimento do seu pagamento referente ao plano de ${aluno.servico}. Muito obrigado! - Sistema Pilates`;
        window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
    };

    // NOVA FUNÇÃO: Gerar Recibo PDF
    window.baixarReciboPDF = function (idAluno) {
        const aluno = baseDeAlunos.find(a => a.id == idAluno);
        mostrarToast("Gerando recibo PDF...", "sucesso");

        const reciboPDF = document.createElement('div');
        reciboPDF.style.padding = '40px';
        reciboPDF.style.fontFamily = 'Arial, sans-serif';
        reciboPDF.style.color = '#1F2937';

        const dataHoje = new Date().toLocaleDateString('pt-BR');

        reciboPDF.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #0A2463; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #0A2463; margin: 0; text-transform: uppercase;">Sistema Pilates</h1>
                <h3 style="margin: 10px 0 0 0; color: #4B5563;">Recibo de Pagamento</h3>
            </div>
            <div style="font-size: 1.2rem; line-height: 1.8;">
                <p>Recebemos de <strong>${aluno.nome}</strong> a quantia referente ao serviço de <strong>${aluno.servico}</strong>.</p>
                <p><strong>Data do Pagamento:</strong> ${dataHoje}</p>
                <p><strong>Status do Caixa:</strong> <span style="color: #16a34a; font-weight: bold;">PAGO</span></p>
            </div>
            <div style="margin-top: 80px; text-align: center;">
                <div style="border-top: 1px solid #000; width: 60%; margin: 0 auto; padding-top: 10px; color: #4B5563;">
                    Assinatura
                </div>
            </div>
        `;

        html2pdf().set({
            margin: 15,
            filename: `Recibo_${aluno.nome.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a5', orientation: 'landscape' } // Formato A5 deitado ideal para recibos
        }).from(reciboPDF).save();
    };

    // ==========================================
    // 6. LOGS DE SISTEMA (Dashboard Inicial)
    // ==========================================
    function carregarLogs() {
        const listaLogs = document.getElementById('lista-logs');
        listaLogs.innerHTML = '<p class="log-item">✅ Módulo administrativo ativo. Faça um cadastro para habilitar todas as funções integradas.</p>';
    }
});
