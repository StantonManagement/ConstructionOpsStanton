'use client';

import React, { memo } from 'react';
import LazyProjectCard from '../optimized/LazyProjectCard';
import LazyContractorCard from '../optimized/LazyContractorCard';
import LazyContractCard from '../optimized/LazyContractCard';

// Example usage of lazy loading cards
const LazyLoadingExample = memo(() => {
  // Mock data
  const sampleProject = {
    id: 1,
    name: 'Downtown Office Complex',
    client_name: 'ABC Corporation',
    current_phase: 'Foundation',
    budget: 2500000,
    spent: 750000,
    start_date: '2024-01-15',
    status: 'active',
    daysToInspection: 30,
    atRisk: false,
    permits: { building: 'approved', electrical: 'pending' }
  };

  const sampleContractor = {
    id: 1,
    name: 'Elite Construction Co.',
    trade: 'General Contractor',
    contractAmount: 1500000,
    paidToDate: 500000,
    lastPayment: '2024-09-15',
    status: 'active',
    changeOrdersPending: false,
    lineItemCount: 25,
    phone: '+1-555-0123',
    email: 'contact@eliteconstruction.com',
    hasOpenPaymentApp: true,
    compliance: {
      insurance: 'valid',
      license: 'valid'
    }
  };

  const sampleContract = {
    id: 1,
    project_id: 1,
    subcontractor_id: 1,
    contract_amount: 1500000,
    contract_nickname: 'Main Construction Contract',
    start_date: '2024-01-15',
    end_date: '2024-12-15',
    status: 'active',
    project: sampleProject,
    subcontractor: sampleContractor
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Lazy Loading Cards Examples
      </h1>

      {/* Project Cards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Project Cards (Lazy Loaded)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Simulate multiple cards - only visible ones will load */}
          {Array.from({ length: 12 }, (_, index) => (
            <LazyProjectCard
              key={index}
              project={{
                ...sampleProject,
                id: index + 1,
                name: `${sampleProject.name} ${index + 1}`,
                budget: sampleProject.budget + (index * 100000),
                spent: sampleProject.spent + (index * 25000),
              }}
              onClick={(project) => console.log('Project clicked:', project.name)}
              onView={(project) => console.log('Project viewed:', project.name)}
            />
          ))}
        </div>
      </section>

      {/* Contractor Cards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Contractor Cards (Lazy Loaded)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }, (_, index) => (
            <LazyContractorCard
              key={index}
              contractor={{
                ...sampleContractor,
                id: index + 1,
                name: `${sampleContractor.name} ${index + 1}`,
                trade: ['General Contractor', 'Electrical', 'Plumbing', 'HVAC', 'Roofing'][index % 5],
                contractAmount: sampleContractor.contractAmount + (index * 50000),
                paidToDate: sampleContractor.paidToDate + (index * 15000),
              }}
              onSendSMS={(contractor) => console.log('SMS sent to:', contractor.name)}
              onEdit={(contractor) => console.log('Edit contractor:', contractor.name)}
            />
          ))}
        </div>
      </section>

      {/* Contract Cards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Contract Cards (Lazy Loaded)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 8 }, (_, index) => (
            <LazyContractCard
              key={index}
              contract={{
                ...sampleContract,
                id: index + 1,
                contract_nickname: `Contract ${index + 1}`,
                contract_amount: sampleContract.contract_amount + (index * 75000),
                status: ['active', 'completed', 'suspended'][index % 3],
              }}
              onClick={(contract) => console.log('Contract clicked:', contract.contract_nickname)}
              onEdit={(contract) => console.log('Edit contract:', contract.contract_nickname)}
            />
          ))}
        </div>
      </section>

      {/* Performance Info */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-3">
          Performance Benefits
        </h2>
        <ul className="space-y-2 text-blue-800">
          <li>✅ <strong>Only visible cards are rendered</strong> - Cards 100px outside viewport start loading</li>
          <li>✅ <strong>Smooth animations</strong> - Cards fade in as they load</li>
          <li>✅ <strong>Memory efficient</strong> - Intersection observers are reused and optimized</li>
          <li>✅ <strong>SEO friendly</strong> - Content loads progressively without blocking</li>
          <li>✅ <strong>Network optimized</strong> - Data fetching happens only when needed</li>
          <li>✅ <strong>Skeleton placeholders</strong> - Users see immediate visual feedback</li>
        </ul>
      </section>

      {/* Usage Examples */}
      <section className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          How to Use
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Replace existing cards:</h3>
            <div className="bg-white rounded border p-4">
              <code className="text-sm">
                {`// OLD
<ProjectCard project={project} onClick={handleClick} />

// NEW
<LazyProjectCard project={project} onClick={handleClick} />`}
              </code>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">In lists:</h3>
            <div className="bg-white rounded border p-4">
              <code className="text-sm">
                {`{projects.map(project => (
  <LazyProjectCard
    key={project.id}
    project={project}
    onClick={handleClick}
  />
))}`}
              </code>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});

LazyLoadingExample.displayName = 'LazyLoadingExample';

export default LazyLoadingExample;