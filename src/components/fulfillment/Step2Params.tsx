import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { Clock, Calendar, Package } from 'lucide-react';

export function Step2Params() {
  const { params, setParams } = useFulfillment();

  const updateLeadtime = (value: number) => {
    setParams({ ...params, leadtime: value });
  };

  const updateFrequencia = (value: number) => {
    setParams({ ...params, frequenciaEnvio: value });
  };

  const updateArredondar = (value: boolean) => {
    setParams({ ...params, arredondarCaixaMaster: value });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Parâmetros de Envio</h2>
        <p className="text-muted-foreground mt-1">
          Configure os parâmetros para o cálculo do plano de envio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leadtime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              Leadtime
            </CardTitle>
            <CardDescription>
              Tempo em dias entre o envio e a disponibilização no fulfillment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                value={[params.leadtime]}
                onValueChange={(value) => updateLeadtime(value[0])}
                min={1}
                max={30}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={params.leadtime}
                  onChange={(e) => updateLeadtime(Number(e.target.value))}
                  className="w-20 text-center"
                  min={1}
                  max={30}
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Valor padrão: 6 dias
            </p>
          </CardContent>
        </Card>

        {/* Frequência de Envio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Frequência de Envio
            </CardTitle>
            <CardDescription>
              Intervalo em dias entre cada envio para o fulfillment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                value={[params.frequenciaEnvio]}
                onValueChange={(value) => updateFrequencia(value[0])}
                min={1}
                max={60}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={params.frequenciaEnvio}
                  onChange={(e) => updateFrequencia(Number(e.target.value))}
                  className="w-20 text-center"
                  min={1}
                  max={60}
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Valor padrão: 14 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Arredondar para Caixa Master */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-primary" />
            Opções Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="caixa-master"
              checked={params.arredondarCaixaMaster}
              onCheckedChange={(checked) => updateArredondar(checked as boolean)}
            />
            <Label htmlFor="caixa-master" className="cursor-pointer">
              Arredondar quantidade para caixa Master
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ml-7">
            Quando ativado, as quantidades serão arredondadas para múltiplos da caixa master
          </p>
        </CardContent>
      </Card>

      {/* Resumo dos parâmetros */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border">
              <p className="text-sm text-muted-foreground">Leadtime</p>
              <p className="text-2xl font-bold text-primary">{params.leadtime} dias</p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <p className="text-sm text-muted-foreground">Frequência</p>
              <p className="text-2xl font-bold text-primary">{params.frequenciaEnvio} dias</p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <p className="text-sm text-muted-foreground">Caixa Master</p>
              <p className="text-2xl font-bold text-primary">
                {params.arredondarCaixaMaster ? 'Sim' : 'Não'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
