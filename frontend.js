import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, 
  StatusBar, Alert, FlatList, Modal, Share, Platform, Animated 
} from 'react-native';

// Navegação
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Firebase (Importações do Banco de Dados)
// CERTIFIQUE-SE QUE O ARQUIVO firebaseConfig.js EXISTE NA MESMA PASTA
import { db } from './firebaseConfig'; 
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const AppContext = React.createContext();
const Stack = createNativeStackNavigator();

// =================================================================
// COMPONENTES AUXILIARES
// =================================================================

const HeaderInterno = ({ navigation, titulo }) => (
  <View style={styles.headerInterno}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVoltar}>
      <Text style={styles.setaVoltar}>‹</Text>
    </TouchableOpacity>
    <Text style={styles.tituloHeader}>{titulo}</Text>
    <View style={{width: 40}} /> 
  </View>
);

const CalendarioModal = ({ visivel, fechar, aoSelecionar }) => {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());

  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const gerarDias = () => {
    let dias = [];
    for (let i = 0; i < primeiroDiaSemana; i++) dias.push(<View key={`empty-${i}`} style={styles.diaCalendario} />);
    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(
        <TouchableOpacity key={i} style={styles.diaCalendario} onPress={() => {
          const diaF = i < 10 ? `0${i}` : i;
          const mesF = (mesAtual + 1) < 10 ? `0${mesAtual + 1}` : (mesAtual + 1);
          aoSelecionar(`${diaF}/${mesF}/${anoAtual}`);
          fechar();
        }}>
          <Text style={styles.textoDia}>{i}</Text>
        </TouchableOpacity>
      );
    }
    return dias;
  };

  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.calendarioContainer}>
          <View style={styles.calendarioHeader}>
            <TouchableOpacity onPress={() => setMesAtual(mesAtual - 1)}><Text style={styles.setaCal}>{'<'}</Text></TouchableOpacity>
            <Text style={styles.tituloCal}>{meses[mesAtual]} {anoAtual}</Text>
            <TouchableOpacity onPress={() => setMesAtual(mesAtual + 1)}><Text style={styles.setaCal}>{'>'}</Text></TouchableOpacity>
          </View>
          <View style={styles.diasContainer}>{gerarDias()}</View>
          <TouchableOpacity onPress={fechar} style={styles.btnFecharCal}><Text style={{color:'#fff'}}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// =================================================================
// 1. TELA DE LOGIN
// =================================================================
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const slideAnim = useRef(new Animated.Value(50)).current; 

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1200, useNativeDriver: true })
    ]).start();
  }, []);

  const validarLogin = () => {
    // Para facilitar seus testes enquanto configura o banco, deixei a validação mais leve
    // Se quiser ativar a validação forte de antes, só descomentar
    
    // const emailRegex = /\S+@\S+\.\S+/;
    // if (!emailRegex.test(email)) return Alert.alert("Erro", "E-mail inválido.");
    // if (senha.length < 7 || senha.length > 10) return Alert.alert("Erro", "Senha inválida.");

    navigation.replace('Dashboard');
  };

  return (
    <View style={styles.containerAzul}>
      <StatusBar backgroundColor="#121b29" barStyle="light-content" />
      <Animated.View style={[styles.cardLogin, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.topoLogin}>
          <Image source={require('./assets/logo.jpeg')} style={styles.logoLoginGrande} />
          <Text style={styles.tituloIgrejaEstilizado}>Igreja EGD</Text>
        </View>

        <Text style={styles.label}>E-mail</Text>
        <TextInput style={styles.input} placeholder="admin@egd.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>

        <Text style={styles.label}>Senha</Text>
        <Text style={styles.subLabel}>(7-10 caracteres)</Text>
        <View style={styles.areaSenha}>
          <TextInput style={styles.inputSenha} placeholder="Senha" secureTextEntry={!senhaVisivel} value={senha} onChangeText={setSenha} maxLength={10} />
          <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
            <Text style={{fontSize: 20}}>{senhaVisivel ? '👁️' : '🔒'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoPrincipal} onPress={validarLogin}>
          <Text style={styles.textoBotao}>ENTRAR</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// =================================================================
// 2. DASHBOARD
// =================================================================
function DashboardScreen({ navigation }) {
  const { transacoes, membros } = useContext(AppContext);

  // Cálculos baseados nos dados que vêm do Firebase
  const entradas = transacoes.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + (curr.valorNumerico || 0), 0);
  const saidas = transacoes.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + (curr.valorNumerico || 0), 0);
  const formatoMoeda = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const renderMenuOption = (titulo, icone, rota) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate(rota)}>
      <View style={styles.iconContainer}><Text style={styles.menuIcone}>{icone}</Text></View>
      <Text style={styles.menuTexto}>{titulo}</Text>
      <Text style={styles.arrow}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderFinanceCard = (titulo, valor, cor, icone, rotaDestino) => (
    <TouchableOpacity 
      style={[styles.cardGrande, { borderLeftColor: cor }]} 
      onPress={() => rotaDestino ? navigation.navigate(rotaDestino, { tipoFiltro: rotaDestino === 'Membros' ? null : (titulo.includes('Entradas') ? 'entrada' : 'saida') }) : null}
    >
      <View style={{flex: 1}}>
        <Text style={styles.cardTitulo}>{titulo}</Text>
        <Text style={[styles.cardValor, { color: cor }]}>{valor}</Text>
        <Text style={styles.cardClique}>Toque para detalhes</Text>
      </View>
      <View style={[styles.cardIconeBg, { backgroundColor: cor + '20' }]}>
        <Text style={[styles.cardIcone, { color: cor }]}>{icone}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.containerCinza}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.headerDash}>
        <View><Image source={require('./assets/logo.jpeg')} style={styles.logoDash} /></View>
        <View style={styles.perfilArea}>
          <View><Text style={styles.nomeAdmin}>(Igreja EGD)</Text><Text style={styles.cargoAdmin}>Admin.</Text></View>
          <View style={styles.avatarCircle}><Text style={{fontSize:22}}>⛪</Text></View>
        </View>
      </View>

      <ScrollView style={{flex: 1, padding: 20}} showsVerticalScrollIndicator={false}>
        <Text style={styles.tituloSecao}>MENU PRINCIPAL</Text>
        <View style={{marginBottom: 20}}>
          {renderMenuOption("Cadastro e listagem de membros", "👥", "Membros")}
          {renderMenuOption("Registro de dízimos e ofertas", "💰", "Dizimos")}
          {renderMenuOption("Registro de despesas", "📉", "Despesas")}
          {renderMenuOption("Relatórios", "📊", "Relatorios")}
        </View>

        <Text style={styles.tituloSecao}>RESUMO DO MÊS</Text>
        <View>
          {renderFinanceCard("Entradas Totais", formatoMoeda(entradas), "#2ecc71", "💰", "ExtratoDetalhado")}
          {renderFinanceCard("Saídas Totais", formatoMoeda(saidas), "#e74c3c", "📉", "ExtratoDetalhado")}
          {renderFinanceCard("Membros Ativos", membros.length, "#3498db", "👥", "Membros")}
        </View>
        <View style={{height: 20}} />
      </ScrollView>
    </View>
  );
}

// =================================================================
// 3. TELA DE MEMBROS (Conectada ao Banco)
// =================================================================
function MembrosScreen({ navigation }) {
  const { membros, adicionarMembro, removerMembro } = useContext(AppContext);
  const [aba, setAba] = useState('lista'); 
  
  const [idEdicao, setIdEdicao] = useState(null);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');

  const handleCpfChange = (text) => {
    let v = text.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(v);
  };

  const handleSalvar = () => {
    if(!nome) return Alert.alert("Atenção", "O nome é obrigatório");
    
    // Chama a função do Contexto que salva no Firebase
    adicionarMembro({ id: idEdicao, nome, cpf, cargo });
    
    Alert.alert("Sucesso", "Salvo na nuvem!");
    limparForm();
    setAba('lista');
  };

  const prepararEdicao = (item) => {
    setIdEdicao(item.id);
    setNome(item.nome);
    setCpf(item.cpf);
    setCargo(item.cargo);
    setAba('cadastro');
  };

  const excluirMembro = (id) => {
    Alert.alert("Excluir", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sim", onPress: () => removerMembro(id) }
    ]);
  };

  const limparForm = () => { setIdEdicao(null); setNome(''); setCpf(''); setCargo(''); };

  return (
    <View style={styles.containerCinza}>
      <HeaderInterno navigation={navigation} titulo="Membros" />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => { limparForm(); setAba('cadastro'); }} style={[styles.tabBtn, aba==='cadastro' && styles.tabBtnAtivo]}>
          <Text style={[styles.tabTxt, aba==='cadastro' && styles.tabTxtAtivo]}>{idEdicao ? "Editando..." : "Cadastrar"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAba('lista')} style={[styles.tabBtn, aba==='lista' && styles.tabBtnAtivo]}>
          <Text style={[styles.tabTxt, aba==='lista' && styles.tabTxtAtivo]}>Listagem</Text>
        </TouchableOpacity>
      </View>

      {aba === 'cadastro' ? (
        <ScrollView style={{padding: 20}}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome do membro" />
          <Text style={styles.label}>CPF</Text>
          <TextInput style={styles.input} value={cpf} onChangeText={handleCpfChange} keyboardType="numeric" placeholder="000.000.000-00" />
          <Text style={styles.label}>Cargo</Text>
          <TextInput style={styles.input} value={cargo} onChangeText={setCargo} placeholder="Ex: Membro" />
          
          <TouchableOpacity style={styles.botaoPrincipal} onPress={handleSalvar}>
            <Text style={styles.textoBotao}>{idEdicao ? "ATUALIZAR DADOS" : "SALVAR MEMBRO"}</Text>
          </TouchableOpacity>
          {idEdicao && <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => {limparForm(); setAba('lista');}}><Text style={{color: 'red'}}>Cancelar Edição</Text></TouchableOpacity>}
        </ScrollView>
      ) : (
        <FlatList
          data={membros}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: 20}}
          renderItem={({item}) => (
            <View style={styles.itemLista}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                <View style={[styles.avatarCircle, {width: 40, height: 40}]}><Text>👤</Text></View>
                <View style={{marginLeft: 15}}>
                  <Text style={{fontWeight: 'bold', fontSize: 16}}>{item.nome}</Text>
                  <Text style={{color: '#666'}}>{item.cargo} {item.cpf ? `• ${item.cpf}` : ''}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity onPress={() => prepararEdicao(item)} style={styles.btnAcao}><Text style={{fontSize: 20}}>✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => excluirMembro(item.id)} style={[styles.btnAcao, {marginLeft: 10}]}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.listaVaziaTexto}>Nenhum membro encontrado.</Text>}
        />
      )}
    </View>
  );
}

// =================================================================
// 4. TELA DE DÍZIMOS (Conectada ao Banco)
// =================================================================
function DizimosScreen({ navigation }) {
  const { membros, adicionarTransacao } = useContext(AppContext);
  const [modalMembro, setModalMembro] = useState(false);
  const [modalData, setModalData] = useState(false);
  
  const [membroSel, setMembroSel] = useState(null);
  const [valorDisplay, setValorDisplay] = useState('');
  const [valorNumerico, setValorNumerico] = useState(0);
  const [tipo, setTipo] = useState('Dízimo');
  const [dataDisplay, setDataDisplay] = useState('');

  const handleMudarValor = (texto) => {
    let numeroLimpo = texto.replace(/\D/g, ""); 
    let valor = Number(numeroLimpo) / 100;
    setValorNumerico(valor);
    setValorDisplay(valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const handleSalvar = () => {
    if(!membroSel || valorNumerico <= 0 || !dataDisplay) return Alert.alert("Erro", "Preencha todos os campos");
    
    // Salva no Firebase via Contexto
    adicionarTransacao({
      tipo: 'entrada',
      valorNumerico: valorNumerico,
      valorFormatado: valorDisplay,
      data: dataDisplay,
      descricao: `${tipo} - ${membroSel.nome}`,
    });

    Alert.alert("Sucesso", "Dízimo salvo na nuvem!");
    navigation.goBack();
  };

  return (
    <View style={styles.containerCinza}>
      <HeaderInterno navigation={navigation} titulo="Registro de Entradas" />
      <ScrollView style={{padding: 20}}>
        <Text style={styles.label}>Selecione o Membro</Text>
        <TouchableOpacity style={styles.inputSelect} onPress={() => setModalMembro(true)}>
          <Text style={{color: membroSel ? '#000' : '#aaa'}}>{membroSel ? membroSel.nome : "Toque para selecionar"}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Valor</Text>
        <TextInput style={styles.input} value={valorDisplay} onChangeText={handleMudarValor} keyboardType="numeric" placeholder="R$ 0,00" />

        <Text style={styles.label}>Tipo</Text>
        <View style={{flexDirection: 'row', marginBottom: 15}}>
          {['Dízimo', 'Oferta'].map(op => (
            <TouchableOpacity key={op} onPress={() => setTipo(op)} style={[styles.radio, tipo===op && styles.radioAtivo]}>
              <Text style={[styles.radioTxt, tipo===op && {color:'#fff'}]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Data</Text>
        <TouchableOpacity style={styles.inputSelect} onPress={() => setModalData(true)}>
          <Text style={{color: dataDisplay ? '#000' : '#aaa'}}>{dataDisplay || "Selecionar Data"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botaoPrincipal, {backgroundColor: '#2ecc71'}]} onPress={handleSalvar}>
          <Text style={styles.textoBotao}>REGISTRAR ENTRADA</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalMembro} animationType="slide">
        <View style={{flex:1, padding: 20}}>
          <Text style={styles.tituloSecao}>Selecione o Membro</Text>
          <FlatList data={membros} keyExtractor={i=>i.id} renderItem={({item}) => (
            <TouchableOpacity style={styles.itemLista} onPress={()=>{setMembroSel(item); setModalMembro(false)}}>
              <Text style={{fontWeight:'bold'}}>{item.nome}</Text>
            </TouchableOpacity>
          )} ListEmptyComponent={<Text>Sem membros cadastrados.</Text>} />
          <TouchableOpacity onPress={()=>setModalMembro(false)} style={{padding:20, alignItems:'center'}}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
        </View>
      </Modal>

      <CalendarioModal visivel={modalData} fechar={()=>setModalData(false)} aoSelecionar={setDataDisplay} />
    </View>
  );
}

// =================================================================
// 5. TELA DE DESPESAS (Conectada ao Banco)
// =================================================================
function DespesasScreen({ navigation }) {
  const { adicionarTransacao } = useContext(AppContext);
  const [modalData, setModalData] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valorDisplay, setValorDisplay] = useState('');
  const [valorNumerico, setValorNumerico] = useState(0);
  const [dataDisplay, setDataDisplay] = useState('');

  const handleMudarValor = (texto) => {
    let numeroLimpo = texto.replace(/\D/g, ""); 
    let valor = Number(numeroLimpo) / 100;
    setValorNumerico(valor);
    setValorDisplay(valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const handleSalvar = () => {
    if(!descricao || valorNumerico <= 0 || !dataDisplay) return Alert.alert("Erro", "Preencha tudo");
    
    // Salva no Firebase via Contexto
    adicionarTransacao({
      tipo: 'saida',
      valorNumerico: valorNumerico,
      valorFormatado: valorDisplay,
      data: dataDisplay,
      descricao: descricao,
    });

    Alert.alert("Sucesso", "Despesa salva na nuvem!");
    navigation.goBack();
  };

  return (
    <View style={styles.containerCinza}>
      <HeaderInterno navigation={navigation} titulo="Registro de Despesas" />
      <ScrollView style={{padding: 20}}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput style={styles.input} value={descricao} onChangeText={setDescricao} placeholder="Descrição da conta" />

        <Text style={styles.label}>Valor</Text>
        <TextInput style={styles.input} value={valorDisplay} onChangeText={handleMudarValor} keyboardType="numeric" placeholder="R$ 0,00" />

        <Text style={styles.label}>Data</Text>
        <TouchableOpacity style={styles.inputSelect} onPress={() => setModalData(true)}>
          <Text style={{color: dataDisplay ? '#000' : '#aaa'}}>{dataDisplay || "Selecionar Data"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botaoPrincipal, {backgroundColor: '#e74c3c'}]} onPress={handleSalvar}>
          <Text style={styles.textoBotao}>REGISTRAR SAÍDA</Text>
        </TouchableOpacity>
      </ScrollView>
      <CalendarioModal visivel={modalData} fechar={()=>setModalData(false)} aoSelecionar={setDataDisplay} />
    </View>
  );
}

// =================================================================
// 6. TELA DE RELATÓRIOS
// =================================================================
function RelatoriosScreen({ navigation }) {
  const { transacoes } = useContext(AppContext);

  const handleExportar = async () => {
    let csvHeader = "ID,TIPO,DESCRICAO,DATA,VALOR\n";
    let csvBody = transacoes.map(t => `${t.id},${t.tipo},${t.descricao},${t.data},${t.valorNumerico}`).join('\n');
    const csvContent = csvHeader + csvBody;
    try { await Share.share({ message: csvContent, title: "Relatorio_IgrejaEGD.csv" }); } catch (error) { Alert.alert("Erro", "Não foi possível compartilhar."); }
  };

  const entradas = transacoes.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + (curr.valorNumerico||0), 0);
  const saidas = transacoes.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + (curr.valorNumerico||0), 0);
  const saldo = entradas - saidas;

  return (
    <View style={styles.containerCinza}>
      <HeaderInterno navigation={navigation} titulo="Relatório Financeiro" />
      <ScrollView style={{padding: 20}}>
        <View style={styles.tabelaContainer}>
          <View style={styles.linhaTabela}><Text>Entradas</Text><Text style={{color:'green', fontWeight:'bold'}}>R$ {entradas.toFixed(2)}</Text></View>
          <View style={styles.linhaTabela}><Text>Saídas</Text><Text style={{color:'red', fontWeight:'bold'}}>R$ {saidas.toFixed(2)}</Text></View>
          <View style={[styles.linhaTabela, {borderTopWidth: 1, marginTop: 5}]}>
            <Text style={{fontWeight:'bold', fontSize:18}}>SALDO</Text>
            <Text style={{fontWeight:'bold', fontSize:18, color: saldo>=0 ? 'blue' : 'red'}}>R$ {saldo.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.botaoPrincipal, {marginTop: 20, backgroundColor: '#107c41'}]} onPress={handleExportar}>
          <Text style={styles.textoBotao}>EXPORTAR RELATÓRIO EXCEL</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// =================================================================
// 7. EXTRATO DETALHADO
// =================================================================
function ExtratoDetalhadoScreen({ route, navigation }) {
  const { tipoFiltro } = route.params; 
  const { transacoes } = useContext(AppContext);
  const dadosFiltrados = transacoes.filter(t => t.tipo === tipoFiltro);

  return (
    <View style={styles.containerCinza}>
      <HeaderInterno navigation={navigation} titulo={tipoFiltro === 'entrada' ? 'Detalhes de Entradas' : 'Detalhes de Saídas'} />
      <FlatList 
        data={dadosFiltrados}
        keyExtractor={item => item.id}
        contentContainerStyle={{padding: 20}}
        renderItem={({item}) => (
          <View style={styles.itemLista}>
            <View>
              <Text style={{fontWeight:'bold', color: '#333'}}>{item.descricao}</Text>
              <Text style={{fontSize: 12, color:'#888'}}>{item.data}</Text>
            </View>
            <Text style={{fontWeight:'bold', color: tipoFiltro==='entrada'?'green':'red'}}>
              {item.valorFormatado}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.listaVaziaTexto}>Nenhum registro encontrado.</Text>}
      />
    </View>
  );
}

// =================================================================
// APP PRINCIPAL (NÚCLEO DO BANCO DE DADOS)
// =================================================================
export default function App() {
  const [membros, setMembros] = useState([]);
  const [transacoes, setTransacoes] = useState([]);

  // 1. OUVINTES EM TEMPO REAL DO FIREBASE
  useEffect(() => {
    // Escutar Coleção de Membros
    const unsubMembros = onSnapshot(collection(db, "membros"), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembros(lista);
    });

    // Escutar Coleção de Transações
    const unsubTransacoes = onSnapshot(collection(db, "transacoes"), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransacoes(lista);
    });

    return () => { unsubMembros(); unsubTransacoes(); };
  }, []);

  // 2. FUNÇÕES PARA SALVAR/EXCLUIR
  const adicionarMembro = async (dados) => {
    try {
      if (dados.id) {
        // Atualizar
        await updateDoc(doc(db, "membros", dados.id), { nome: dados.nome, cpf: dados.cpf, cargo: dados.cargo });
      } else {
        // Criar Novo
        await addDoc(collection(db, "membros"), { nome: dados.nome, cpf: dados.cpf, cargo: dados.cargo });
      }
    } catch (e) { Alert.alert("Erro", "Falha ao salvar membro"); }
  };

  const removerMembro = async (id) => {
    try { await deleteDoc(doc(db, "membros", id)); } catch(e) { Alert.alert("Erro", "Falha ao excluir"); }
  };

  const adicionarTransacao = async (dados) => {
    try { await addDoc(collection(db, "transacoes"), dados); } catch(e) { Alert.alert("Erro", "Falha ao salvar transação"); }
  };

  return (
    <AppContext.Provider value={{ membros, transacoes, adicionarMembro, removerMembro, adicionarTransacao }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Membros" component={MembrosScreen} />
          <Stack.Screen name="Dizimos" component={DizimosScreen} />
          <Stack.Screen name="Despesas" component={DespesasScreen} />
          <Stack.Screen name="Relatorios" component={RelatoriosScreen} />
          <Stack.Screen name="ExtratoDetalhado" component={ExtratoDetalhadoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}

// =================================================================
// ESTILOS
// =================================================================
const styles = StyleSheet.create({
  containerAzul: { flex: 1, backgroundColor: '#121b29', justifyContent: 'center', padding: 20 },
  containerCinza: { flex: 1, backgroundColor: '#f4f6f8' },
  cardLogin: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 10 },
  topoLogin: { alignItems: 'center', marginBottom: 30 },
  logoLoginGrande: { width: 140, height: 100, resizeMode: 'contain', marginBottom: 15 },
  tituloIgrejaEstilizado: { fontSize: 28, fontWeight: 'bold', color: '#121b29', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  label: { fontWeight: '700', marginBottom: 5, color: '#333', marginTop: 10 },
  subLabel: { fontSize: 10, color: '#666', marginBottom: 5 },
  input: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 12, fontSize: 16, color: '#000', borderWidth: 1, borderColor: '#eee' },
  inputSelect: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eee' },
  areaSenha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#eee' },
  inputSenha: { flex: 1, paddingVertical: 12, fontSize: 16 },
  botaoPrincipal: { backgroundColor: '#0b1d45', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25, elevation: 3 },
  textoBotao: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  headerInterno: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  btnVoltar: { padding: 5, width: 40 },
  setaVoltar: { fontSize: 45, color: '#0b1d45', fontWeight: '300', marginTop: -15, height: 50 }, 
  tituloHeader: { fontSize: 18, fontWeight: 'bold', color: '#121b29' },
  headerDash: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#ddd', elevation: 4 },
  logoDash: { width: 70, height: 50, resizeMode: 'contain' },
  perfilArea: { flexDirection: 'row', alignItems: 'center' },
  nomeAdmin: { fontSize: 14, fontWeight: 'bold', color: '#121b29', textAlign: 'right' },
  cargoAdmin: { fontSize: 11, color: '#666', textAlign: 'right' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121b29', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  tituloSecao: { fontSize: 14, fontWeight: '900', color: '#121b29', marginBottom: 15, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 15, marginBottom: 10, borderRadius: 12, elevation: 2 },
  iconContainer: { width: 35, alignItems: 'center', marginRight: 10 },
  menuIcone: { fontSize: 22 },
  menuTexto: { fontSize: 16, color: '#121b29', flex: 1, fontWeight: '600' },
  arrow: { color: '#ccc', fontSize: 20, fontWeight: 'bold' },
  cardGrande: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 12, marginBottom: 15, borderLeftWidth: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  cardTitulo: { color: '#888', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  cardValor: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  cardClique: { fontSize: 11, color: '#aaa', fontStyle: 'italic' },
  cardIconeBg: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  cardIcone: { fontSize: 26 },
  tabContainer: { flexDirection: 'row', margin: 20, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', elevation: 2 },
  tabBtn: { flex: 1, padding: 15, alignItems: 'center' },
  tabBtnAtivo: { backgroundColor: '#0b1d45' },
  tabTxt: { fontWeight: 'bold', color: '#999' },
  tabTxtAtivo: { color: '#fff' },
  itemLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 10, elevation: 1 },
  listaVaziaTexto: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  btnAcao: { padding: 5 },
  radio: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#0b1d45', borderRadius: 8, alignItems: 'center', marginRight: 10 },
  radioAtivo: { backgroundColor: '#0b1d45' },
  radioTxt: { color: '#0b1d45', fontWeight: 'bold' },
  tabelaContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 2 },
  linhaTabela: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  calendarioContainer: { backgroundColor: '#fff', borderRadius: 15, padding: 15, elevation: 5 },
  calendarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  tituloCal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  setaCal: { fontSize: 24, color: '#0b1d45', paddingHorizontal: 15 },
  diasContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  diaCalendario: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  textoDia: { fontSize: 16, color: '#333' },
  btnFecharCal: { marginTop: 15, alignSelf: 'center', padding: 10, backgroundColor: '#e74c3c', borderRadius: 5, width: '100%', alignItems: 'center' }
});