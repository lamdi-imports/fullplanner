import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { Package, TrendingUp, TrendingDown, Calculator, Plus, Minus, Wand2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Step4PlanoEnvio() {
  const { 
    tblEnvioFull, 
    updateEnviarHoje, 
    generateEnvioFull,
    selectedAnuncios,
    params,
    autoAjusteEnvio
  } = useFulfillment();

  useEffect(() => {
    if (selectedAnuncios.size > 0 && tblEnvioFull.length === 0) {
      generateEnvioFull();
    }
  }, [selectedAnuncios, tblEnvioFull.length, generateEnvioFull]);

  const handleEnviarHojeChange = (codigoAnuncio: string, sku: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    updateEnviarHoje(codigoAnuncio, sku, numValue);
  };

  const incrementEnviarHoje = (codigoAnuncio: string, sku: string, currentValue: number) => {
    updateEnviarHoje(codigoAnuncio, sku, currentValue + 1);
  };

  const decrementEnviarHoje = (codigoAnuncio: string, sku: string, currentValue: number) => {
    if (currentValue > 0) {
      updateEnviarHoje(codigoAnuncio, sku, currentValue - 1);
    }
  };

  const totalEnviar = tblEnvioFull.reduce((sum, row) => sum + row.enviarHoje, 0);
  const skusComEnvio = tblEnvioFull.filter(row => row.enviarHoje > 0).length;
  const skusComEstoqueNegativo = tblEnvioFull.filter(row => row.estoqueRestante < 0).length;

  const handleAutoAjuste = () => {
    const qtdAjustados = autoAjusteEnvio();
    toast.success("Auto ajuste concluído!", {
      description: `${qtdAjustados} anúncios foram ajustados.`
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Plano de Envio</h2>
          <p className="text-muted-foreground mt-1">
            Revise e ajuste as quantidades a enviar para o fulfillment
          </p>
        </div>
        {tblEnvioFull.length > 0 && (
          <Button 
            onClick={handleAutoAjuste} 
            variant={skusComEstoqueNegativo > 0 ? "destructive" : "outline"}
            className="gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Auto Ajuste
            {skusComEstoqueNegativo > 0 && (
              <span className="ml-1 bg-background/20 px-1.5 py-0.5 rounded text-xs">
                {skusComEstoqueNegativo} negativos
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de SKUs</p>
                <p className="text-2xl font-bold">{tblEnvioFull.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">SKUs com Envio</p>
                <p className="text-2xl font-bold">{skusComEnvio}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Unidades a Enviar</p>
                <p className="text-2xl font-bold">{totalEnviar}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20">
          <CardContent className="pt-6">
            <div className="text-sm">
              <p className="text-muted-foreground">Parâmetros:</p>
              <p>Leadtime: <span className="font-semibold">{params.leadtime}d</span></p>
              <p>Frequência: <span className="font-semibold">{params.frequenciaEnvio}d</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>tbl_enviofull</CardTitle>
          <CardDescription>
            Edite a coluna "Enviar Hoje" para definir as quantidades de envio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tblEnvioFull.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum anúncio selecionado</p>
              <p className="text-sm mt-1">
                Volte para a etapa anterior e selecione os anúncios
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <table className="w-full caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-muted">
                      <TableHead className="bg-muted text-center w-[4%]">#</TableHead>
                      <TableHead className="bg-muted text-center w-[12%]">Código Anúncio</TableHead>
                      <TableHead className="bg-muted text-center w-[10%]">SKU</TableHead>
                      <TableHead className="bg-muted text-center w-[7%]">Curva ABC</TableHead>
                      <TableHead className="bg-muted text-center w-[12%] whitespace-nowrap">Vendas 60d</TableHead>
                      <TableHead className="bg-muted text-center w-[9%] whitespace-nowrap">Média Pond.</TableHead>
                      <TableHead className="bg-muted text-center w-[8%]">Estoque Local</TableHead>
                      <TableHead className="bg-muted text-center w-[8%]">Estoque Full</TableHead>
                      <TableHead className="bg-muted text-center w-[8%]">Est. Ideal</TableHead>
                      <TableHead className="bg-secondary text-center font-bold w-[14%]">Enviar Hoje</TableHead>
                      <TableHead className="bg-muted text-center w-[8%]">Est. Restante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tblEnvioFull.map((row, index) => (
                      <TableRow key={`${row.codigoAnuncio}::${row.sku}`}>
                        <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{row.codigoAnuncio}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{row.sku}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            row.curvaABC === 'A' ? 'bg-green-100 text-green-800' :
                            row.curvaABC === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.curvaABC}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const [q1, q2, q3, q4] = row.vendasQuinzenas;
                            const firstHalf = q1 + q2;
                            const secondHalf = q3 + q4;
                            const isUp = firstHalf > 0 && secondHalf > firstHalf * 1.2;
                            const isDown = firstHalf > 0 && secondHalf < firstHalf * 0.8;
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{row.vendas60d}</span>
                                  {isUp && <TrendingUp className="w-4 h-4 text-green-600" />}
                                  {isDown && <TrendingDown className="w-4 h-4 text-destructive" />}
                                  {!isUp && !isDown && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {q1} | {q2} | {q3} | {q4}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center font-medium whitespace-nowrap">
                          {row.mediaPonderadaDiaria.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">{row.estoqueLocal}</TableCell>
                        <TableCell className="text-center">{row.estoqueFull}</TableCell>
                        <TableCell className="text-center">{row.estoqueIdeal}</TableCell>
                        <TableCell className="bg-secondary/10">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => decrementEnviarHoje(row.codigoAnuncio, row.sku, row.enviarHoje)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={row.enviarHoje}
                              onChange={(e) => handleEnviarHojeChange(row.codigoAnuncio, row.sku, e.target.value)}
                              className="w-16 text-center"
                              min={0}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => incrementEnviarHoje(row.codigoAnuncio, row.sku, row.enviarHoje)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className={`text-center font-medium ${row.estoqueRestante < 0 ? 'text-destructive' : ''}`}>
                          {row.estoqueRestante}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
