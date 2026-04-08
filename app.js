import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// ==========================================
// FUNÇÕES DE UTILIDADE E INTERFACE
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

// ==========================================
// FUNÇÃO PARA CARREGAR O HISTÓRICO
// ==========================================
async function carregarHistorico() {
    const lista = document.getElementById("listaHistorico");
    if (!lista) return;
    
    lista.innerHTML = '<p style="text-align: center; color: #666;">Buscando as últimas 20 coletas...</p>';
    
    try {
        // Busca as últimas 20 medições cadastradas por qualquer pessoa
        const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"), limit(20));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma coleta registrada ainda.</p>';
            return;
        }

        let html = "";
        snap.forEach(doc => {
            const d = doc.data();
            const dataHora = d.timestamp ? d.timestamp.toDate().toLocaleString('pt-BR').substring(0, 16) : "Sem data";
            
            // Monta um Cartão (Card) para cada medição
            html += `
            <div class="card-historico">
                <div class="card-header">
                    <span>${d.tratamento} - ${d.caixa}</span>
                    <span style="color: #007bff;">${dataHora}</span>
                </div>
                <p style="margin: 3px 0;"><strong>Turno:</strong> ${d.turno}</p>
                <p style="margin: 3px 0;"><strong>Coletor:</strong> ${d.coletor}</p>
                
                <div class="card-resumo">
                    <span style="flex: 1; text-align: center; color: #d9534f; font-size: 0.8rem;"><strong>NH3:</strong><br>${d.amonia || '-'}</span>
                    <span style="flex: 1; text-align: center; color: #5cb85c; font-size: 0.8rem;"><strong>pH:</strong><br>${d.ph || '-'}</span>
                    <span style="flex: 1; text-align: center; color: #17a2b8; font-size: 0.8rem;"><strong>Temp:</strong><br>${d.temperatura || '-'}</span>
                    <span style="flex: 1; text-align: center; color: #f0ad4e; font-size: 0.8rem;"><strong>OD:</strong><br>${d.od || '-'}</span>
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
                
                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userEmailText", user.email);
                escrever("userIdText", user.uid);
                
                if (document.getElementById("editNome")) document.getElementById("editNome").value = d.nome;
                
                const inicial = d.nome ? d.nome.charAt(0).toUpperCase() : "?";
                escrever("userIniciaisSmall", inicial);
                escrever("userIniciaisLarge", inicial);

                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            mostrarTela("telaLogin");
        }
    } else {
        mostrarTela("telaLogin");
    }
});

// ==========================================
// EVENTOS DE CLIQUE
// ==========================================
document.addEventListener('click', async (e) => {
    
    // LOGIN
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Aguarde...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, provider);
        } catch (err) {
            e.target.innerText = "Entrar com Google";
            if (err.code === 'auth/popup-blocked') {
                alert("Seu navegador bloqueou o pop-up de login. Por favor, permita pop-ups para este site.");
            } else { alert("Falha no login."); }
        }
    }

    // CADASTRO E ATUALIZAR PERFIL...
    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: nomeEl.value, email: auth.currentUser.email, dataCadastro: new Date() });
            window.location.reload();
        } catch (err) { alert("Erro ao salvar: " + err.message); }
    }

    if (e.target.id === 'btnAtualizarPerfil') {
        const novoNome = document.getElementById("editNome")?.value;
        if (!novoNome) return alert("O nome não pode ser vazio.");
        e.target.innerText = "Atualizando...";
        try {
            await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: novoNome });
            alert("Nome atualizado com sucesso!");
            window.location.reload();
        } catch (err) { alert("Erro ao atualizar: " + err.message); e.target.innerText = "Salvar Alterações"; }
    }

    // PLANILHA (CSV)
    if (e.target.id === 'btnBaixarRelatorio') {
        e.target.innerText = "Gerando...";
        try {
            const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
            let csv = "\ufeffData,Hora,Turno,Coletor,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temperatura,Condutividade,Salinidade,Solidos\n";
            snap.forEach(doc => {
                const d = doc.data();
                const dt = d.timestamp ? d.timestamp.toDate() : new Date();
                csv += `${dt.toLocaleDateString()},${dt.toLocaleTimeString()},${d.turno},${d.coletor},${d.tratamento},${d.caixa},${d.amonia??""},${d.nitrito??""},${d.alcalinidade??""},${d.dureza??""},${d.ph??""},${d.od??""},${d.temperatura??""},${d.condutividade??""},${d.salinidade??""},${d.solidos??""}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "relatorio_bagrinhos.csv";
            link.click();
        } catch (err) { alert("Erro no relatório: " + err.message); }
        finally { e.target.innerText = "📥 Planilha"; }
    }

    // ==========================================
    // CONTROLE DAS 3 ABAS
    // ==========================================
    if (e.target.id === 'tabRegistro') {
        document.getElementById("secaoRegistro").style.display = "block";
        document.getElementById("secaoHistorico").style.display = "none";
        document.getElementById("secaoPerfil").style.display = "none";
        document.getElementById("tabRegistro").style.backgroundColor = "#007bff";
        document.getElementById("tabHistorico").style.backgroundColor = "#6c757d";
        document.getElementById("tabPerfil").style.backgroundColor = "#6c757d";
    }
    
    if (e.target.id === 'tabHistorico') {
        document.getElementById("secaoRegistro").style.display = "none";
        document.getElementById("secaoHistorico").style.display = "block";
        document.getElementById("secaoPerfil").style.display = "none";
        document.getElementById("tabHistorico").style.backgroundColor = "#007bff";
        document.getElementById("tabRegistro").style.backgroundColor = "#6c757d";
        document.getElementById("tabPerfil").style.backgroundColor = "#6c757d";
        
        // Quando clica na aba, carrega os dados automaticamente
        carregarHistorico();
    }

    if (e.target.id === 'tabPerfil') {
        document.getElementById("secaoRegistro").style.display = "none";
        document.getElementById("secaoHistorico").style.display = "none";
        document.getElementById("secaoPerfil").style.display = "block";
        document.getElementById("tabPerfil").style.backgroundColor = "#007bff";
        document.getElementById("tabRegistro").style.backgroundColor = "#6c757d";
        document.getElementById("tabHistorico").style.backgroundColor = "#6c757d";
    }

    // BOTÃO ATUALIZAR HISTÓRICO
    if (e.target.id === 'btnAtualizarHistorico') {
        carregarHistorico();
    }

    if (e.target.id === 'btnSair') {
        await signOut(auth);
        window.location.reload();
    }
});

// ==========================================
// SALVAR MEDIÇÃO
// ==========================================
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'formMedicao') {
        e.preventDefault();
        const btn = document.getElementById("btnSalvarMedicao");
        if(btn) btn.disabled = true;
        
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader")?.innerText || "N/A",
                email: auth.currentUser?.email || "N/A",
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
                timestamp: serverTimestamp()
            });
            alert("Medição salva com sucesso!");
            
            document.querySelectorAll('#formMedicao input[type="number"]').forEach(input => input.value = '');
            
        } catch (err) { 
            alert("Erro ao salvar: " + err.message); 
        } finally { 
            if(btn) btn.disabled = false; 
        }
    }
});