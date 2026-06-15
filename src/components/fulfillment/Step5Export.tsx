import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { Download, ExternalLink, Package, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Step5Export() {
  const { tblEnvioFull, tblEstoqueLocal } = useFulfillment();
  const { toast } = useToast();

  const itemsToSend = useMemo(() => {
    return tblEnvioFull.filter(row => row.enviarHoje > 0);
  }, [tblEnvioFull]);

  const totalUnits = useMemo(() => {
    return itemsToSend.reduce((sum, row) => sum + row.enviarHoje, 0);
  }, [itemsToSend]);

  // Items from tblEstoqueLocal for Tiny export
  const tinyItemsToSend = useMemo(() => {
    return tblEstoqueLocal.filter(row => row.enviarHoje > 0);
  }, [tblEstoqueLocal]);

  const generateExcel = () => {
    if (itemsToSend.length === 0) {
      toast({ 
        title: "Aviso", 
        description: "Nenhum item para enviar. Defina quantidades na etapa anterior.", 
        variant: "default" 
      });
      return;
    }

    // Create workbook with 2 sheets
    const workbook = XLSX.utils.book_new();

    // Sheet 1 - Empty (Planilha1)
    const ws1 = XLSX.utils.aoa_to_sheet([['']]);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Planilha1');

    // Sheet 2 - Layout ML
    // Headers start at row 5 (index 4), data starts at row 6 (index 5)
    const layoutData: any[][] = [];
    
    // Add empty rows (0-4)
    for (let i = 0; i < 5; i++) {
      layoutData.push(['', '', '', '', '', '']);
    }
    
    // Add header row (row 5 in Excel, index 4)
    layoutData[4] = ['SKU', '', '', 'Código MLB', '', 'Quantidade'];
    
    // Add data rows starting from row 6 (index 5)
    itemsToSend.forEach(item => {
      const codigoSemMLB = item.codigoAnuncio.replace(/^MLB/, '');
      layoutData.push([
        item.sku,           // Column A - SKU
        '',                 // Column B - empty
        '',                 // Column C - empty
        codigoSemMLB,       // Column D - Código sem MLB
        '',                 // Column E - empty
        item.enviarHoje     // Column F - Quantidade
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(layoutData);
    
    // Set column widths
    ws2['!cols'] = [
      { wch: 20 },  // A - SKU
      { wch: 10 },  // B
      { wch: 10 },  // C
      { wch: 15 },  // D - Código
      { wch: 10 },  // E
      { wch: 12 },  // F - Quantidade
    ];
    
    XLSX.utils.book_append_sheet(workbook, ws2, 'Layout ML');

    // Generate and download file
    const fileName = `envio_full_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ 
      title: "Excel Gerado!", 
      description: `Arquivo ${fileName} baixado com sucesso` 
    });
  };

  const openMercadoLivre = () => {
    window.open('https://myaccount.mercadolivre.com.br/shipping/import/excel/upload', '_blank');
  };

  const generateTinyExcel = () => {
    if (tinyItemsToSend.length === 0) {
      toast({ 
        title: "Aviso", 
        description: "Nenhum item para enviar. Defina quantidades na etapa anterior.", 
        variant: "default" 
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // Tiny layout headers (46 columns)
    const headers = [
      'ID', 'Número do pedido', 'Data', 'Data prevista', 'ID contato', 
      'Nome do contato*', 'Tipo de Pessoa', 'CPF/CNPJ', 'RG/IE', 'CEP', 
      'Município', 'UF', 'Endereço', 'Endereço Nro', 'Complemento', 
      'Bairro', 'Fone', 'Celular', 'e-mail', 'Desconto pedido (% ou valor)', 
      'Frete', 'Observações', 'Situação', 'ID produto', 'Descrição', 
      'Quantidade', 'Valor unitário', 'Desconto item %', 'Código de rastreamento', 
      'Número da ordem de compra', 'Vendedor', 'Despesas', 'Desconto do pedido rateado', 
      'Frete pedido rateado', 'Despesas pedido rateado', 'Destinatário', 
      'CPF/CNPJ entrega', 'CEP entrega', 'Município entrega', 'UF entrega', 
      'Endereço entrega', 'Endereço Nro entrega', 'Complemento entrega', 
      'Bairro entrega', 'Fone entrega', 'Código (SKU)'
    ];
    
    // Current date formatted as DD/MM/YYYY
    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    
    // Build data rows
    const data = tinyItemsToSend.map(item => {
      const row = new Array(46).fill('');
      row[2] = dataFormatada;             // Data (index 2)
      row[4] = '692604389';               // ID contato (index 4)
      row[5] = 'LAMDI IMPORTS LTDA';      // Nome do contato* (index 5)
      row[24] = item.sku;                 // Descrição (index 24)
      row[25] = item.enviarHoje;          // Quantidade (index 25)
      return row;
    });
    
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths for relevant columns
    ws['!cols'] = headers.map((_, i) => {
      if (i === 5) return { wch: 25 };   // Nome do contato
      if (i === 24) return { wch: 20 };  // Descrição
      if (i === 25) return { wch: 12 };  // Quantidade
      return { wch: 15 };
    });
    
    XLSX.utils.book_append_sheet(workbook, ws, 'Pedidos');
    
    const fileName = `pedido_tiny_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ 
      title: "Excel Tiny Gerado!", 
      description: `Arquivo ${fileName} baixado com sucesso` 
    });
  };

  const openTinyImportador = () => {
    window.open('https://erp.tiny.com.br/importador_pedidos_venda', '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload para Mercado Livre</h2>
        <p className="text-muted-foreground mt-1">
          Gere o arquivo Excel e faça o upload no Mercado Livre
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de SKUs</p>
                <p className="text-3xl font-bold text-primary">{itemsToSend.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Unidades</p>
                <p className="text-3xl font-bold text-success">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Itens a Enviar
          </CardTitle>
          <CardDescription>
            Prévia dos itens que serão incluídos no arquivo Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {itemsToSend.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum item para enviar</p>
              <p className="text-sm mt-1">
                Volte para a etapa anterior e defina as quantidades de envio
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Código MLB</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToSend.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.codigoAnuncio.replace(/^MLB/, '')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.enviarHoje}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Plano de Envio</CardTitle>
          <CardDescription>
            Baixe as planilhas e acesse as páginas de upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              onClick={() => {
                generateExcel();
                openMercadoLivre();
              }} 
              className="flex-1 bg-[#FFE600] hover:bg-[#FFE600]/90 text-black"
              disabled={itemsToSend.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar para Mercado Livre
            </Button>
            
            <Button 
              onClick={() => {
                generateTinyExcel();
                openTinyImportador();
              }} 
              className="flex-1 bg-[#3483FA] hover:bg-[#3483FA]/90 text-white"
              disabled={tinyItemsToSend.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar para Tiny ERP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Completion Message */}
      <Card className="bg-success/5 border-success/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <div>
              <h3 className="font-semibold text-lg">Plano de Envio Concluído!</h3>
              <p className="text-sm text-muted-foreground">
                Após fazer o upload no Mercado Livre, acompanhe o status do envio pelo painel do seller.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
