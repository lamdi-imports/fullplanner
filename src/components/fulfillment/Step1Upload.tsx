import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileUploadZone } from './FileUploadZone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { Download, Database, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processSalesFile, processFullStockFile, processGeneralStockFile } from '@/lib/fileProcessing';
import { fetchGoogleSheetsData } from '@/lib/googleSheetsImport';

export function Step1Upload() {
  const { 
    uploadStatus, 
    updateUploadStatus,
    setTblVendas,
    setTblEstoqueFull,
    setTblEstoqueLocal,
    setTblComposicaoKits,
    setTblAnuncios,
    tblVendas,
    tblEstoqueFull,
    tblEstoqueLocal,
    tblComposicaoKits,
    tblAnuncios,
  } = useFulfillment();
  const { toast } = useToast();
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Auto-load Google Sheets data on mount
  useEffect(() => {
    if (!uploadStatus.composicaoKits || !uploadStatus.anuncios) {
      loadGoogleSheets();
    }
  }, []);

  const handleVendasUpload = async (file: File) => {
    try {
      const vendas = await processSalesFile(file);
      setTblVendas(vendas);
      updateUploadStatus({ vendas: true });
      toast({ 
        title: "Sucesso", 
        description: `${vendas.length} registros de vendas importados` 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao processar arquivo de vendas";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const handleEstoqueFullUpload = async (file: File) => {
    try {
      const estoqueFull = await processFullStockFile(file);
      setTblEstoqueFull(estoqueFull);
      updateUploadStatus({ estoqueFull: true });
      toast({ 
        title: "Sucesso", 
        description: `${estoqueFull.length} registros de estoque FULL importados` 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao processar arquivo de estoque FULL";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const handleEstoqueLocalUpload = async (file: File) => {
    try {
      const estoqueLocalRaw = await processGeneralStockFile(file);
      
      // Criar set de SKUs que são kits para filtrar
      const skusKit = new Set(tblComposicaoKits.map(kit => kit.skuKit));
      
      // Filtrar apenas SKUs simples (que NÃO são kits)
      const estoqueLocal = estoqueLocalRaw.filter(item => !skusKit.has(item.sku));
      
      setTblEstoqueLocal(estoqueLocal);
      updateUploadStatus({ estoqueLocal: true });
      
      const kitsRemovidos = estoqueLocalRaw.length - estoqueLocal.length;
      
      if (tblComposicaoKits.length === 0) {
        toast({ 
          title: "Aviso", 
          description: `${estoqueLocal.length} registros importados. Carregue o Google Sheets primeiro para filtrar kits.`,
          variant: "default"
        });
      } else {
        toast({ 
          title: "Sucesso", 
          description: `${estoqueLocal.length} SKUs simples importados (${kitsRemovidos} kits removidos)` 
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao processar arquivo de estoque local";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const loadGoogleSheets = async () => {
    setIsLoadingSheets(true);
    try {
      const { composicaoKits, anuncios } = await fetchGoogleSheetsData();
      
      setTblComposicaoKits(composicaoKits);
      setTblAnuncios(anuncios);
      updateUploadStatus({ composicaoKits: true, anuncios: true });
      
      toast({ 
        title: "Google Sheets", 
        description: `Carregados: ${composicaoKits.length} kits e ${anuncios.length} anúncios`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar dados do Google Sheets";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const downloadTable = (tableName: string, data: any[]) => {
    if (data.length === 0) {
      toast({ title: "Aviso", description: "Nenhum dado para exportar", variant: "default" });
      return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
    XLSX.writeFile(workbook, `${tableName}.xlsx`);
    toast({ title: "Download", description: `${tableName}.xlsx baixado com sucesso` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload de Relatórios</h2>
        <p className="text-muted-foreground mt-1">
          Faça upload dos relatórios do Mercado Livre e conecte suas tabelas do Google Sheets
        </p>
      </div>

      {/* Excel Uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Relatórios Excel do Mercado Livre
          </CardTitle>
          <CardDescription>
            Faça o upload dos 3 relatórios exportados do Mercado Livre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUploadZone
              title="Vendas 60 dias"
              description="Relatório de vendas dos últimos 60 dias"
              isUploaded={uploadStatus.vendas}
              onFileSelect={handleVendasUpload}
            />
            <FileUploadZone
              title="Estoque FULL"
              description="Relatório de estoque no fulfillment (aba Resumo)"
              isUploaded={uploadStatus.estoqueFull}
              onFileSelect={handleEstoqueFullUpload}
            />
            <FileUploadZone
              title="Estoque Geral"
              description="Relatório de estoque local/geral"
              isUploaded={uploadStatus.estoqueLocal}
              onFileSelect={handleEstoqueLocalUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Tabelas do Google Sheets
          </CardTitle>
          <CardDescription>
            Importação automática de tbl_composicaokits e tbl_anuncios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={loadGoogleSheets} 
                disabled={isLoadingSheets}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoadingSheets ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Recarregar Google Sheets"
                )}
              </Button>
              
              <div className="flex items-center gap-2 text-sm">
                {uploadStatus.composicaoKits && uploadStatus.anuncios ? (
                  <span className="text-success flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {tblComposicaoKits.length} kits, {tblAnuncios.length} anúncios
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Aguardando carregamento
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download processed tables */}
      <Card>
        <CardHeader>
          <CardTitle>Download das Tabelas Processadas</CardTitle>
          <CardDescription>
            Baixe as tabelas processadas para conferência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={() => downloadTable('tbl_vendas', tblVendas)}
              disabled={!uploadStatus.vendas}
            >
              <Download className="w-4 h-4 mr-2" />
              tbl_vendas ({tblVendas.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadTable('tbl_estoquefull', tblEstoqueFull)}
              disabled={!uploadStatus.estoqueFull}
            >
              <Download className="w-4 h-4 mr-2" />
              tbl_estoquefull ({tblEstoqueFull.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadTable('tbl_estoquelocal', tblEstoqueLocal)}
              disabled={!uploadStatus.estoqueLocal}
            >
              <Download className="w-4 h-4 mr-2" />
              tbl_estoquelocal ({tblEstoqueLocal.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadTable('tbl_composicaokits', tblComposicaoKits)}
              disabled={!uploadStatus.composicaoKits}
            >
              <Download className="w-4 h-4 mr-2" />
              tbl_composicaokits ({tblComposicaoKits.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={() => downloadTable('tbl_anuncios', tblAnuncios)}
              disabled={!uploadStatus.anuncios}
            >
              <Download className="w-4 h-4 mr-2" />
              tbl_anuncios ({tblAnuncios.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
