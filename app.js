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
// 1. FUNÇÕES DE INTERFACE
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

// ==========================================
// 2. MONITOR DE AUTENTICAÇÃO (O "CÉREBRO")
// ==========================================
onAuthStateChanged(auth, async (user) => {
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
            console.error("Erro no BD:", e);
            mostrarTela("telaLogin");
        }
    } else {
        mostrarTela("telaLogin");
    }
});

// Captura do celular
getRedirectResult(auth).then(result => {
    if(result?.user) console.log("Celular logado via Redirect!");
}).catch(e => console.error("Erro no Redirect do celular:", e));


// ==========================================
// 3. DELEGAÇÃO DE EVENTOS (CÓDIGO ANTI-TRAVAMENTO)
// Isso impede o erro "Cannot set properties of null"
// ==========================================
document.addEventListener('click', async (e) => {
    
    // BOTÃO LOGIN
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Conectando...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            // Celular usa Redirect, PC usa Popup
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (err) {
            console.error(err);
            e.target.innerText = "Entrar com Google";
            alert("Erro ao abrir janela de login. Atualize a página.");
        }
    }

    // BOTÃO SALVAR CADASTRO
    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
                nome: nomeEl.value, email: auth.currentUser.email, data: new Date()
            });
            window.location.reload();
        } catch (err) { 
            alert("Erro: " + err.message); 
            e.target.innerText = "Finalizar Cadastro";
        }
    }

    // BOTÃO BAIXAR RELATÓRIO
    if (e.target.id === 'btnBaixarRelatorio') {
        try {
            const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
            let csv = "\ufeffData,Coletor,Tanque,Amonia,pH\n";
            snap.forEach(doc => {
                const d = doc.data();
                const dt = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : "";
                csv += `${dt},${d.coletor},${d.tanque},${d.amonia},${d.ph}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "relatorio.csv";
            link.click();
        } catch (err) { alert("Erro: " + err.message); }
    }

    // ABAS DA INTERFACE
    if (e.target.id === 'tabRegistro') {
        document.getElementById("secaoRegistro").style.display = "block";
        document.getElementById("secaoPerfil").style.display = "none";
    }
    if (e.target.id === 'tabPerfil') {
        document.getElementById("secaoRegistro").style.display = "none";
        document.getElementById("secaoPerfil").style.display = "block";
    }

    // BOTÃO SAIR
    if (e.target.id === 'btnSair') {
        await signOut(auth);
        window.location.reload();
    }
});

// ==========================================
// 4. DELEGAÇÃO DE FORMULÁRIO (SALVAR MEDIÇÃO)
// ==========================================
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'formMedicao') {
        e.preventDefault();
        const btn = document.getElementById("btnSalvarMedicao");
        if(btn) btn.disabled = true;
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader").innerText,
                tanque: document.getElementById("tanque").value,
                amonia: parseFloat(document.getElementById("amonia").value),
                ph: parseFloat(document.getElementById("ph").value),
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