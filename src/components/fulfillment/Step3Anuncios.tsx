import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { CheckSquare, Square, ListChecks } from 'lucide-react';

export function Step3Anuncios() {
  const { 
    tblAnuncios, 
    selectedAnuncios, 
    toggleAnuncio, 
    selectAllAnuncios, 
    deselectAllAnuncios 
  } = useFulfillment();

  const allSelected = useMemo(() => {
    return tblAnuncios.length > 0 && selectedAnuncios.size === tblAnuncios.length;
  }, [tblAnuncios, selectedAnuncios]);

  const someSelected = useMemo(() => {
    return selectedAnuncios.size > 0 && selectedAnuncios.size < tblAnuncios.length;
  }, [tblAnuncios, selectedAnuncios]);

  const handleSelectAll = () => {
    if (allSelected) {
      deselectAllAnuncios();
    } else {
      selectAllAnuncios();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Escolha dos Anúncios</h2>
        <p className="text-muted-foreground mt-1">
          Selecione os anúncios que deseja incluir no plano de envio
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Anúncios Disponíveis
              </CardTitle>
              <CardDescription className="mt-1">
                {selectedAnuncios.size} de {tblAnuncios.length} anúncios selecionados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllAnuncios}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Selecionar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={deselectAllAnuncios}
              >
                <Square className="w-4 h-4 mr-2" />
                Desmarcar Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tblAnuncios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum anúncio carregado</p>
              <p className="text-sm mt-1">
                Conecte o Google Sheets ou faça upload de um arquivo com os anúncios
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-muted">
                      <TableHead className="w-12 bg-muted">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos"
                          className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                      </TableHead>
                      <TableHead className="bg-muted">Código Anúncio</TableHead>
                      <TableHead className="bg-muted">SKU</TableHead>
                      <TableHead className="bg-muted">Qtd Caixa Master</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tblAnuncios.map((anuncio) => {
                      const key = `${anuncio.codigoAnuncio}::${anuncio.sku}`;
                      return (
                        <TableRow 
                          key={key}
                          className={selectedAnuncios.has(key) ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedAnuncios.has(key)}
                              onCheckedChange={() => toggleAnuncio(anuncio.codigoAnuncio, anuncio.sku)}
                              aria-label={`Selecionar ${anuncio.codigoAnuncio} - ${anuncio.sku}`}
                            />
                          </TableCell>
                        <TableCell className="font-mono text-sm">
                          {anuncio.codigoAnuncio}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {anuncio.sku}
                        </TableCell>
                        <TableCell className="text-center">
                          {anuncio.qtdCaixaMaster}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Summary */}
      <Card className="bg-secondary/20 border-secondary">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Anúncios Selecionados</p>
                <p className="text-sm text-muted-foreground">
                  Estes anúncios serão incluídos no plano de envio
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{selectedAnuncios.size}</p>
              <p className="text-sm text-muted-foreground">de {tblAnuncios.length} anúncios</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
