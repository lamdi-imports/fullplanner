import { FulfillmentProvider } from '@/contexts/FulfillmentContext';
import { FulfillmentWizard } from '@/components/fulfillment/FulfillmentWizard';

const Index = () => {
  return (
    <FulfillmentProvider>
      <FulfillmentWizard />
    </FulfillmentProvider>
  );
};

export default Index;
