import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  AppState, 
  LinhaTblVendas,
  TblEstoqueFull, 
  TblEstoqueLocal, 
  TblComposicaoKits, 
  TblAnuncios,
  TblEnvioFull,
  FulfillmentParams,
  UploadStatus 
} from '@/types/fulfillment';

interface FulfillmentContextType extends AppState {
  setStep: (step: number) => void;
  setTblVendas: (data: LinhaTblVendas[]) => void;
  setTblEstoqueFull: (data: TblEstoqueFull[]) => void;
  setTblEstoqueLocal: (data: TblEstoqueLocal[]) => void;
  setTblComposicaoKits: (data: TblComposicaoKits[]) => void;
  setTblAnuncios: (data: TblAnuncios[]) => void;
  setSelectedAnuncios: (selected: Set<string>) => void;
  toggleAnuncio: (codigoAnuncio: string, sku: string) => void;
  selectAllAnuncios: () => void;
  deselectAllAnuncios: () => void;
  setParams: (params: FulfillmentParams) => void;
  setTblEnvioFull: (data: TblEnvioFull[]) => void;
  updateEnviarHoje: (codigoAnuncio: string, sku: string, value: number) => void;
  updateUploadStatus: (status: Partial<UploadStatus>) => void;
  generateEnvioFull: () => void;
  autoAjusteEnvio: () => number;
}

const defaultParams: FulfillmentParams = {
  leadtime: 6,
  frequenciaEnvio: 14,
  arredondarCaixaMaster: false,
};

const defaultUploadStatus: UploadStatus = {
  vendas: false,
  estoqueFull: false,
  estoqueLocal: false,
  composicaoKits: false,
  anuncios: false,
};

const FulfillmentContext = createContext<FulfillmentContextType | undefined>(undefined);

export function FulfillmentProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(defaultUploadStatus);
  const [tblVendas, setTblVendas] = useState<LinhaTblVendas[]>([]);
  const [tblEstoqueFull, setTblEstoqueFull] = useState<TblEstoqueFull[]>([]);
  const [tblEstoqueLocal, setTblEstoqueLocal] = useState<TblEstoqueLocal[]>([]);
  const [tblComposicaoKits, setTblComposicaoKits] = useState<TblComposicaoKits[]>([]);
  const [tblAnuncios, setTblAnuncios] = useState<TblAnuncios[]>([]);
  const [selectedAnuncios, setSelectedAnuncios] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<FulfillmentParams>(defaultParams);
  const [tblEnvioFull, setTblEnvioFull] = useState<TblEnvioFull[]>([]);

  const updateUploadStatus = (status: Partial<UploadStatus>) => {
    setUploadStatus(prev => ({ ...prev, ...status }));
  };

  const getAnuncioKey = (codigoAnuncio: string, sku: string): string => {
    return `${codigoAnuncio}::${sku}`;
  };

  const toggleAnuncio = (codigoAnuncio: string, sku: string) => {
    const key = getAnuncioKey(codigoAnuncio, sku);
    setSelectedAnuncios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAllAnuncios = () => {
    setSelectedAnuncios(new Set(tblAnuncios.map(a => getAnuncioKey(a.codigoAnuncio, a.sku))));
  };

  const deselectAllAnuncios = () => {
    setSelectedAnuncios(new Set());
  };

  // Função para calcular o total de "Enviar hoje" de um SKU simples
  // Considera tanto envios diretos quanto envios como componente de kits
  const calcularEnviarHojeSKU = (skuSimples: string, envioFullData: TblEnvioFull[]): number => {
    let totalEnviar = 0;
    
    // 1. Soma das linhas da tbl_enviofull onde o SKU é vendido diretamente
    envioFullData
      .filter(row => row.sku === skuSimples)
      .forEach(row => {
        totalEnviar += row.enviarHoje;
      });
    
    // 2. Soma das linhas onde o SKU é componente de um kit
    // Encontrar todos os kits que contêm este SKU simples
    const kitsComEsteSKU = tblComposicaoKits.filter(
      kit => kit.skuComponente === skuSimples
    );
    
    // Para cada kit, encontrar o enviarHoje na tbl_enviofull e multiplicar pela quantidade
    kitsComEsteSKU.forEach(kit => {
      const linhasDoKit = envioFullData.filter(row => row.sku === kit.skuKit);
      linhasDoKit.forEach(linha => {
        totalEnviar += linha.enviarHoje * kit.quantidade;
      });
    });
    
    return totalEnviar;
  };

  // Função para calcular o estoque restante de um SKU (simples ou kit)
  // baseado nos estoques restantes da tbl_estoquelocal atualizada
  const calcularEstoqueRestante = (sku: string, estoqueLocalAtualizado: TblEstoqueLocal[]): number => {
    // Verificar se o SKU é um kit
    const componentesKit = tblComposicaoKits.filter(kit => kit.skuKit === sku);
    
    if (componentesKit.length === 0) {
      // SKU Simples - buscar estoqueRestante da tbl_estoquelocal
      const estoque = estoqueLocalAtualizado.find(e => e.sku === sku);
      return estoque?.estoqueRestante ?? 0;
    }
    
    // SKU Kit - calcular quantos kits ainda podem ser montados
    const kitsPossiveis = componentesKit.map(componente => {
      const estoqueComponente = estoqueLocalAtualizado.find(e => e.sku === componente.skuComponente);
      const qtdRestante = estoqueComponente?.estoqueRestante ?? 0;
      return Math.floor(qtdRestante / componente.quantidade);
    });
    
    return kitsPossiveis.length > 0 ? Math.min(...kitsPossiveis) : 0;
  };

  // Função para atualizar tbl_estoquelocal e tbl_enviofull com estoques restantes
  const atualizarEstoquesRestantes = (envioFullData: TblEnvioFull[]) => {
    // 1. Calcular enviarHoje e estoqueRestante para cada SKU simples na tbl_estoquelocal
    const estoqueLocalAtualizado = tblEstoqueLocal.map(row => {
      const enviarHoje = calcularEnviarHojeSKU(row.sku, envioFullData);
      const estoqueRestante = row.estoqueLocal - enviarHoje;
      return {
        ...row,
        enviarHoje,
        estoqueRestante
      };
    });
    
    // 2. Atualizar estoqueRestante de cada linha da tbl_enviofull
    const envioFullAtualizado = envioFullData.map(row => ({
      ...row,
      estoqueRestante: calcularEstoqueRestante(row.sku, estoqueLocalAtualizado)
    }));
    
    // 3. Atualizar estados
    setTblEstoqueLocal(estoqueLocalAtualizado);
    setTblEnvioFull(envioFullAtualizado);
  };

  // Função auxiliar para recalcular estoque local com base em um array de envioFull
  const recalcularEstoqueLocal = (envioFullData: TblEnvioFull[]): TblEstoqueLocal[] => {
    return tblEstoqueLocal.map(row => {
      const enviarHoje = calcularEnviarHojeSKU(row.sku, envioFullData);
      const estoqueRestante = row.estoqueLocal - enviarHoje;
      return {
        ...row,
        enviarHoje,
        estoqueRestante
      };
    });
  };

  // Função de Auto Ajuste - 2 fases: correção de negativos e otimização
  const autoAjusteEnvio = (): number => {
    const maxIteracoes = 100;
    let iteracoes = 0;
    let updatedEnvioFull = [...tblEnvioFull];
    const anunciosModificados = new Set<string>();
    
    // ============== FASE 1: Correção de Estoques Negativos ==============
    while (iteracoes < maxIteracoes) {
      iteracoes++;
      
      // 1. Recalcular estoque local atual
      const estoqueLocalAtual = recalcularEstoqueLocal(updatedEnvioFull);
      
      // 2. Filtrar SKUs com estoque negativo (ordenar do mais negativo)
      const skusNegativos = estoqueLocalAtual
        .filter(row => row.estoqueRestante < 0)
        .sort((a, b) => a.estoqueRestante - b.estoqueRestante);
      
      // 3. Se não há negativos, encerra a Fase 1
      if (skusNegativos.length === 0) break;
      
      // 4. Processar cada SKU negativo
      for (const estoqueRow of skusNegativos) {
        const sku = estoqueRow.sku;
        let estoqueRestante = estoqueRow.estoqueRestante;
        
        // 5. Encontrar anúncios que contêm este SKU (direto ou via kit)
        const anunciosAfetados = updatedEnvioFull
          .map((envio, index) => {
            if (envio.enviarHoje <= 0) return null;
            
            // Verificar se o anúncio contém o SKU
            const isKit = tblComposicaoKits.some(k => k.skuKit === envio.sku);
            let contem = false;
            
            if (isKit) {
              contem = tblComposicaoKits.some(
                k => k.skuKit === envio.sku && k.skuComponente === sku
              );
            } else {
              contem = envio.sku === sku;
            }
            
            if (contem) {
              return {
                index,
                envio,
                vendas60d: envio.vendas60d,
                enviarHoje: envio.enviarHoje,
              };
            }
            return null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
        
        if (anunciosAfetados.length === 0) continue;
        
        // 6. Distribuir redução proporcionalmente às vendas
        for (const item of anunciosAfetados) {
          if (estoqueRestante >= 0) break;
          
          // Recalcular soma de vendas dos anúncios que ainda têm envio
          let soma_temp = 0;
          for (const item2 of anunciosAfetados) {
            if (updatedEnvioFull[item2.index].enviarHoje > 0) {
              soma_temp += item2.vendas60d;
            }
          }
          
          let ajuste: number;
          if (soma_temp === 0) {
            // Se não há vendas, distribui igualmente
            ajuste = Math.max(
              Math.ceil(estoqueRestante / anunciosAfetados.length),
              -updatedEnvioFull[item.index].enviarHoje
            );
          } else {
            // Proporcional às vendas
            ajuste = Math.max(
              Math.round(estoqueRestante * (item.vendas60d / soma_temp)),
              -updatedEnvioFull[item.index].enviarHoje
            );
          }
          
          // 7. Aplicar ajuste (ajuste é negativo)
          const enviarAtual = updatedEnvioFull[item.index].enviarHoje;
          const novoEnviar = Math.max(0, enviarAtual + ajuste);
          
          updatedEnvioFull[item.index] = {
            ...updatedEnvioFull[item.index],
            enviarHoje: novoEnviar,
          };
          
          // 8. Marcar anúncio como modificado
          const key = `${updatedEnvioFull[item.index].codigoAnuncio}::${updatedEnvioFull[item.index].sku}`;
          anunciosModificados.add(key);
          
          // 9. Atualizar estoque restante para próximo cálculo
          // Considerar que ajuste em kit libera (ajuste * qtdComponente) do SKU simples
          const skuDoItem = updatedEnvioFull[item.index].sku;
          const composicaoKit = tblComposicaoKits.find(
            k => k.skuKit === skuDoItem && k.skuComponente === sku
          );
          if (composicaoKit) {
            // É um kit - multiplicar pela quantidade do componente
            estoqueRestante -= ajuste * composicaoKit.quantidade;
          } else {
            // SKU simples
            estoqueRestante -= ajuste;
          }
        }
      }
    }
    
    // ============== FASE 2: Otimização de Estoques Positivos ==============
    for (const anuncioKey of anunciosModificados) {
      const [codigoAnuncio, sku] = anuncioKey.split('::');
      
      const index = updatedEnvioFull.findIndex(
        e => e.codigoAnuncio === codigoAnuncio && e.sku === sku
      );
      if (index === -1) continue;
      
      const envio = updatedEnvioFull[index];
      const enviarAtual = envio.enviarHoje;
      
      // Recalcular estoque local
      const estoqueLocalAtual = recalcularEstoqueLocal(updatedEnvioFull);
      
      // Verificar se é kit
      const isKit = tblComposicaoKits.some(k => k.skuKit === sku);
      
      let estoqueDisponivelMinimo: number;
      
      if (isKit) {
        // Para kits: pegar mínimo entre componentes
        const skusDoKit = tblComposicaoKits.filter(k => k.skuKit === sku);
        
        const possiveisPorComponente = skusDoKit.map(kit => {
          const estoqueItem = estoqueLocalAtual.find(e => e.sku === kit.skuComponente);
          const estoqueRestanteComp = estoqueItem?.estoqueRestante ?? 0;
          return Math.floor(estoqueRestanteComp / kit.quantidade);
        });
        
        estoqueDisponivelMinimo = possiveisPorComponente.length > 0 
          ? Math.min(...possiveisPorComponente) 
          : 0;
      } else {
        // Para SKU simples: pegar direto
        const estoqueItem = estoqueLocalAtual.find(e => e.sku === sku);
        estoqueDisponivelMinimo = estoqueItem?.estoqueRestante ?? 0;
      }
      
      // Se há estoque disponível, aumentar envio (sem arredondamento de caixa master)
      if (estoqueDisponivelMinimo > 0) {
        const novoEnviar = enviarAtual + estoqueDisponivelMinimo;
        
        updatedEnvioFull[index] = {
          ...updatedEnvioFull[index],
          enviarHoje: novoEnviar,
        };
      }
    }
    
    // ============== Recálculo Final ==============
    atualizarEstoquesRestantes(updatedEnvioFull);
    
    return anunciosModificados.size;
  };

  const updateEnviarHoje = (codigoAnuncio: string, sku: string, value: number) => {
    // 1. Atualizar enviarHoje na linha específica
    const novoEnvioFull = tblEnvioFull.map(row => {
      if (row.codigoAnuncio === codigoAnuncio && row.sku === sku) {
        return { ...row, enviarHoje: value };
      }
      return row;
    });
    
    // 2. Recalcular todos os estoques restantes
    atualizarEstoquesRestantes(novoEnvioFull);
  };

  // Função para calcular o período dos últimos 60 dias baseado na data mais recente
  const calcularPeriodo60Dias = (): { dataInicio: string; dataFim: string } | null => {
    if (tblVendas.length === 0) return null;
    
    // Encontrar a data mais recente no arquivo
    const datas = tblVendas
      .map(v => v.dataVenda)
      .filter(d => d !== null && d !== '')
      .sort();
    
    if (datas.length === 0) return null;
    
    const dataFim = datas[datas.length - 1]; // Data mais recente
    const dataFimDate = new Date(dataFim);
    
    // Calcular data 60 dias atrás (59 dias antes + dia atual = 60 dias)
    const dataInicioDate = new Date(dataFimDate);
    dataInicioDate.setDate(dataInicioDate.getDate() - 59);
    const dataInicio = dataInicioDate.toISOString().slice(0, 10);
    
    return { dataInicio, dataFim };
  };

  // Função para filtrar vendas dos últimos 60 dias
  const filtrarVendas60Dias = (vendas: LinhaTblVendas[]): LinhaTblVendas[] => {
    const periodo = calcularPeriodo60Dias();
    if (!periodo) return vendas;
    
    return vendas.filter(v => 
      v.dataVenda >= periodo.dataInicio && v.dataVenda <= periodo.dataFim
    );
  };

  // Função auxiliar para calcular desvio padrão
  const calcularDesvioPadrao = (valores: number[]): number => {
    const n = valores.length;
    if (n === 0) return 0;
    const media = valores.reduce((a, b) => a + b, 0) / n;
    const somaQuadrados = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
    return Math.sqrt(somaQuadrados / n);
  };

  // Função para calcular vendas diárias (60 data points em ordem cronológica)
  const calcularVendasDiarias = (codigoAnuncio: string, sku: string, codigoCatalogo?: string): number[] => {
    const periodo = calcularPeriodo60Dias();
    if (!periodo) return Array(60).fill(0);
    
    // Filtrar vendas para este anúncio (e catálogo vinculado, se houver) nos últimos 60 dias
    const codigosAnuncio = [codigoAnuncio];
    if (codigoCatalogo) codigosAnuncio.push(codigoCatalogo);
    
    const vendasFiltradas = tblVendas.filter(
      v => codigosAnuncio.includes(v.codigoAnuncio) && 
           v.sku === sku &&
           v.dataVenda >= periodo.dataInicio && 
           v.dataVenda <= periodo.dataFim
    );
    
    // Agrupar por data e somar unidades
    const vendasPorDia = new Map<string, number>();
    vendasFiltradas.forEach(v => {
      const atual = vendasPorDia.get(v.dataVenda) || 0;
      vendasPorDia.set(v.dataVenda, atual + v.unidades);
    });
    
    // Gerar array com todos os 60 dias em ordem cronológica
    const valores: number[] = [];
    const dataInicio = new Date(periodo.dataInicio);
    
    for (let i = 0; i < 60; i++) {
      const data = new Date(dataInicio);
      data.setDate(data.getDate() + i);
      const dataStr = data.toISOString().slice(0, 10);
      valores.push(vendasPorDia.get(dataStr) || 0);
    }
    
    return valores;
  };

  // Função para obter qtddesvpad baseado na Curva ABC
  const getQtdDesvPad = (curvaABC: string): number => {
    if (curvaABC === 'A') return 2.5;
    if (curvaABC === 'B') return 2.0;
    return 1.5; // Curva C
  };

  // Função para atribuir Curva ABC preservando ordem original
  const atribuirCurvaABC = (envioData: TblEnvioFull[]): TblEnvioFull[] => {
    if (envioData.length === 0) return envioData;
    
    // Criar array com índice e faturamento para ordenar
    const indexed = envioData.map((item, index) => ({ 
      index, 
      faturamento: item.faturamento60d,
      key: getAnuncioKey(item.codigoAnuncio, item.sku)
    }));
    
    // Ordenar por faturamento descendente
    const sorted = [...indexed].sort((a, b) => b.faturamento - a.faturamento);
    
    // Criar mapa de classificação ABC
    const curvaMap = new Map<string, string>();
    const total = sorted.length;
    sorted.forEach((item, rank) => {
      const percentil = (rank + 1) / total;
      let curva = 'C';
      if (percentil <= 0.2) curva = 'A';
      else if (percentil <= 0.5) curva = 'B';
      curvaMap.set(item.key, curva);
    });
    
    // Retornar dados na ordem original com curva atribuída e cálculos de estoque
    return envioData.map(item => {
      const curvaABC = curvaMap.get(getAnuncioKey(item.codigoAnuncio, item.sku)) || 'C';
      
      // Calcular Estoque Segurança
      const periodo = params.leadtime + params.frequenciaEnvio;
      const qtddesvpad = getQtdDesvPad(curvaABC);
      const estoqueSeg = qtddesvpad * (item.desvioPadrao / Math.sqrt(periodo)) * periodo;
      
      // Calcular Estoque Ideal
      const estoqueIdeal = Math.ceil(
        item.projecaoVendasPreReposicao + 
        item.projecaoVendasPosReposicao + 
        estoqueSeg
      );
      
      // Calcular Enviar Hoje (valor inicial sugerido)
      let enviarHoje = Math.max(0, estoqueIdeal - item.estoqueFull);
      
      // Arredondar para caixa master se condições forem atendidas
      if (params.arredondarCaixaMaster) {
        // Buscar qtdCaixaMaster da tbl_anuncios para este código+sku
        const anuncio = tblAnuncios.find(
          a => a.codigoAnuncio === item.codigoAnuncio && a.sku === item.sku
        );
        const qtdCaixaMaster = anuncio?.qtdCaixaMaster ?? 0;
        
        // Só arredondar se vendas60d > qtdCaixaMaster E qtdCaixaMaster > 0
        if (qtdCaixaMaster > 0 && item.vendas60d > qtdCaixaMaster) {
          // Arredondar para o múltiplo mais próximo
          enviarHoje = Math.round(enviarHoje / qtdCaixaMaster) * qtdCaixaMaster;
        }
      }
      
      return {
        ...item,
        curvaABC,
        estoqueSeg: Math.round(estoqueSeg * 100) / 100,
        estoqueIdeal,
        enviarHoje,
        estoqueRestante: item.estoqueLocal - enviarHoje
      };
    });
  };

  // Função para calcular Estoque Local (SKU simples ou kit)
  const calcularEstoqueLocal = (sku: string): number => {
    // Verificar se o SKU é um kit (existe na coluna skuKit da tbl_composicaokits)
    const componentesKit = tblComposicaoKits.filter(kit => kit.skuKit === sku);
    
    if (componentesKit.length === 0) {
      // É um SKU Simples - buscar direto na tbl_estoquelocal
      const estoqueSimples = tblEstoqueLocal.find(e => e.sku === sku);
      return estoqueSimples?.estoqueLocal ?? 0;
    }
    
    // É um SKU Kit - calcular quantos kits é possível montar
    const kitsPossiveis = componentesKit.map(componente => {
      // Buscar estoque do componente (SKU simples)
      const estoqueComponente = tblEstoqueLocal.find(e => e.sku === componente.skuComponente);
      const qtdDisponivel = estoqueComponente?.estoqueLocal ?? 0;
      
      // Calcular quantos kits este componente permite montar
      return Math.floor(qtdDisponivel / componente.quantidade);
    });
    
    // Retornar o mínimo (gargalo) - se não houver componentes, retorna 0
    return kitsPossiveis.length > 0 ? Math.min(...kitsPossiveis) : 0;
  };

  const generateEnvioFull = () => {
    // Filtrar vendas para os últimos 60 dias
    const vendasFiltradas = filtrarVendas60Dias(tblVendas);
    
    // Gerar tbl_enviofull baseado nos anúncios selecionados
    const envioData: TblEnvioFull[] = tblAnuncios
      .filter(anuncio => selectedAnuncios.has(`${anuncio.codigoAnuncio}::${anuncio.sku}`))
      .map(anuncio => {
        // Identificar códigos de anúncio (padrão + catálogo vinculado)
        const codigosAnuncio = [anuncio.codigoAnuncio];
        if (anuncio.codigoCatalogo) codigosAnuncio.push(anuncio.codigoCatalogo);
        
        // Filtrar vendas por codigoAnuncio (e catálogo) e sku (já filtradas para 60 dias)
        const vendasAnuncio = vendasFiltradas.filter(
          v => codigosAnuncio.includes(v.codigoAnuncio) && v.sku === anuncio.sku
        );
        
        // 1. Vendas 60d - soma das unidades (inclui catálogo)
        const vendas60d = vendasAnuncio.reduce((sum, v) => sum + v.unidades, 0);
        
        // 2. Faturamento 60d - soma do total de vendas (inclui catálogo)
        const faturamento60d = vendasAnuncio.reduce((sum, v) => sum + v.totalVenda, 0);
        
        // 3. Desvio Padrão - das vendas diárias (inclui catálogo)
        const vendasDiarias = calcularVendasDiarias(anuncio.codigoAnuncio, anuncio.sku, anuncio.codigoCatalogo);
        const desvioPadrao = calcularDesvioPadrao(vendasDiarias);
        
        // Calcular vendas por quinzena (4 períodos de 15 dias)
        const vendasQuinzenas: [number, number, number, number] = [
          vendasDiarias.slice(0, 15).reduce((a, b) => a + b, 0),
          vendasDiarias.slice(15, 30).reduce((a, b) => a + b, 0),
          vendasDiarias.slice(30, 45).reduce((a, b) => a + b, 0),
          vendasDiarias.slice(45, 60).reduce((a, b) => a + b, 0),
        ];
        
        // Média ponderada diária - pesos crescentes para quinzenas mais recentes
        const [q1, q2, q3, q4] = vendasQuinzenas;
        const mediaPonderadaDiaria =
          (q1 / 15) * 0.10 +
          (q2 / 15) * 0.20 +
          (q3 / 15) * 0.30 +
          (q4 / 15) * 0.40;
        
        // 4. Estoque Full - buscar por codigoAnuncio e sku
        const estFull = tblEstoqueFull.find(
          e => e.codigoAnuncio === anuncio.codigoAnuncio && e.sku === anuncio.sku
        );
        const estoqueFull = estFull?.estoqueFull ?? 0;
        
        // 5. Estoque Local - calcular baseado em SKU simples ou kit
        const estoqueLocal = calcularEstoqueLocal(anuncio.sku);
        
        // 6. Projeção Pré-Reposição - MIN(mediaPonderadaDiaria × Leadtime, EstoqueFull)
        const projecaoVendasPreReposicao = Math.min(
          mediaPonderadaDiaria * params.leadtime,
          estoqueFull
        );
        
        // 7. Projeção Pós-Reposição - mediaPonderadaDiaria × FrequenciaEnvio
        const projecaoVendasPosReposicao = mediaPonderadaDiaria * params.frequenciaEnvio;

        return {
          codigoAnuncio: anuncio.codigoAnuncio,
          sku: anuncio.sku,
          vendas60d,
          vendasQuinzenas,
          mediaPonderadaDiaria: Math.round(mediaPonderadaDiaria * 100) / 100,
          faturamento60d,
          desvioPadrao: Math.round(desvioPadrao * 100) / 100,
          estoqueFull,
          estoqueLocal,
          projecaoVendasPreReposicao: Math.round(projecaoVendasPreReposicao * 100) / 100,
          projecaoVendasPosReposicao: Math.round(projecaoVendasPosReposicao * 100) / 100,
          curvaABC: '',
          estoqueSeg: 0,
          estoqueIdeal: 0,
          enviarHoje: 0,
          estoqueRestante: estoqueLocal,
        };
      });

    // Atribuir Curva ABC preservando ordem original
    const envioDataComCurva = atribuirCurvaABC(envioData);
    
    // Atualizar estoques restantes (tbl_estoquelocal e tbl_enviofull)
    atualizarEstoquesRestantes(envioDataComCurva);
  };

  return (
    <FulfillmentContext.Provider value={{
      step,
      setStep,
      uploadStatus,
      updateUploadStatus,
      tblVendas,
      setTblVendas,
      tblEstoqueFull,
      setTblEstoqueFull,
      tblEstoqueLocal,
      setTblEstoqueLocal,
      tblComposicaoKits,
      setTblComposicaoKits,
      tblAnuncios,
      setTblAnuncios,
      selectedAnuncios,
      setSelectedAnuncios,
      toggleAnuncio,
      selectAllAnuncios,
      deselectAllAnuncios,
      params,
      setParams,
      tblEnvioFull,
      setTblEnvioFull,
      updateEnviarHoje,
      generateEnvioFull,
      autoAjusteEnvio,
    }}>
      {children}
    </FulfillmentContext.Provider>
  );
}

export function useFulfillment() {
  const context = useContext(FulfillmentContext);
  if (context === undefined) {
    throw new Error('useFulfillment must be used within a FulfillmentProvider');
  }
  return context;
}
