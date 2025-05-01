
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Subscribe: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubscribe = () => {
    navigate('/login');
  };

  const plans = [
    {
      title: "ContentVault Basic",
      price: "Free",
      features: [
        "Store and manage your digital content",
        "Access to basic features",
        "Web and mobile access"
      ],
      highlighted: false,
      buttonText: "Get Started"
    },
    {
      title: "ContentVault Pro",
      price: "Login to Access",
      features: [
        "Everything in Basic",
        "Advanced content management",
        "Premium support",
        "No ads or watermarks"
      ],
      highlighted: true,
      buttonText: "Choose Plan"
    }
  ];

  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-white to-gray-100">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the plan that best fits your needs. All plans include our core features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden ${
                plan.highlighted 
                  ? 'border-primary shadow-lg' 
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  RECOMMENDED
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleSubscribe}
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {plan.buttonText}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            All plans include a secure content management system and reliable hosting.
            <br />
            Need a custom plan? <span className="text-primary cursor-pointer">Contact us</span> for enterprise options.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
