// Exercícios que já vêm na base na primeira vez. Depois de editar a base, ela passa a vir do banco.
const s = (id, name, muscles, desc) => ({ id: `seed-${id}`, name, muscles, desc, photo: "" });

export const SEED = [
  s("supino-reto", "Supino reto", "Peitoral, tríceps, ombro anterior", "Deitado no banco, desça a barra até a altura do peito e empurre até estender os cotovelos."),
  s("supino-inclinado", "Supino inclinado", "Peitoral superior, ombro anterior, tríceps", "Mesmo movimento do supino reto, com o banco inclinado em cerca de 30°."),
  s("crucifixo", "Crucifixo", "Peitoral, ombro anterior", "Com halteres, abra os braços em arco até sentir o peito alongar e volte juntando as mãos."),
  s("flexao", "Flexão de braço", "Peitoral, tríceps, core", "Em prancha, desça o corpo até quase tocar o chão e empurre de volta mantendo o corpo alinhado."),
  s("puxada-frontal", "Puxada frontal", "Dorsal, bíceps, trapézio inferior", "Sentado, puxe a barra até a altura do queixo levando os cotovelos para baixo e para trás."),
  s("remada-curvada", "Remada curvada", "Dorsal, romboides, bíceps, lombar", "Com o tronco inclinado e a coluna neutra, puxe a barra em direção ao abdômen."),
  s("remada-baixa", "Remada baixa", "Dorsal, romboides, bíceps", "Sentado, puxe o triângulo até o abdômen juntando as escápulas, sem balançar o tronco."),
  s("desenvolvimento", "Desenvolvimento com halteres", "Ombros, tríceps", "Sentado, empurre os halteres da altura das orelhas até estender os braços acima da cabeça."),
  s("elevacao-lateral", "Elevação lateral", "Deltoide lateral", "Em pé, eleve os halteres pelos lados até a altura dos ombros, com os cotovelos levemente flexionados."),
  s("rosca-direta", "Rosca direta", "Bíceps, antebraço", "Em pé, flexione os cotovelos levando a barra até os ombros sem balançar o tronco."),
  s("rosca-martelo", "Rosca martelo", "Bíceps, braquial, antebraço", "Com as palmas voltadas uma para a outra, flexione os cotovelos alternando ou juntos."),
  s("triceps-testa", "Tríceps testa", "Tríceps", "Deitado, flexione os cotovelos levando a barra em direção à testa e estenda de volta."),
  s("triceps-corda", "Tríceps corda", "Tríceps", "Na polia alta, mantenha os cotovelos junto ao corpo e estenda os braços abrindo a corda no final."),
  s("agachamento", "Agachamento livre", "Quadríceps, glúteos, posteriores, core", "Com a barra nas costas, desça até as coxas ficarem paralelas ao chão, com os joelhos alinhados aos pés."),
  s("leg-press", "Leg press", "Quadríceps, glúteos", "Empurre a plataforma estendendo as pernas sem travar os joelhos e volte devagar."),
  s("extensora", "Cadeira extensora", "Quadríceps", "Sentado, estenda os joelhos até alinhar as pernas e retorne de forma controlada."),
  s("flexora", "Mesa flexora", "Posteriores de coxa", "Deitado de bruços, flexione os joelhos levando os calcanhares em direção aos glúteos."),
  s("stiff", "Stiff", "Posteriores, glúteos, lombar", "Com os joelhos levemente flexionados, leve o quadril para trás descendo a barra rente às pernas."),
  s("elevacao-pelvica", "Elevação pélvica", "Glúteos, posteriores", "Com as costas apoiadas no banco, suba o quadril até alinhar tronco e coxas e contraia os glúteos."),
  s("panturrilha", "Panturrilha em pé", "Panturrilha", "Suba na ponta dos pés o mais alto possível e desça alongando bem."),
  s("abdominal", "Abdominal", "Reto abdominal", "Deitado, flexione o tronco em direção aos joelhos sem puxar o pescoço."),
];
