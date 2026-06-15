import { TblComposicaoKits, TblAnuncios } from '@/types/fulfillment';

const COMPOSICAO_KITS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBEvMqpme8V8PuQdKm5xG7C3wroNjsTqHou3oXgBYl-SEolwxAvZQfw2CJvtIdLRvX20DbUdMRGiI9/pub?gid=0&single=true&output=csv";
const ANUNCIOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBEvMqpme8V8PuQdKm5xG7C3wroNjsTqHou3oXgBYl-SEolwxAvZQfw2CJvtIdLRvX20DbUdMRGiI9/pub?gid=557575458&single=true&output=csv";

// Parse CSV text into array of objects
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    return row;
  });
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Fetch and parse tbl_composicaokits
export async function fetchComposicaoKits(): Promise<TblComposicaoKits[]> {
  const response = await fetch(COMPOSICAO_KITS_URL);
  if (!response.ok) {
    throw new Error(`Erro ao carregar tbl_composicaokits: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  
  return rows.map(row => ({
    skuKit: row['SKU kit'] || '',
    skuComponente: row['SKU simples'] || '',
    quantidade: Number(row['Qtd SKU simples'] || 0),
  })).filter(item => item.skuKit && item.skuComponente);
}

// Fetch and parse tbl_anuncios
export async function fetchAnuncios(): Promise<TblAnuncios[]> {
  const response = await fetch(ANUNCIOS_URL);
  if (!response.ok) {
    throw new Error(`Erro ao carregar tbl_anuncios: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  
  return rows.map(row => ({
    codigoAnuncio: row['Código anúncio'] || '',
    sku: row['SKU'] || '',
    qtdCaixaMaster: Number(row['Qtd caixa master'] || 0),
    codigoCatalogo: row['Código catálogo'] || '',
  })).filter(item => item.codigoAnuncio && item.sku);
}

// Fetch both tables at once
export async function fetchGoogleSheetsData(): Promise<{
  composicaoKits: TblComposicaoKits[];
  anuncios: TblAnuncios[];
}> {
  const [composicaoKits, anuncios] = await Promise.all([
    fetchComposicaoKits(),
    fetchAnuncios(),
  ]);
  
  return { composicaoKits, anuncios };
}
