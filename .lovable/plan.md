## Plano: Média ponderada diária com pesos por quinzena

### Escopo
Implementar a média ponderada diária baseada nas 4 quinzenas (pesos 10%/20%/30%/40%) e usá-la apenas nas projeções de vendas. **NÃO** alterar `atribuirCurvaABC` nem `estoqueSeg` — esses continuam usando a lógica atual.

### Alterações

#### 1. `src/types/fulfillment.ts`
Adicionar ao tipo `TblEnvioFull`:
```ts
mediaPonderadaDiaria: number;
```

#### 2. `src/contexts/FulfillmentContext.tsx` — `generateEnvioFull`
Após calcular `vendasQuinzenas = [Q1, Q2, Q3, Q4]`:

```ts
const mediaPonderadaDiaria =
  (Q1 / 15) * 0.10 +
  (Q2 / 15) * 0.20 +
  (Q3 / 15) * 0.30 +
  (Q4 / 15) * 0.40;
```

Substituir nas projeções (somente nelas):
- `projecaoVendasPreReposicao = mediaPonderadaDiaria * leadtime`
- `projecaoVendasPosReposicao = mediaPonderadaDiaria * frequenciaEnvio` (ou conforme fórmula atual, trocando `vendas60d/60` por `mediaPonderadaDiaria`)

Manter inalterados:
- `atribuirCurvaABC` (continua com base em `vendas60d`/faturamento)
- `estoqueSeg` (continua com fórmula atual usando desvio padrão e média simples)

Salvar `mediaPonderadaDiaria` no objeto retornado.

#### 3. `src/components/fulfillment/Step4PlanoEnvio.tsx`
Adicionar nova coluna **"Média Ponderada"** (un/dia) imediatamente à direita de "Vendas 60d":
- Header: `<TableHead className="bg-muted text-center w-[10%] whitespace-nowrap">Média Ponderada</TableHead>`
- Cell: exibir `row.mediaPonderadaDiaria.toFixed(2)` un/dia
- Reajustar larguras das demais colunas para acomodar (reduzir levemente Código Anúncio/SKU).

### Resumo

| Arquivo | Mudança |
|---|---|
| `types/fulfillment.ts` | +campo `mediaPonderadaDiaria` |
| `contexts/FulfillmentContext.tsx` | Calcular média ponderada; usar nas projeções (pré e pós reposição) |
| `components/fulfillment/Step4PlanoEnvio.tsx` | Nova coluna exibindo a média ponderada |

`atribuirCurvaABC` e `estoqueSeg` permanecem sem alteração.