require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  console.log('🌱 Seeding portfolios and funding sources...\n');

  // Insert portfolios
  const portfolios = [
    { name: 'North End', code: 'NORTHEND', description: 'North End Portfolio', is_active: true },
    { name: 'South End', code: 'SOUTHEND', description: 'South End Portfolio', is_active: true },
    { name: 'Park Portfolio', code: 'PARK', description: 'Park Portfolio', is_active: true },
    { name: 'Hartford', code: 'HARTFORD', description: 'Hartford Portfolio', is_active: true }
  ];

  console.log('📁 Creating portfolios...');
  for (const portfolio of portfolios) {
    const { data, error } = await supabase
      .from('portfolios')
      .upsert(portfolio, { onConflict: 'code' })
      .select()
      .single();
    
    if (error) {
      console.log(`   ⚠️  ${portfolio.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${portfolio.name} (${portfolio.code})`);
    }
  }

  // Get all portfolios
  const { data: allPortfolios, error: fetchError } = await supabase
    .from('portfolios')
    .select('id, name, code');

  if (fetchError) {
    console.error('❌ Failed to fetch portfolios:', fetchError);
    return;
  }

  console.log('\n💰 Creating funding sources...');
  for (const portfolio of allPortfolios) {
    const fundingSource = {
      portfolio_id: portfolio.id,
      name: `Construction Loan - ${portfolio.name}`,
      type: 'loan',
      commitment_amount: 5000000,
      drawn_amount: 2500000,
      lender_name: 'First National Bank',
      interest_rate: 5.5,
      maturity_date: '2026-12-31'
    };

    const { error } = await supabase
      .from('funding_sources')
      .insert(fundingSource);

    if (error && error.code !== '23505') { // Ignore duplicate errors
      console.log(`   ⚠️  ${fundingSource.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${fundingSource.name}`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('🔄 Refresh the Cash Position page to see the data.');
}

seedData().catch(console.error);
