import * as XLSX from 'xlsx';
import { LinhaTblVendas, TblEstoqueFull, TblEstoqueLocal } from '@/types/fulfillment';

// Month name mapping for PT-BR date parsing
const monthMap: Record<string, number> = {
  "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4, "maio": 5, "junho": 6,
  "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
};

// Parse PT-BR date format "DD de mês de AAAA"
function parseDataVenda(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  const m = s.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/);
  if (!m) return null;

  const dia = parseInt(m[1], 10);
  const mesNome = m[2];
  const ano = parseInt(m[3], 10);
  const mes = monthMap[mesNome];
  if (!mes) return null;

  const d = new Date(ano, mes - 1, dia);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 10);
}

// Parse PT-BR number format (1.000,00 -> 1000.00)
function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).trim();
  return Number(str.replace(/\./g, "").replace(",", "."));
}

// Normalize header for comparison (remove accents, lowercase, trim)
function normalizeHeader(name: any): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ============= SALES FILE PROCESSING =============
export async function processSalesFile(file: File): Promise<LinhaTblVendas[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  
  // Find header row dynamically (search in first 50 rows)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    if (!rows[i]) continue;
    const rowStr = rows[i].map((c: any) => String(c).toLowerCase().trim()).join(" ");
    if (rowStr.includes("data da venda") && rowStr.includes("# de anúncio")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error("Não foi possível encontrar o cabeçalho do relatório de vendas (procurando por 'Data da venda' e '# de anúncio'). Verifique se o arquivo está no formato correto.");
  }

  const headers = rows[headerIdx].map((h: any) => String(h).trim().toLowerCase());
  const dataRows = rows.slice(headerIdx + 1);

  // Helper to find column index by partial match
  const getColIndex = (namePart: string) => headers.findIndex(h => h.includes(namePart.toLowerCase()));

  const idxDataVenda = getColIndex("data da venda");
  const idxAnuncio = getColIndex("# de anúncio");
  const idxSku = getColIndex("sku");
  const idxUnidades = getColIndex("unidades");
  const idxPreco = getColIndex("preço unitário");

  if (idxDataVenda === -1 || idxAnuncio === -1) {
    throw new Error("Colunas obrigatórias 'Data da venda' ou '# de anúncio' não encontradas.");
  }

  return dataRows.map((row) => {
    if (!row || row.length === 0) return null;

    const rawDataVenda = row[idxDataVenda];
    const rawAnuncio = row[idxAnuncio];
    const rawSku = idxSku !== -1 ? row[idxSku] : "";
    const rawUnidades = idxUnidades !== -1 ? row[idxUnidades] : 0;
    const rawPreco = idxPreco !== -1 ? row[idxPreco] : 0;

    const dataVenda = parseDataVenda(String(rawDataVenda || ""));
    const codigoAnuncio = (rawAnuncio !== undefined && rawAnuncio !== null) ? String(rawAnuncio).trim() : "";
    const sku = (rawSku !== undefined && rawSku !== null) ? String(rawSku).trim() : "";

    const unidades = parseNumber(rawUnidades);
    const precoUnitario = parseNumber(rawPreco);

    // Discard rows where essential data is missing or invalid
    if (!dataVenda || !codigoAnuncio || isNaN(unidades) || isNaN(precoUnitario)) {
      return null;
    }

    const totalVenda = unidades * precoUnitario;

    return {
      dataVenda,
      codigoAnuncio,
      sku,
      unidades,
      precoUnitario,
      totalVenda,
    };
  }).filter((x): x is LinhaTblVendas => x !== null);
}

// ============= FULL STOCK FILE PROCESSING =============
export async function processFullStockFile(file: File): Promise<TblEstoqueFull[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Must read from "Resumo" sheet
  const sheetName = "Resumo";
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Aba "${sheetName}" não encontrada no arquivo.`);
  }
  const worksheet = workbook.Sheets[sheetName];
  
  const allRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  // Find header row containing "Unidades que ocupam espaço no Full" (PT) or "Unidades que ocupan espacio en Full" (ES)
  let headerRowIdx = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row) continue;
    const rowStr = normalizeHeader(row.map((cell: any) => String(cell)).join(" | "));
    if (rowStr.includes("unidades que ocupam espaco no full") || rowStr.includes("unidades que ocupan espacio en full")) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("Cabeçalho 'Unidades que ocupam espaço no Full' não encontrado.");
  }

  const headers = allRows[headerRowIdx];
  // Data starts 3 rows after header
  const dataRows = allRows.slice(headerRowIdx + 3);

  // Find columns
  const findColIndex = (target: string) => {
    const targetNorm = target.toLowerCase().trim();
    return headers.findIndex((h: any) => {
      if (typeof h !== 'string') return false;
      return h.toLowerCase().trim().includes(targetNorm);
    });
  };

  const idxAnuncio = findColIndex("# Anúncio") !== -1 ? findColIndex("# Anúncio") : findColIndex("Anúncio");
  const idxEstoqueFull = findColIndex("Unidades que ocupam espaço no Full") !== -1
    ? findColIndex("Unidades que ocupam espaço no Full")
    : findColIndex("Unidades que ocupan espacio en Full");
  const idxSku = findColIndex("SKU");

  if (idxEstoqueFull === -1) throw new Error("Coluna 'Unidades que ocupam espaço no Full' não encontrada.");
  if (idxAnuncio === -1 || idxSku === -1) {
    throw new Error("Colunas obrigatórias (# Anúncio, SKU) não encontradas.");
  }

  const result: TblEstoqueFull[] = [];

  for (const row of dataRows) {
    const rawAnuncio = row[idxAnuncio];
    
    // Filter valid rows
    if (rawAnuncio === undefined || rawAnuncio === null || rawAnuncio === '') continue;

    // Transform Anuncio: "MLB" + cleaned code
    let s = String(rawAnuncio);
    if (s.includes('|')) {
      s = s.split('|')[0];
    }
    s = s.trim();
    if (s.includes('.')) {
      s = s.split('.')[0];
    }
    const codigoAnuncio = "MLB" + s;

    // Transform SKU
    const rawSku = row[idxSku];
    const sku = rawSku ? String(rawSku).trim() : "";

    // Transform Estoque
    const rawEstoque = row[idxEstoqueFull];
    let estoqueFull = 0;
    if (typeof rawEstoque === 'number') {
      estoqueFull = rawEstoque;
    } else if (typeof rawEstoque === 'string') {
      const cleaned = rawEstoque.replace(/\./g, "").replace(",", ".");
      const val = Number(cleaned);
      if (!isNaN(val)) estoqueFull = val;
    }

    result.push({
      codigoAnuncio,
      sku,
      estoqueFull
    });
  }

  return result;
}

// ============= GENERAL/LOCAL STOCK FILE PROCESSING =============
export async function processGeneralStockFile(file: File): Promise<TblEstoqueLocal[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  if (!rows.length) return [];

  const headers = rows[0];

  const findColumnIndex = (target: string): number => {
    const targetNorm = normalizeHeader(target);
    return headers.findIndex((h: any) => normalizeHeader(h).includes(targetNorm));
  };

  const idxSku = findColumnIndex("codigo (sku)");
  const idxTotal = findColumnIndex("total");

  if (idxSku === -1 || idxTotal === -1) {
    throw new Error("Não foi possível localizar as colunas 'Código (SKU)' ou 'Total' no relatório.");
  }

  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const rawSku = row[idxSku];
    const rawTotal = row[idxTotal];

    if (!rawSku) return null;

    const sku = String(rawSku).trim();

    // Handle number formatting
    let estoqueLocal = 0;
    if (typeof rawTotal === 'number') {
      estoqueLocal = rawTotal;
    } else {
      const val = Number(String(rawTotal ?? "0").replace(/\./g, "").replace(",", "."));
      estoqueLocal = isNaN(val) ? 0 : val;
    }

    return {
      sku,
      estoqueLocal,
      enviarHoje: 0,
      estoqueRestante: estoqueLocal,
    };
  }).filter((x): x is TblEstoqueLocal => x !== null);
}
