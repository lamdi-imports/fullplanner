import { Button } from '@/components/ui/button';
import { StepIndicator } from './StepIndicator';
import { Step1Upload } from './Step1Upload';
import { Step2Params } from './Step2Params';
import { Step3Anuncios } from './Step3Anuncios';
import { Step4PlanoEnvio } from './Step4PlanoEnvio';
import { Step5Export } from './Step5Export';
import { useFulfillment } from '@/contexts/FulfillmentContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STEP_LABELS = [
  'Upload',
  'Parâmetros',
  'Anúncios',
  'Plano de Envio',
  'Export'
];

export function FulfillmentWizard() {
  const { step, setStep, uploadStatus, selectedAnuncios, generateEnvioFull } = useFulfillment();

  const canProceed = () => {
    switch (step) {
      case 1:
        // At least one file uploaded for demo purposes
        return uploadStatus.vendas || uploadStatus.estoqueFull || uploadStatus.estoqueLocal;
      case 2:
        return true;
      case 3:
        return selectedAnuncios.size > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 3) {
      generateEnvioFull();
    }
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Upload />;
      case 2:
        return <Step2Params />;
      case 3:
        return <Step3Anuncios />;
      case 4:
        return <Step4PlanoEnvio />;
      case 5:
        return <Step5Export />;
      default:
        return <Step1Upload />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-ml-yellow border-b border-ml-yellow/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ml-blue flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Planejador de Envio FULL</h1>
                <p className="text-sm text-foreground/70">Mercado Livre Fulfillment</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4">
          <StepIndicator 
            currentStep={step} 
            totalSteps={5} 
            stepLabels={STEP_LABELS}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {renderStep()}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>

            <span className="text-sm text-muted-foreground">
              Etapa {step} de 5
            </span>

            <Button
              onClick={handleNext}
              disabled={step === 5 || !canProceed()}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {step === 5 ? 'Concluído' : 'Próximo'}
              {step < 5 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </footer>

      {/* Spacer for fixed footer */}
      <div className="h-20" />
    </div>
  );
}
