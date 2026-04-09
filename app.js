import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==========================================
// 👑 PROTEÇÃO DOS FUNDADORES DO SISTEMA 👑
// ==========================================
const EMAILS_DOS_DONOS = [
    "willyamrodrigo6@gmail.com", 
    "email.do.socio@gmail.com"
]; 

const firebaseConfig = {
  apiKey: "AIzaSyCRLrik-rHVfDNz_gn2P4oYgraM64iHI0k",
  authDomain: "parametros-de-qualidade.firebaseapp.com",
  projectId: "parametros-de-qualidade",
  storageBucket: "parametros-de-qualidade.firebasestorage.app",
  messagingSenderId: "329194124166",
  appId: "1:329194124166:web:50d3685ef680284c5fb207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let isAdmin = false; 
let registrosAtuais = {}; 

// Preenche automaticamente o campo Data com o dia de hoje
function resetarDataParaHoje() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    const dataColetaEl = document.getElementById("dataColeta");
    if(dataColetaEl) dataColetaEl.value = localISOTime;
}

// ==========================================
// FUNÇÕES DE INTERFACE E CONTROLE DE CAMPOS
// ==========================================
function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add('ativa');
}

function escrever(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

const getVal = (id) => {
    const el = document.getElementById(id);
    return (el && el.value !== "") ? parseFloat(el.value) : null;
};

const setEditVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== null && val !== undefined) ? val : "";
};

function toggleCampos(liberar) {
    const area = document.getElementById("areaParametros");
    const inputs = document.querySelectorAll("#areaParametros input");
    const btnSalvar = document.getElementById("btnSalvarMedicao");

    if (!area || !btnSalvar) return;

    if (liberar) {
        area.classList.remove("area-bloqueada");
        inputs.forEach(inp => inp.disabled = false);
        btnSalvar.disabled = false;
        btnSalvar.style.backgroundColor = "#007bff";
        btnSalvar.innerText = "Salvar Medição";
    } else {
        area.classList.add("area-bloqueada");
        inputs.forEach(inp => inp.disabled = true);
        btnSalvar.disabled = true;
        btnSalvar.style.backgroundColor = "#6c757d";
    }
}

// ==========================================
// FUNÇÃO HISTÓRICO
// ==========================================
async function carregarHistorico() {
    const lista = document.getElementById("listaHistorico");
    if (!lista) return;
    lista.innerHTML = '<p style="text-align: center; color: #666;">Buscando as últimas 20 coletas...</p>';
    
    try {
        const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"), limit(20));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma coleta registrada ainda.</p>';
            return;
        }

        let html = "";
        registrosAtuais = {}; 
        
        snap.forEach(doc => {
            const d = doc.data();
            const idDoc = doc.id;
            registrosAtuais[idDoc] = d; 
            
            // Lógica para pegar a data real informada ou a do sistema (se for registro velho)
            let dataExibicao = "Sem data";
            if (d.dataColeta) {
                dataExibicao = d.dataColeta.split('-').reverse().join('/'); // Transforma YYYY-MM-DD em DD/MM/YYYY
            } else if (d.timestamp) {
                dataExibicao = d.timestamp.toDate().toLocaleDateString('pt-BR');
            }
            
            let botoesAdmin = "";
            if (isAdmin) {
                botoesAdmin = `
                    <button class="btn-editar" data-id="${idDoc}">✏️</button>
                    <button class="btn-excluir-novo" data-id="${idDoc}">Excluir</button>
                `;
            }

            html += `
            <div class="card-historico" id="card-${idDoc}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${d.tratamento} - ${d.caixa}</span>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: #007bff; margin-right: 5px;">${dataExibicao}</span>
                        ${botoesAdmin}
                    </div>
                </div>
                <p style="margin: 3px 0;"><strong>Turno:</strong> ${d.turno}</p>
                <p style="margin: 3px 0;"><strong>Coletor:</strong> ${d.coletor}</p>
                
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #eee;">
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Amônia:</strong><br>${d.amonia || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Nitrito:</strong><br>${d.nitrito || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>pH:</strong><br>${d.ph || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Temp:</strong><br>${d.temperatura || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>OD:</strong><br>${d.od || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Alcalinidade:</strong><br>${d.alcalinidade || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Dureza:</strong><br>${d.dureza || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Condutiv.:</strong><br>${d.condutividade || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Salinidade:</strong><br>${d.salinidade || '-'}</span>
                    <span style="flex: 1 1 100%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Sólidos Totais:</strong><br>${d.solidos || '-'}</span>
                </div>
            </div>
            `;
        });
        lista.innerHTML = html;
    } catch (e) {
        console.error("Erro no histórico:", e);
        lista.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar o histórico.</p>';
    }
}

// ==========================================
// FUNÇÃO PAINEL ADMIN
// ==========================================
async function carregarListaUsuarios() {
    const listaUsuarios = document.getElementById("listaUsuariosAdmin");
    if (!listaUsuarios || !isAdmin) return;
    
    listaUsuarios.innerHTML = '<p style="text-align: center; color: #666;">Buscando equipe...</p>';

    try {
        const snap = await getDocs(collection(db, "usuarios"));
        let html = "";
        
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const uId = docSnap.id;
            
            const isEuMesmo = (uId === auth.currentUser.uid);
            const isDonoDoApp = EMAILS_DOS_DONOS.includes(u.email); 
            
            let btnAcao = "";
            
            if (isDonoDoApp) {
                btnAcao = `<span style="font-size: 0.85rem; color: #ffc107; background: #333; padding: 4px 8px; border-radius: 4px; font-weight: bold;">👑 Fundador</span>`;
            } else if (isEuMesmo) {
                btnAcao = `<span style="font-size: 0.8rem; color: #28a745; font-weight: bold;">(Você)</span>`;
            } else if (u.admin) {
                btnAcao = `<button class="btn-toggle-admin" data-uid="${uId}" data-status="remover" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Remover Admin</button>`;
            } else {
                btnAcao = `<button class="btn-toggle-admin" data-uid="${uId}" data-status="dar" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Tornar Admin</button>`;
            }

            html += `
            <div class="card-usuario">
                <div>
                    <strong>${u.nome}</strong><br>
                    <span style="font-size: 0.75rem; color: #666;">${u.email}</span>
                </div>
                <div>${btnAcao}</div>
            </div>
            `;
        });
        listaUsuarios.innerHTML = html;
    } catch (err) {
        console.error(err);
        listaUsuarios.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar usuários.</p>';
    }
}

// ==========================================
// MONITOR DE AUTENTICAÇÃO
// ==========================================
let timeoutFirebase = setTimeout(() => { mostrarTela("telaLogin"); }, 5000);

onAuthStateChanged(auth, async (user) => {
    clearTimeout(timeoutFirebase);

    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const d = docSnap.data();
                isAdmin = d.admin === true;

                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userEmailText", user.email);
                escrever("userIdText", user.uid);
                
                if (document.getElementById("editNome")) document.getElementById("editNome").value = d.nome;
                
                const inicial = d.nome ? d.nome.charAt(0).toUpperCase() : "?";
                escrever("userIniciaisSmall", inicial);
                escrever("userIniciaisLarge", inicial);

                if (isAdmin) {
                    const btnPlanilha = document.getElementById("btnBaixarRelatorio");
                    if (btnPlanilha) btnPlanilha.style.display = "block";
                    const badge = document.getElementById("badgeAdmin");
                    if (badge) badge.style.display = "block";
                    const tabAdmin = document.getElementById("tabAdmin");
                    if (tabAdmin) tabAdmin.style.display = "block";
                } else {
                    const btnPlanilha = document.getElementById("btnBaixarRelatorio");
                    if (btnPlanilha) btnPlanilha.style.display = "none";
                    const tabAdmin = document.getElementById("tabAdmin");
                    if (tabAdmin) tabAdmin.style.display = "none";
                }

                resetarDataParaHoje(); // Prepara a data
                
                const btnLogin = document.getElementById('loginGoogleBtn');
                if (btnLogin) btnLogin.innerText = "Entrar com Google";

                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            const btnLogin = document.getElementById('loginGoogleBtn');
            if (btnLogin) btnLogin.innerText = "Entrar com Google";
            mostrarTela("telaLogin");
        }
    } else {
        const btnLogin = document.getElementById('loginGoogleBtn');
        if (btnLogin) btnLogin.innerText = "Entrar com Google";
        mostrarTela("telaLogin");
    }
});

// ==========================================
// RADAR DE DUPLICIDADE (AGORA OLHANDO A DATA REAL)
// ==========================================
async function verificarDuplicidade() {
    const dataVal = document.getElementById("dataColeta")?.value;
    const turnoVal = document.getElementById("turno")?.value;
    const tratamentoVal = document.getElementById("tratamento")?.value;
    const caixaVal = document.getElementById("caixa")?.value;
    
    const aviso = document.getElementById("avisoDuplicidade");
    const btnSalvar = document.getElementById("btnSalvarMedicao");

    if (!aviso || !btnSalvar) return;

    if (!dataVal || !turnoVal || !tratamentoVal || !caixaVal) {
        aviso.style.display = "none";
        toggleCampos(false); 
        btnSalvar.innerText = "Preencha Data, Turno, Tratamento e Caixa";
        return;
    }

    try {
        // Agora o radar procura pela Data Real que a pessoa digitou, não pelo 'hoje'
        const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"), limit(40));
        const snap = await getDocs(q);

        let duplicado = false;

        snap.forEach(doc => {
            const d = doc.data();
            
            // Tolerância para registros antigos sem a data explícita salva
            let docDataReal = d.dataColeta; 
            if (!docDataReal && d.timestamp) {
                // Tenta descobrir a data pelo timestamp
                const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
                docDataReal = (new Date(d.timestamp.toDate() - tzoffset)).toISOString().slice(0, 10);
            }

            if (docDataReal === dataVal && d.turno === turnoVal && d.tratamento === tratamentoVal && d.caixa === caixaVal) {
                duplicado = true;
            }
        });

        if (duplicado) {
            aviso.style.display = "block";
            toggleCampos(false);
            btnSalvar.innerText = "Combinação já registrada nesta data!";
        } else {
            aviso.style.display = "none";
            toggleCampos(true);
        }
        
    } catch (err) {
        console.error("Erro no radar:", err);
    }
}

document.addEventListener('change', (e) => {
    if (e.target.id === 'dataColeta' || e.target.id === 'turno' || e.target.id === 'tratamento' || e.target.id === 'caixa') {
        verificarDuplicidade();
    }
});

// ==========================================
// EVENTOS DE CLIQUE E GERAÇÃO DA PLANILHA (ORDEM DE FERRO)
// ==========================================
document.addEventListener('click', async (e) => {
    
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Aguarde...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, provider);
        } catch (err) {
            e.target.innerText = "Entrar com Google";
            if (err.code === 'auth/popup-blocked') { alert("Seu navegador bloqueou o pop-up de login."); } 
            else { alert("Falha no login."); }
        }
    }

    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: nomeEl.value, email: auth.currentUser.email, admin: false, dataCadastro: new Date() });
            window.location.reload();
        } catch (err) { alert("Erro: " + err.message); }
    }

    if (e.target.id === 'btnAtualizarPerfil') {
        const novoNome = document.getElementById("editNome")?.value;
        if (!novoNome) return alert("O nome não pode ser vazio.");
        e.target.innerText = "Atualizando...";
        try {
            await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: novoNome });
            alert("Nome atualizado com sucesso!");
            window.location.reload();
        } catch (err) { alert("Erro: " + err.message); e.target.innerText = "Salvar Alterações"; }
    }

    // ABRIR JANELA DE EDIÇÃO
    const btnEditar = e.target.closest('.btn-editar');
    if (btnEditar) {
        if (!isAdmin) return alert("Acesso negado.");
        const modal = document.getElementById("modalEditar");
        if (!modal) return alert("Erro no HTML da janela modal.");

        const idDoc = btnEditar.getAttribute('data-id');
        const d = registrosAtuais[idDoc]; 
        if (!d) return alert("Erro ao recuperar dados da medição.");

        document.getElementById("editIdDoc").value = idDoc;
        
        // Puxa a Data da Coleta
        let dataRealEdit = d.dataColeta;
        if (!dataRealEdit && d.timestamp) {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
            dataRealEdit = (new Date(d.timestamp.toDate() - tzoffset)).toISOString().slice(0, 10);
        }
        setEditVal("editDataColeta", dataRealEdit);
        
        setEditVal("editTurno", d.turno);
        setEditVal("editTratamento", d.tratamento);
        setEditVal("editCaixa", d.caixa);
        setEditVal("editAmonia", d.amonia);
        setEditVal("editNitrito", d.nitrito);
        setEditVal("editAlcalinidade", d.alcalinidade);
        setEditVal("editDureza", d.dureza);
        setEditVal("editPh", d.ph);
        setEditVal("editOd", d.od);
        setEditVal("editTemperatura", d.temperatura);
        setEditVal("editCondutividade", d.condutividade);
        setEditVal("editSalinidade", d.salinidade);
        setEditVal("editSolidos", d.solidos);

        modal.style.display = "flex";
    }

    // FECHAR A JANELA DE EDIÇÃO
    if (e.target.id === 'btnCancelarEdicao') {
        document.getElementById("modalEditar").style.display = "none";
    }

    // EXCLUIR HISTÓRICO
    const btnExcluir = e.target.closest('.btn-excluir-novo');
    if (btnExcluir) {
        if (!isAdmin) return alert("Acesso negado."); 
        const idDoc = btnExcluir.getAttribute('data-id');
        if (confirm("Tem certeza que deseja apagar esta medição? Isso não pode ser desfeito.")) {
            try {
                await deleteDoc(doc(db, "medicoes", idDoc));
                carregarHistorico(); 
            } catch (err) { alert("Erro: " + err.message); }
        }
    }

    // ADMIN: DAR OU REMOVER PERMISSÃO
    const btnToggleAdmin = e.target.closest('.btn-toggle-admin');
    if (btnToggleAdmin) {
        if (!isAdmin) return alert("Acesso negado.");
        const alvoUid = btnToggleAdmin.getAttribute('data-uid');
        const acao = btnToggleAdmin.getAttribute('data-status');
        const vaiSerAdmin = (acao === 'dar');

        const msgConfirmacao = vaiSerAdmin 
            ? "Tem certeza que deseja promover este usuário a Administrador?" 
            : "Tem certeza que deseja remover o acesso de Administrador deste usuário?";

        if (confirm(msgConfirmacao)) {
            try {
                await updateDoc(doc(db, "usuarios", alvoUid), { admin: vaiSerAdmin });
                alert("Permissões atualizadas com sucesso!");
                carregarListaUsuarios(); 
            } catch (err) { alert("Erro ao atualizar permissão: " + err.message); }
        }
    }

    // NAVEGAÇÃO DE ABAS
    const abas = [
        { btn: 'tabRegistro', tela: 'secaoRegistro' },
        { btn: 'tabHistorico', tela: 'secaoHistorico' },
        { btn: 'tabPerfil', tela: 'secaoPerfil' },
        { btn: 'tabAdmin', tela: 'secaoAdmin' }
    ];

    const clicouNumaAba = abas.find(a => a.btn === e.target.id);
    if (clicouNumaAba) {
        abas.forEach(aba => {
            const btnEl = document.getElementById(aba.btn);
            const telaEl = document.getElementById(aba.tela);
            if (btnEl && telaEl) {
                if (aba.btn === e.target.id) {
                    telaEl.style.display = "block";
                    btnEl.style.backgroundColor = "#007bff"; 
                } else {
                    telaEl.style.display = "none";
                    btnEl.style.backgroundColor = "#6c757d"; 
                }
            }
        });
        if (e.target.id === 'tabHistorico') carregarHistorico();
        if (e.target.id === 'tabAdmin') carregarListaUsuarios();
    }

    if (e.target.id === 'btnAtualizarHistorico') carregarHistorico();
    if (e.target.id === 'btnSair') { await signOut(auth); window.location.reload(); }

    // ==========================================
    // GERAÇÃO DO RELATÓRIO (COM A ORDEM DE FERRO)
    // ==========================================
    if (e.target.id === 'btnBaixarRelatorio') {
        if (!isAdmin) return alert("Acesso Negado."); 
        e.target.innerText = "Gerando...";
        try {
            const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
            const gruposMap = {};
            const gruposArray = [];

            snap.forEach(doc => {
                const d = doc.data();
                if (!d.timestamp && !d.dataColeta) return;

                // Identifica a data real da coleta
                let dataStrInvertida = d.dataColeta; // Ex: 2026-04-09
                if (!dataStrInvertida && d.timestamp) {
                    const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
                    dataStrInvertida = (new Date(d.timestamp.toDate() - tzoffset)).toISOString().slice(0, 10);
                }
                
                const dataStrFormatadaBR = dataStrInvertida.split('-').reverse().join('/'); // Ex: 09/04/2026
                const turno = d.turno || "Sem Turno";
                const chaveGrupo = `${dataStrInvertida}_${turno}`;

                if (!gruposMap[chaveGrupo]) {
                    // Peso para ordenar: Manhã sempre vem antes da Tarde no Excel
                    let pesoTurno = 0;
                    if(turno === "Manhã") pesoTurno = 1;
                    if(turno === "Tarde") pesoTurno = 2;

                    const novoGrupo = { 
                        dataStrInvertida: dataStrInvertida, 
                        dataStrFormatadaBR: dataStrFormatadaBR,
                        turno: turno, 
                        pesoTurno: pesoTurno, 
                        medicoes: {} 
                    };
                    gruposMap[chaveGrupo] = novoGrupo;
                    gruposArray.push(novoGrupo);
                }

                const chaveCaixa = `${d.tratamento}_${d.caixa}`;
                // Se duas pessoas preencheram a mesma caixa sem querer, mantém a mais recente salva
                if (!gruposMap[chaveGrupo].medicoes[chaveCaixa]) {
                    gruposMap[chaveGrupo].medicoes[chaveCaixa] = { ...d, dataObjOriginal: d.timestamp ? d.timestamp.toDate() : null };
                }
            });

            // ORDEM DE FERRO:
            // 1º Agrupa pela Data da Coleta (do dia mais novo para o mais velho)
            // 2º Agrupa pelo Turno (Sempre Manhã em cima, Tarde embaixo)
            gruposArray.sort((a, b) => {
                if (a.dataStrInvertida > b.dataStrInvertida) return -1;
                if (a.dataStrInvertida < b.dataStrInvertida) return 1;
                return a.pesoTurno - b.pesoTurno;
            });

            const sequenciaCaixas = [
                { t: "Tratamento 1", c: "Caixa 1" }, { t: "Tratamento 1", c: "Caixa 2" }, { t: "Tratamento 1", c: "Caixa 3" },
                { t: "Tratamento 2", c: "Caixa 1" }, { t: "Tratamento 2", c: "Caixa 2" }, { t: "Tratamento 2", c: "Caixa 3" },
                { t: "Tratamento 3", c: "Caixa 1" }, { t: "Tratamento 3", c: "Caixa 2" }, { t: "Tratamento 3", c: "Caixa 3" }
            ];

            const cabecalho = "Data da Coleta;Hora(Registro);Turno;Tratamento;Caixa;Amônia;Nitrito;Alcalinidade;Dureza;pH;OD;Temperatura;Condutividade;Salinidade;Sólidos Totais;Coletor\n";
            let csv = "\ufeff"; 
            const formatarNumero = (num) => (num !== null && num !== undefined && num !== "") ? String(num).replace('.', ',') : "";

            gruposArray.forEach((grupo, index) => {
                csv += cabecalho; 
                sequenciaCaixas.forEach(caixaAlvo => {
                    const chave = `${caixaAlvo.t}_${caixaAlvo.c}`;
                    const med = grupo.medicoes[chave];

                    if (med) {
                        const horaSalvamento = med.dataObjOriginal ? med.dataObjOriginal.toLocaleTimeString().substring(0,5) : "--:--";
                        csv += `${grupo.dataStrFormatadaBR};${horaSalvamento};${med.turno};${med.tratamento};${med.caixa};${formatarNumero(med.amonia)};${formatarNumero(med.nitrito)};${formatarNumero(med.alcalinidade)};${formatarNumero(med.dureza)};${formatarNumero(med.ph)};${formatarNumero(med.od)};${formatarNumero(med.temperatura)};${formatarNumero(med.condutividade)};${formatarNumero(med.salinidade)};${formatarNumero(med.solidos)};${med.coletor || ""}\n`;
                    } else {
                        csv += `${grupo.dataStrFormatadaBR};--;${grupo.turno};${caixaAlvo.t};${caixaAlvo.c};;;;;;;;;;;\n`;
                    }
                });
                if (index < gruposArray.length - 1) csv += "\n\n";
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "relatorio_bagrinhos.csv";
            link.click();
        } catch (err) { alert("Erro no relatório: " + err.message); }
        finally { e.target.innerText = "📥 Planilha"; }
    }
});

// ==========================================
// SALVAR OU EDITAR MEDIÇÃO
// ==========================================
document.addEventListener('submit', async (e) => {
    
    // SALVAR NOVA MEDIÇÃO
    if (e.target.id === 'formMedicao') {
        e.preventDefault();
        
        const btn = document.getElementById("btnSalvarMedicao");
        if(btn && btn.disabled) return;
        
        if(btn) btn.disabled = true;
        
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader")?.innerText || "N/A",
                email: auth.currentUser?.email || "N/A",
                dataColeta: document.getElementById("dataColeta").value, // Salva a data selecionada
                turno: document.getElementById("turno").value,
                tratamento: document.getElementById("tratamento").value,
                caixa: document.getElementById("caixa").value,
                amonia: getVal("amonia"),
                nitrito: getVal("nitrito"),
                alcalinidade: getVal("alcalinidade"),
                dureza: getVal("dureza"),
                ph: getVal("ph"),
                od: getVal("od"),
                temperatura: getVal("temperatura"),
                condutividade: getVal("condutividade"),
                salinidade: getVal("salinidade"),
                solidos: getVal("solidos"),
                timestamp: serverTimestamp() // Continua salvando pra auditoria de segurança
            });
            alert("Medição salva com sucesso!");
            
            // RESET INTELIGENTE
            document.querySelectorAll('#formMedicao input[type="number"]').forEach(input => input.value = '');
            document.getElementById("tratamento").value = "";
            document.getElementById("caixa").value = "";
            
            toggleCampos(false);
            const aviso = document.getElementById("avisoDuplicidade");
            if (aviso) aviso.style.display = "none";
            if(btn) btn.innerText = "Preencha Data, Turno, Tratamento e Caixa";

        } catch (err) { 
            alert("Erro ao salvar: " + err.message); 
            if(btn) btn.disabled = false;
        }
    }

    // SALVAR EDIÇÃO DE UMA MEDIÇÃO
    if (e.target.id === 'formEditarMedicao') {
        e.preventDefault();
        if (!isAdmin) return alert("Acesso negado.");
        
        const idDoc = document.getElementById("editIdDoc").value;
        const btn = document.querySelector("#formEditarMedicao button[type='submit']");
        if(btn) btn.disabled = true;

        const getEditVal = (id) => {
            const el = document.getElementById(id);
            return (el && el.value !== "") ? parseFloat(el.value) : null;
        };

        try {
            await updateDoc(doc(db, "medicoes", idDoc), {
                dataColeta: document.getElementById("editDataColeta").value, // Permite corrigir a data também
                turno: document.getElementById("editTurno").value,
                tratamento: document.getElementById("editTratamento").value,
                caixa: document.getElementById("editCaixa").value,
                amonia: getEditVal("editAmonia"),
                nitrito: getEditVal("editNitrito"),
                alcalinidade: getEditVal("editAlcalinidade"),
                dureza: getEditVal("editDureza"),
                ph: getEditVal("editPh"),
                od: getEditVal("editOd"),
                temperatura: getEditVal("editTemperatura"),
                condutividade: getEditVal("editCondutividade"),
                salinidade: getEditVal("editSalinidade"),
                solidos: getEditVal("editSolidos")
            });
            alert("Registro atualizado com sucesso!");
            
            const modal = document.getElementById("modalEditar");
            if (modal) modal.style.display = "none";
            
            carregarHistorico(); 
        } catch (err) {
            alert("Erro ao editar: " + err.message);
        } finally {
            if(btn) btn.disabled = false;
        }
    }
});