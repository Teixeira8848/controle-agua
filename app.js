import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRLrik-rHVfDNz_gn2P4oYgraM64iHI0k",
  authDomain: "parametros-de-qualidade.firebaseapp.com",
  projectId: "parametros-de-qualidade",
  storageBucket: "parametros-de-qualidade.firebasestorage.app",
  messagingSenderId: "329194124166",
  appId: "1:329194124166:web:50d3685ef680284c5fb207",
  measurementId: "G-E8WPP91D8D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const paginaAtual = window.location.pathname;

// Variável global para guardar o nome do usuário ativo (para os relatórios)
let nomeUsuarioAtivo = "Usuário Desconhecido";

// -------------------------------------------------------------------
// 1. GERENCIADOR DE ROTAS
// -------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      nomeUsuarioAtivo = docSnap.data().nome; // Guarda o nome para usar nas medições
      if (paginaAtual.endsWith("index.html") || paginaAtual.endsWith("cadastro.html") || paginaAtual === "/") {
        window.location.href = "app.html";
      }
    } else {
      if (!paginaAtual.endsWith("cadastro.html")) {
        window.location.href = "cadastro.html";
      }
    }
  } else {
    if (!paginaAtual.endsWith("index.html") && paginaAtual !== "/") {
      window.location.href = "index.html";
    }
  }
});

// -------------------------------------------------------------------
// 2 & 3. TELAS DE LOGIN E CADASTRO (Mantidas inalteradas)
// -------------------------------------------------------------------
const btnLogin = document.getElementById("loginGoogleBtn");
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try {
      btnLogin.innerText = "Abrindo Google...";
      await signInWithPopup(auth, provider);
    } catch (error) { alert("Erro ao tentar logar."); btnLogin.innerText = "Entrar com Google"; }
  });
}

const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
  btnSalvar.addEventListener("click", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return; 
    const nome = document.getElementById("nome").value;
    const fotoInput = document.getElementById("foto");
    if (!nome) { alert("Digite o seu nome."); return; }
    try {
      btnSalvar.innerText = "Salvando..."; btnSalvar.disabled = true;
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: nome, email: user.email,
        foto: fotoInput.files[0] ? fotoInput.files[0].name : null,
        dataCadastro: new Date()
      });
      window.location.href = "app.html"; 
    } catch (err) { alert("Erro de conexão."); btnSalvar.innerText = "Salvar"; btnSalvar.disabled = false; }
  });
}

// -------------------------------------------------------------------
// 4. TELA DO APLICATIVO (Coleta de Dados)
// -------------------------------------------------------------------
const formMedicao = document.getElementById("formMedicao");
if (formMedicao) {
  
  // Função utilitária: converte campo vazio para null, ou texto para número
  const getValor = (id) => {
    const val = document.getElementById(id).value;
    return val === "" ? null : parseFloat(val);
  };

  formMedicao.addEventListener("submit", async (event) => {
    event.preventDefault(); // Impede recarregamento da página

    const user = auth.currentUser;
    if (!user) return;

    const btnSalvarMedicao = document.getElementById("btnSalvarMedicao");
    btnSalvarMedicao.innerText = "Gravando no banco...";
    btnSalvarMedicao.disabled = true;

    // Monta o pacote de dados do experimento
    const dadosMedicao = {
      // Metadados invisíveis
      uid: user.uid,
      coletor: nomeUsuarioAtivo,
      timestamp: serverTimestamp(), // Hora exata do Google
      
      // Identificação
      turno: document.getElementById("turno").value,
      tanque: document.getElementById("tanque").value,
      
      // Kit Colorimétrico
      amonia: getValor("amonia"),
      nitrito: getValor("nitrito"),
      alcalinidade: getValor("alcalinidade"),
      dureza: getValor("dureza"),
      
      // Kit Multiparâmetro
      ph: getValor("ph"),
      od: getValor("od"),
      temperatura: getValor("temperatura"),
      condutividade: getValor("condutividade"),
      salinidade: getValor("salinidade"),
      solidos: getValor("solidos")
    };

    try {
      // Salva na coleção "medicoes"
      await addDoc(collection(db, "medicoes"), dadosMedicao);
      alert("Medição registrada com sucesso!");
      formMedicao.reset(); // Limpa o formulário para a próxima caixa
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar medição. Tente novamente.");
    } finally {
      btnSalvarMedicao.innerText = "💾 Salvar Medição";
      btnSalvarMedicao.disabled = false;
    }
  });
}

// -------------------------------------------------------------------
// 5. GERAÇÃO DE RELATÓRIO E LOGOUT
// -------------------------------------------------------------------
const btnBaixarRelatorio = document.getElementById("btnBaixarRelatorio");
if (btnBaixarRelatorio) {
  btnBaixarRelatorio.addEventListener("click", async () => {
    btnBaixarRelatorio.innerText = "Gerando...";
    try {
      // Puxa todos os dados ordenados por data
      const q = query(collection(db, "medicoes"), orderBy("timestamp", "asc"));
      const querySnapshot = await getDocs(q);
      
      // Cabeçalho da planilha Excel (CSV)
      let csvContent = "Data,Hora,Coletor,Turno,Tanque,Amonia(mg/L),Nitrito(mg/L),Alcalinidade,Dureza,pH,OD,Temperatura,Condutividade,Salinidade,Solidos\n";

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        
        // Formata a data do Firebase para o padrão brasileiro
        let dataStr = "N/A";
        let horaStr = "N/A";
        if (d.timestamp) {
          const dateObj = d.timestamp.toDate();
          dataStr = dateObj.toLocaleDateString("pt-BR");
          horaStr = dateObj.toLocaleTimeString("pt-BR");
        }

        // Troca os "null" por vazio para ficar bonito no Excel
        const row = [
          dataStr, horaStr, d.coletor, d.turno, d.tanque,
          d.amonia ?? "", d.nitrito ?? "", d.alcalinidade ?? "", d.dureza ?? "",
          d.ph ?? "", d.od ?? "", d.temperatura ?? "", d.condutividade ?? "", d.salinidade ?? "", d.solidos ?? ""
        ];
        
        csvContent += row.join(",") + "\n";
      });

      // Cria e baixa o arquivo mágico
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "relatorio_qualidade_agua.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      alert("Erro ao gerar o relatório.");
    } finally {
      btnBaixarRelatorio.innerText = "📥 Baixar Relatório";
    }
  });
}

// Botão Sair
const btnSair = document.getElementById("btnSair");
if (btnSair) {
  btnSair.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}