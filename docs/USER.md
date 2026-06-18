# Chilli — Guia do Usuário

> Como usar a plataforma para jogar RPG de mesa online com seus amigos.
> Última atualização: 16/06/2026.

---

## 1. O que é o Chilli?

Chilli é uma plataforma de **RPG de mesa online** focada em simplicidade
e velocidade. A ideia é que você abra o app, crie uma mesa e comece a
sessão em **menos de 30 segundos** — sem instalar nada, sem configurar
plugins, sem complicação.

Funciona no navegador do celular e do computador. Você também pode
**instalar** como um aplicativo (PWA) na tela inicial do Android e do
iPhone.

### O que dá para fazer no Chilli

- **Salas** — criar, entrar por link, entrar por código.
- **Chat em tempo real** — converse com a mesa inteira.
- **Dados** — d4, d6, d8, d10, d12, d20, d100 e expressões customizadas
  (ex.: `2d20+5`).
- **Jogadores** — nome e avatar.
- **Fichas** — estrutura JSON flexível que você molda ao seu sistema.
- **Mapa** — faça upload de uma imagem, dê zoom e arraste.

### O que **não** tem (ainda)

Voz, vídeo, IA, marketplace, fog of war, sistema de combate pronto,
economia virtual. O foco do MVP é o essencial: sala, chat, dados, ficha
e mapa.

---

## 2. Primeiros passos

### 2.1. Criar uma conta

1. Abra o Chilli no navegador.
2. Toque em **Criar conta**.
3. Informe **nome**, **e-mail** e **senha**.
4. Escolha um **avatar** (você pode trocar depois).
5. Pronto. Você está logado.

### 2.2. Instalar como aplicativo (opcional)

- **Android (Chrome)**: abra o site, toque no menu (⋮) e em
  **"Adicionar à tela inicial"**.
- **iPhone (Safari)**: abra o site, toque em **Compartilhar** e em
  **"Adicionar à tela de início"**.

Depois disso, o Chilli abre como um app normal — ícone próprio, sem
barra do navegador.

---

## 3. Criar uma mesa

1. Na tela inicial, toque em **Criar mesa**.
2. Dê um **nome** para a mesa.
3. Toque em **Criar**.

Você recebe:

- Um **link** para compartilhar com seus jogadores.
- Um **código curto** (6 caracteres) para quem preferir digitar.

A sala já está aberta. O chat já está funcionando. Em menos de 30
segundos você está pronto para jogar.

---

## 4. Entrar em uma mesa

Você tem **três formas** de entrar:

### 4.1. Por link

O mestre (ou um jogador) envia o link. Toque nele. Se você não estiver
logado, o app pede para entrar ou criar conta. Pronto: você está na
mesa.

### 4.2. Por código

1. Toque em **Entrar por código** na tela inicial.
2. Digite o código de 6 caracteres.
3. Toque em **Entrar**.

### 4.3. Pela lista de mesas (se você já participa)

Mesas recentes aparecem na sua **Home**. Toque em uma para entrar
direto.

---

## 5. Conhecendo a sala

A sala é o centro da sessão. No mobile, a navegação principal fica na
**barra inferior**:

| Ícone      | O que faz                                  |
|------------|--------------------------------------------|
| 💬 Chat    | Mensagens em tempo real                    |
| 🎲 Dados   | Rola dados                                 |
| 🗺️ Mapa    | Mostra e manipula o mapa da mesa           |
| 📋 Ficha   | Fichas dos personagens                     |
| 👥 Mesa    | Lista de jogadores conectados              |

No **desktop**, a mesma navegação aparece como uma **barra lateral
fixa** à esquerda.

---

## 6. Chat

A aba mais usada durante a sessão.

- **Digite** sua mensagem e toque em **enviar** (ou pressione Enter no
  desktop).
- Mensagens aparecem **em tempo real** para todos na sala.
- O chat é **persistente**: quando alguém entra, vê o histórico da
  conversa.

### Dicas

- Use `@nome` para chamar a atenção de um jogador (a notificação acende
  para ele).
- Mensagens longas podem ser quebradas com `Shift+Enter` no desktop.

---

## 7. Rolando dados

O Chilli tem um **composer de dados** que cobre a maioria dos sistemas
de RPG.

### 7.1. Botões rápidos

Toque em qualquer botão de dado para rolar **um** desse:

- **d4** · **d6** · **d8** · **d10** · **d12** · **d20** · **d100**

Por padrão, o resultado vai para o **chat** com o nome de quem rolou,
o tipo de dado e o valor.

### 7.2. Expressões customizadas

Toque no campo de expressão para abrir o composer. Exemplos:

- `1d20+5` — um d20 com bônus 5.
- `2d6` — soma de dois d6 (muito usado em dano).
- `4d6kh3` — quatro d6, **mantém os três maiores** (criar atributo).
- `2d20kl1` — dois d20, **mantém o menor** (desvantagem).
- `1d100` —百分制 / percentil.

Depois toque em **Rolar**. O resultado aparece no chat com o detalhe
de cada dado individual.

### 7.3. Notação suportada

| Sintaxe      | Significado                              |
|--------------|------------------------------------------|
| `NdX`        | N dados de X lados                       |
| `NdX+M`      | Soma M ao resultado                      |
| `NdX-M`      | Subtrai M                                |
| `NdXkhK`     | Mantém os K maiores (keep high)          |
| `NdXklK`     | Mantém os K menores (keep low)           |
| `NdX!`       | Explosão: cada máximo rerola e soma      |

Se a expressão for inválida, o composer mostra o erro antes de você
rolar.

---

## 8. Mapa

A aba de mapa é onde a mesa se encontra visualmente.

### 8.1. Upload do mapa (mestre)

1. Abra a aba **Mapa**.
2. Toque em **Trocar mapa**.
3. Escolha uma imagem do seu dispositivo.
4. Pronto: o mapa aparece para **toda a mesa**.

Formatos aceitos: PNG, JPG, WebP. Mapas muito grandes são reduzidos
automaticamente para caberem no cache.

### 8.2. Navegação

- **Zoom**: pinça com dois dedos (mobile) ou roda do mouse (desktop).
- **Arrastar**: um dedo / clique esquerdo + arrastar.
- **Centralizar**: toque duplo para recentralizar.

### 8.3. Tokens

Você pode adicionar **tokens** (marcadores) sobre o mapa para
representar personagens. Toque em **+ Token**, posicione e nomeie.
Para mover, arraste. Para apagar, mantenha pressionado e escolha
**remover**.

---

## 9. Fichas

As fichas são **JSON flexível**: o Chilli não impõe um sistema de RPG.
A mesa define a estrutura que quiser.

### 9.1. Criar uma ficha

1. Toque em **+ Nova ficha**.
2. Dê um nome ao personagem.
3. Preencha os campos. Você pode adicionar, renomear ou remover
   campos livremente.

### 9.2. Compartilhar com a mesa

A ficha é **pessoal por padrão**. Toque em **Compartilhar com a mesa**
para que o mestre (e opcionalmente os outros jogadores) possam ver.
Você mantém o controle de edição.

### 9.3. Estrutura sugerida

Um ponto de partida comum:

```
{
  "nome": "Aelinor",
  "classe": "Barda",
  "nivel": 3,
  "atributos": {
    "forca": 12,
    "destreza": 16,
    "constituicao": 14,
    "inteligencia": 10,
    "sabedoria": 13,
    "carisma": 18
  },
  "hp": 24,
  "ca": 15
}
```

Você pode guardar qualquer campo que seu sistema pedir.

---

## 10. Jogadores e mesa

Na aba **Mesa** você vê quem está conectado no momento.

- **Mestre (GM)**: é o dono da sala. Vê tudo e tem poderes de
  moderação.
- **Jogador**: conectado à mesa, com acesso a chat, dados, mapa e
  fichas (próprias e, opcionalmente, compartilhadas).

O mestre pode:

- **Convidar** alguém via link ou código.
- **Remover** um jogador da sala.
- **Encerrar** a mesa.

---

## 11. Atalhos e gestos (mobile)

| Gesto                          | Ação                      |
|--------------------------------|---------------------------|
| Toque duplo no mapa            | Centralizar               |
| Pinça com dois dedos           | Zoom                      |
| Arrastar com um dedo           | Mover (mapa ou token)     |
| Long press em um token         | Menu de opções            |
| Deslizar da esquerda (chat)    | Responder mensagem        |
| Pull-to-refresh (lista de msgs) | Atualizar histórico      |

---

## 12. Perguntas frequentes

**Posso usar sem criar conta?**
Não. Você precisa de uma conta para entrar em qualquer mesa. Criar
conta leva menos de 30 segundos.

**Quantos jogadores cabem em uma mesa?**
O MVP foi dimensionado para **mesas típicas de RPG de 4 a 7 jogadores
+ mestre**. Números maiores funcionam, mas não foram otimizados.

**As mensagens e rolagens ficam salvas?**
Sim. Chat, rolagens e fichas ficam **persistidos no servidor**. Quando
alguém entra na sala, vê o histórico.

**Posso usar no tablet?**
Sim. O layout se adapta: tablet usa a mesma bottom bar do mobile em
modo retrato e migra para side rail em paisagem.

**O mapa é público?**
Sim — o mapa é compartilhado com **toda a mesa**. Tokens são visíveis
para todos por padrão; o dono pode ocultar um token se quiser.

**Funciona offline?**
Não no MVP. A sala precisa de conexão ativa. Em conexões ruins o app
mostra um aviso e tenta reconectar automaticamente.

**Como apago uma mesa?**
Apenas o **mestre** pode encerrar a mesa. Na aba **Mesa**, role até o
final e toque em **Encerrar mesa**. Essa ação é definitiva.

**E se eu esquecer a senha?**
Use o link **"Esqueci minha senha"** na tela de login. Você recebe um
e-mail com instruções para redefinir.

---

## 13. Boas práticas de mesa

Algumas dicas para sessões mais suaves no Chilli:

- **Defina o sistema antes da sessão.** Combinem em qual sistema estão
  jogando e como a ficha será estruturada.
- **Use o chat com intenção.** Mensagens em [`IC`] (em personagem) e
  [`OOC`] (fora de personagem) deixam a leitura mais clara.
- **Uma rolagem por vez.** Espere o resultado da rolagem anterior
  aparecer antes de rolar a próxima — evita confusão no log.
- **Mestre como âncora.** O mestre cuida de compartilhar o link, abrir
  o mapa, e manter a sala organizada.
- **Salve o link.** Depois de criar a mesa, mande o link em um canal
  permanente (grupo de WhatsApp, Discord etc.) para ninguém perder.

---

## 14. Precisa de ajuda?

- Em caso de **bug ou comportamento estranho**, anote o que aconteceu
  (o que você fez, o que esperava, o que aconteceu de fato) e envie
  para a equipe.
- Sugestões de melhoria são bem-vindas — o Chilli evolui com base no
  uso real das mesas.

Bom jogo! 🎲
