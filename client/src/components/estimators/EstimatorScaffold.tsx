import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
  onNext?: () => void;
  onReset?: () => void;
  children?: React.ReactNode;
  showFooter?: boolean;
  nextLabel?: string;
  backLabel?: string;
}

export const EstimatorScaffold: React.FC<Props> = ({
  title,
  description,
  step,
  totalSteps,
  onBack,
  onNext,
  onReset,
  children,
  showFooter = true,
  nextLabel = "Next",
  backLabel = "Back",
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        {title && <h2 className="text-3xl font-bold tracking-tight">{title}</h2>}
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
        {step && totalSteps && (
          <p className="text-sm text-muted-foreground mt-2">
            Step {step} of {totalSteps}
          </p>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6 min-h-96">
          {children}

          {showFooter && (
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={onBack} disabled={!onBack}>
                {backLabel}
              </Button>
              <div className="flex gap-2">
                {onReset && (
                  <Button variant="ghost" onClick={onReset}>
                    Reset
                  </Button>
                )}
                <Button onClick={onNext} disabled={!onNext}>
                  {nextLabel}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimatorScaffold;
