import React, { useState } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, X, Building, FileText, DollarSign, Users, Bell } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Construction Ops',
      description: 'Get started with your construction management dashboard',
      icon: <Building className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Welcome to Construction Ops Stanton
            </h3>
            <p className="text-muted-foreground">
              Your comprehensive construction management platform designed for field workers and project managers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h4 className="font-medium text-primary mb-2">For Field Workers</h4>
              <ul className="text-sm text-primary space-y-1">
                <li>• Simple mobile-friendly interface</li>
                <li>• Quick payment submissions</li>
                <li>• Photo documentation</li>
                <li>• SMS notifications</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">For Project Managers</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Project overview dashboard</li>
                <li>• Payment approval workflow</li>
                <li>• Contractor management</li>
                <li>• Real-time notifications</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'projects',
      title: 'Project Management',
      description: 'View and manage your construction projects',
      icon: <Building className="w-8 h-8 text-green-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Project Overview</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">View all active projects</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Track project progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Monitor budgets and timelines</span>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-medium text-primary mb-2">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <button className="bg-primary text-white px-3 py-2 rounded text-xs">
                Create Payment App
              </button>
              <button className="bg-gray-600 text-white px-3 py-2 rounded text-xs">
                View Details
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'payments',
      title: 'Payment Applications',
      description: 'Submit and track payment applications',
      icon: <DollarSign className="w-8 h-8 text-yellow-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Payment Workflow</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <span className="text-sm text-muted-foreground">Select project and contractor</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-yellow-600">2</span>
                </div>
                <span className="text-sm text-muted-foreground">Submit progress via SMS</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-green-600">3</span>
                </div>
                <span className="text-sm text-muted-foreground">Upload photos for verification</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-600">4</span>
                </div>
                <span className="text-sm text-muted-foreground">PM reviews and approves</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notifications & Alerts',
      description: 'Stay updated with real-time notifications',
      icon: <Bell className="w-8 h-8 text-red-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Notification Types</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Payment approvals/rejections</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Contractor submissions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Project updates</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">System alerts</span>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Mobile Notifications</h4>
            <p className="text-sm text-yellow-800">
              Receive SMS notifications for critical updates when you&apos;re in the field.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start managing your construction projects',
      icon: <CheckCircle className="w-8 h-8 text-green-600" />,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900">
            Welcome to Construction Ops!
          </h3>
          
          <p className="text-muted-foreground">
            You&apos;re now ready to manage your construction projects efficiently. 
            The interface is designed to be simple and mobile-friendly for field workers.
          </p>
          
          <div className="bg-primary/10 p-4 rounded-lg mt-6">
            <h4 className="font-medium text-primary mb-2">Need Help?</h4>
            <p className="text-sm text-primary">
              • Use the help icon (?) in the top right for quick tips<br/>
              • Contact support for technical issues<br/>
              • Check the mobile app for field workers
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {currentStepData.icon}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentStepData.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentStepData.description}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-primary h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>•</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
