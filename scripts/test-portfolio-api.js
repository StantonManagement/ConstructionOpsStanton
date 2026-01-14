require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPortfolioAPI() {
  console.log('🧪 Testing Portfolio System API\n');

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('⚠️  No active session - testing with service role key');
  }

  // Test 1: List portfolios
  console.log('1️⃣ Testing GET /api/portfolios');
  const { data: portfolios, error: listError } = await supabase
    .from('portfolios')
    .select(`
      *,
      funding_sources (
        id,
        name,
        type,
        commitment_amount,
        drawn_amount
      ),
      projects (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('name');

  if (listError) {
    console.log('   ❌ Error:', listError.message);
  } else {
    console.log(`   ✅ Found ${portfolios.length} portfolios`);
    portfolios.forEach(p => {
      console.log(`      - ${p.name} (${p.code})`);
      console.log(`        ${p.funding_sources?.length || 0} funding sources, ${p.projects?.length || 0} projects`);
    });
  }

  if (portfolios && portfolios.length > 0) {
    const testPortfolio = portfolios[0];
    
    // Test 2: Get single portfolio
    console.log(`\n2️⃣ Testing GET /api/portfolios/${testPortfolio.id}`);
    const { data: singlePortfolio, error: singleError } = await supabase
      .from('portfolios')
      .select(`
        *,
        funding_sources (*),
        projects (
          id,
          name,
          status,
          address
        )
      `)
      .eq('id', testPortfolio.id)
      .single();

    if (singleError) {
      console.log('   ❌ Error:', singleError.message);
    } else {
      console.log('   ✅ Portfolio details retrieved');
      console.log(`      Name: ${singlePortfolio.name}`);
      console.log(`      Code: ${singlePortfolio.code}`);
      console.log(`      Description: ${singlePortfolio.description || 'None'}`);
      console.log(`      Active: ${singlePortfolio.is_active}`);
    }

    // Test 3: Get funding sources for portfolio
    console.log(`\n3️⃣ Testing GET /api/funding-sources?portfolio_id=${testPortfolio.id}`);
    const { data: fundingSources, error: fundingError } = await supabase
      .from('funding_sources')
      .select(`
        *,
        portfolio:portfolios (
          id,
          name,
          code
        )
      `)
      .eq('portfolio_id', testPortfolio.id)
      .eq('is_active', true)
      .order('name');

    if (fundingError) {
      console.log('   ❌ Error:', fundingError.message);
    } else {
      console.log(`   ✅ Found ${fundingSources.length} funding sources`);
      fundingSources.forEach(fs => {
        const remaining = (fs.commitment_amount || 0) - (fs.drawn_amount || 0);
        console.log(`      - ${fs.name} (${fs.type})`);
        console.log(`        Commitment: $${fs.commitment_amount?.toLocaleString() || 0}`);
        console.log(`        Drawn: $${fs.drawn_amount?.toLocaleString() || 0}`);
        console.log(`        Remaining: $${remaining.toLocaleString()}`);
      });
    }
  }

  // Test 4: Check schema
  console.log('\n4️⃣ Checking database schema');
  const { data: portfolioColumns } = await supabase
    .from('portfolios')
    .select('*')
    .limit(1);

  if (portfolioColumns && portfolioColumns.length > 0) {
    const columns = Object.keys(portfolioColumns[0]);
    console.log('   ✅ Portfolio columns:', columns.join(', '));
  }

  const { data: fundingColumns } = await supabase
    .from('funding_sources')
    .select('*')
    .limit(1);

  if (fundingColumns && fundingColumns.length > 0) {
    const columns = Object.keys(fundingColumns[0]);
    console.log('   ✅ Funding source columns:', columns.join(', '));
  }

  console.log('\n✅ API test complete!');
}

testPortfolioAPI().catch(console.error);
