# Guia de Testes Automatizados

Este documento explica como executar os testes automatizados do projeto MTG Jumpstart Foundations.

## Pré-requisitos

- **Node.js** (versão 16 ou superior)
- **npm** (vem junto com Node.js)

### Verificar instalação

```bash
node --version  # Deve mostrar v16.x.x ou superior
npm --version   # Deve mostrar 8.x.x ou superior
```

### Instalar Node.js (se necessário)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Ou via nvm (recomendado):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

---

## Setup Inicial (apenas uma vez)

Na pasta raiz do projeto, execute:

```bash
cd <pasta-do-projeto>
npm install
```

Isso instalará o Jest (framework de testes) e suas dependências.

---

## Executando os Testes

### Rodar todos os testes

```bash
npm test
```

### Rodar testes com mais detalhes

```bash
npm run test:verbose
```

### Rodar testes em modo watch (re-executa ao salvar)

```bash
npm run test:watch
```

### Rodar testes com cobertura de código

```bash
npm run test:coverage
```

### Rodar um arquivo de teste específico

```bash
npx jest tests/combat.test.js
npx jest tests/triggers.test.js
npx jest tests/spells.test.js
npx jest tests/keywords.test.js
```

### Rodar testes que correspondem a um padrão

```bash
npx jest --testNamePattern="Deathtouch"
npx jest --testNamePattern="Beast-Kin"
npx jest --testNamePattern="Flying"
```

---

## Estrutura dos Testes

```
mtg/
├── tests/
│   ├── helpers/
│   │   ├── gameFactory.js    # Funções para criar objetos de teste
│   │   └── rulesEngine.js    # Motor de regras simplificado para testes
│   ├── combat.test.js        # Testes de combate (dano, first strike, etc.)
│   ├── triggers.test.js      # Testes de triggers (ETB, fim de turno, etc.)
│   ├── spells.test.js        # Testes de feitiços e targeting
│   └── keywords.test.js      # Testes de keywords (flying, deathtouch, etc.)
└── package.json              # Configuração do projeto e Jest
```

---

## Categorias de Testes

### 1. Combat (`combat.test.js`)

Testa mecânicas de combate:
- Dano básico (3/3 vs 2/2)
- Trade (ambos morrem)
- Deathtouch (mata qualquer criatura)
- First Strike (causa dano antes)
- Double Strike
- Trample (dano excedente ao jogador)
- Lifelink
- Acúmulo de dano

### 2. Triggers (`triggers.test.js`)

Testa habilidades que disparam em eventos:
- Beast-Kin Ranger (+1/+0 quando outra criatura entra)
- Dwynen's Elite (cria token se controla outro Elfo)
- Vampire Spawn (drena 2 vida)
- Stromkirk Bloodthief (+1/+1 counter no fim do turno)
- Battle-Rattle Shaman (+2/+0 no início do combate)
- Cleanup de dano no fim do turno

### 3. Spells (`spells.test.js`)

Testa feitiços e seus efeitos:
- Elspeth's Smite (exila atacante/bloqueador)
- Volley (3 dano a criatura com flying)
- Moment of Triumph (+2/+2 e 2 vida)
- Kindled Fury (+1/+0 e first strike)
- Snakeskin Veil (+1/+1 counter)
- Parsing de custo de mana
- Disponibilidade de mana

### 4. Keywords (`keywords.test.js`)

Testa cada keyword individualmente:
- Flying / Reach
- Deathtouch
- First Strike / Double Strike
- Vigilance
- Haste
- Trample
- Lifelink
- Menace
- Can't Block
- Tap for Mana

---

## Exemplo de Saída

```
$ npm test

 PASS  tests/combat.test.js
  Combat Damage
    Basic Combat
      ✓ 3/3 vs 2/2 - both take damage, 2/2 dies (3 ms)
      ✓ 2/2 vs 2/2 - both die (trade) (1 ms)
      ✓ 1/4 vs 4/1 - both die
      ✓ 5/5 vs 2/2 - only blocker dies (1 ms)
    Deathtouch
      ✓ 1/1 deathtouch vs 10/10 - both die
      ✓ Thornweald Archer (1/2 reach deathtouch) kills any creature
      ✓ 0/1 deathtouch does not kill (0 damage) (1 ms)
    First Strike
      ✓ 2/2 first strike vs 2/2 - only blocker dies
      ...

 PASS  tests/triggers.test.js
 PASS  tests/spells.test.js
 PASS  tests/keywords.test.js

Test Suites: 4 passed, 4 total
Tests:       67 passed, 67 total
Snapshots:   0 total
Time:        1.234 s
```

---

## Adicionando Novos Testes

### 1. Para testar uma nova criatura

Adicione a criatura no `tests/helpers/gameFactory.js`:

```javascript
const CREATURES = {
    // ... criaturas existentes ...

    novaCreatura: () => createCreature({
        id: 'nova_criatura',
        name: 'Nova Criatura',
        subtype: 'Tipo Subtipo',
        power: 2,
        toughness: 3,
        keywords: ['flying', 'lifelink']
    }),
};
```

### 2. Para testar um novo efeito

Crie um novo `describe` no arquivo apropriado:

```javascript
describe('Nova Criatura - Efeito Especial', () => {
    test('descrição do comportamento esperado', () => {
        const criatura = CREATURES.novaCreatura();

        // Setup
        // ...

        // Ação
        // ...

        // Verificação
        expect(resultado).toBe(valorEsperado);
    });
});
```

### 3. Para testar um novo feitiço

Adicione no `tests/helpers/gameFactory.js`:

```javascript
const SPELLS = {
    // ... feitiços existentes ...

    novoFeitico: () => createSpell({
        id: 'novo_feitico',
        name: 'Novo Feitiço',
        type: 'instant',
        cost: '2R',
        cmc: 3,
        text: 'Descrição do efeito.'
    }),
};
```

---

## Dicas

1. **Execute os testes frequentemente** - Rode `npm test` após cada mudança significativa

2. **Use modo watch durante desenvolvimento** - `npm run test:watch` re-executa automaticamente

3. **Testes focados** - Use `test.only()` para rodar apenas um teste específico:
   ```javascript
   test.only('meu teste focado', () => { ... });
   ```

4. **Pular testes temporariamente** - Use `test.skip()`:
   ```javascript
   test.skip('teste a pular', () => { ... });
   ```

5. **Debug** - Adicione `console.log()` dentro dos testes para ver valores intermediários

---

## Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Offline** | Não precisa de internet |
| **Rápido** | Executa em segundos |
| **Automatizado** | Não precisa jogar manualmente |
| **Documentação** | Os testes documentam o comportamento esperado |
| **Regressão** | Detecta bugs introduzidos por mudanças |
| **Economia** | Não usa tokens de API |

---

## Troubleshooting

### Erro: "Cannot find module 'jest'"

```bash
npm install
```

### Erro: "node: command not found"

Instale o Node.js (veja seção Pré-requisitos)

### Testes falhando após mudanças

1. Verifique se a mudança no código está correta
2. Se a mudança é intencional, atualize o teste para refletir o novo comportamento

### Testes muito lentos

```bash
# Rodar apenas testes modificados
npm run test:watch

# Rodar arquivo específico
npx jest tests/combat.test.js
```

---

*Última atualização: Dezembro 2025*
