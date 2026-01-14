'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PortfolioFormProps {
  initialData?: {
    name?: string;
    code?: string;
    description?: string;
    is_active?: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PortfolioForm({ initialData, onSubmit, onCancel, isSubmitting }: PortfolioFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      code: code || undefined,
      description: description || undefined,
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Portfolio Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SREP Southend"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Short Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SREP-SE"
              maxLength={20}
            />
            <p className="text-xs text-gray-500">
              Auto-generated from name if left blank
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this portfolio"
              rows={3}
            />
          </div>

          {initialData && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal">
                Portfolio is active
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Portfolio'}
        </Button>
      </div>
    </form>
  );
}
