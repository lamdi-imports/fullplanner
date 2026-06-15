// Types for the Fulfillment Planning App

// Raw sales data from the ML report (before aggregation)
export interface LinhaTblVendas {
  dataVenda: string;
  codigoAnuncio: string;
  sku: string;
  unidades: number;
  precoUnitario: number;
  totalVenda: number;
}

// Aggregated sales data
export interface TblVendas {
  sku: string;
  codigoAnuncio: string;
  vendas60d: number;
  faturamento60d: number;
  desvioPadrao: number;
}

export interface TblEstoqueFull {
  sku: string;
  codigoAnuncio: string;
  estoqueFull: number;
}

export interface TblEstoqueLocal {
  sku: string;
  estoqueLocal: number;
  enviarHoje: number;
  estoqueRestante: number;
}

export interface TblComposicaoKits {
  skuKit: string;
  skuComponente: string;
  quantidade: number;
}

export interface TblAnuncios {
  codigoAnuncio: string;
  sku: string;
  qtdCaixaMaster: number;
  codigoCatalogo: string;
}

export interface TblEnvioFull {
  codigoAnuncio: string;
  sku: string;
  vendas60d: number;
  vendasQuinzenas: [number, number, number, number];
  mediaPonderadaDiaria: number;
  faturamento60d: number;
  desvioPadrao: number;
  estoqueFull: number;
  estoqueLocal: number;
  projecaoVendasPreReposicao: number;
  projecaoVendasPosReposicao: number;
  curvaABC: string;
  estoqueSeg: number;
  estoqueIdeal: number;
  enviarHoje: number;
  estoqueRestante: number;
}

export interface FulfillmentParams {
  leadtime: number;
  frequenciaEnvio: number;
  arredondarCaixaMaster: boolean;
}

export interface UploadStatus {
  vendas: boolean;
  estoqueFull: boolean;
  estoqueLocal: boolean;
  composicaoKits: boolean;
  anuncios: boolean;
}

export interface AppState {
  step: number;
  uploadStatus: UploadStatus;
  tblVendas: LinhaTblVendas[];
  tblEstoqueFull: TblEstoqueFull[];
  tblEstoqueLocal: TblEstoqueLocal[];
  tblComposicaoKits: TblComposicaoKits[];
  tblAnuncios: TblAnuncios[];
  selectedAnuncios: Set<string>;
  params: FulfillmentParams;
  tblEnvioFull: TblEnvioFull[];
}
