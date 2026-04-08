import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
// FUNÇÕES DE INTERFACE E SEGURANÇA
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
// TIMER DE SEGURANÇA (O BOTÃO DE PÂNICO)
// ==========================================
// Se o Firebase não responder em 4 segundos, força a tela de Login
let timeoutSeguranca = setTimeout(() => {
    console.warn("Aviso: Firebase demorou a responder. Liberando tela de login.");
    mostrarTela("telaLogin");
}, 4000);

// ==========================================
// MONITOR DE AUTENTICAÇÃO
// ==========================================
getRedirectResult(auth).catch(e => console.warn("Erro silencioso de Redirect:", e));

onAuthStateChanged(auth, async (user) => {
    // O Firebase respondeu! Cancela o botão de pânico
    clearTimeout(timeoutSeguranca); 

    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const d = docSnap.data();
                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userIdText", user.uid);
                if (d.nome) escrever("userIniciais", d.nome.charAt(0).toUpperCase());
                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            console.error("Erro no Banco:", e);
            mostrarTela("telaLogin");
        }
    } else {
        mostrarTela("telaLogin");
    }
});

// ==========================================
// DELEGAÇÃO DE EVENTOS (À PROVA DE TRAVAMENTO)
// ==========================================
document.addEventListener('click', async (e) => {
    
    // LOGIN
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Conectando...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (err) {
            e.target.innerText = "Entrar com Google";
            alert("Falha de conexão. Tente novamente.");
        }
    }

    // CADASTRO
    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
                nome: nomeEl.value, email: auth.currentUser.email, data: new Date()
            });
            window.location.reload();
        } catch (err) { alert("Erro: " + err.message); }
    }

    // RELATÓRIO
    if (e.target.id === 'btnBaixarRelatorio') {
        try {
            const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
            let csv = "\ufeffData,Hora,Turno,Coletor,Tratamento,Caixa,Amonia,Nitrito,Alcalinidade,Dureza,pH,OD,Temp,Condutividade,Salinidade,Solidos\n";
            snap.forEach(doc => {
                const d = doc.data();
                const dt = d.timestamp ? d.timestamp.toDate() : new Date();
                csv += `${dt.toLocaleDateString()},${dt.toLocaleTimeString()},${d.turno},${d.coletor},${d.tratamento},${d.caixa},${d.amonia??""},${d.nitrito??""},${d.alcalinidade??""},${d.dureza??""},${d.ph??""},${d.od??""},${d.temperatura??""},${d.condutividade??""},${d.salinidade??""},${d.solidos??""}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "bagrinhos_relatorio.csv";
            link.click();
        } catch (err) { alert("Erro no relatório: " + err.message); }
    }

    // ABAS E LOGOUT
    if (e.target.id === 'tabRegistro') {
        document.getElementById("secaoRegistro").style.display = "block";
        document.getElementById("secaoPerfil").style.display = "none";
    }
    if (e.target.id === 'tabPerfil') {
        document.getElementById("secaoRegistro").style.display = "none";
        document.getElementById("secaoPerfil").style.display = "block";
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
            alert("✅ Medição salva com sucesso!");
            e.target.reset(); 
        } catch (err) { 
            alert("Erro: " + err.message); 
        } finally { 
            if(btn) btn.disabled = false; 
        }
    }
});