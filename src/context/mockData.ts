import type {
  Agent,
  Campaign,
  Offer,
  AdSpendRequest,
  HttpsLayer,
  Certificate,
  MarketingProject,
  AffiliateSale,
  WorkflowLog,
  IncomingWebhook,
  Proposal,
  SecurityHeaders,
} from './AppContext';

export const INITIAL_SECURITY_HEADERS: SecurityHeaders = {
  hsts: true,
  csp: true,
  xfo: true,
  referrer: true,
  permissions: false,
};

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Scout Agent Alpha',
    status: 'running',
    efficiency: 96,
    schedule: 'nightly',
    mode: 'scout',
    region: 'United States',
    minPayout: 250,
    intel: 'Enterprise SaaS referral bounties & Commercial Colocation GPU hosting agreements',
    notes: 'Prioritize partner programs with recurring commissions or >$1,000 flat bounties.',
  },
  {
    id: 'agent-2',
    name: 'Commercial Solar Lead Gen',
    status: 'active',
    efficiency: 89,
    schedule: 'nightly',
    mode: 'vertical',
    vertical: 'Commercial Solar & Battery Storage',
    region: 'California / Texas',
    minPayout: 500,
    intel: 'Commercial PPA incentives and corporate ESG capex budgets',
  },
  {
    id: 'agent-3',
    name: 'FinTech B2B Scaler',
    status: 'idle',
    efficiency: 82,
    schedule: 'off',
    mode: 'vertical',
    vertical: 'Corporate Cards, Payroll & Treasury API',
    region: 'North America',
    minPayout: 350,
    intel: 'Direct CPA/Accounting firm integration programs',
  },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Commercial Energy Storage PPA',
    budget: 15000,
    payout: 2400,
    status: 'active',
    bannerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'camp-2',
    name: 'Enterprise Cloud Fleet Migration',
    budget: 25000,
    payout: 4800,
    status: 'active',
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'camp-3',
    name: 'B2B Merchant Payment Processing',
    budget: 8000,
    payout: 1250,
    status: 'active',
    bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
  },
];

export const INITIAL_OFFERS: Offer[] = [
  {
    id: 'off-1',
    name: 'EnviroGrid Commercial Solar PPA',
    category: 'Energy & Infrastructure',
    payout: 3500,
    commission: 'Up to $3,500 / closed site',
    epc: 14.8,
    hot: true,
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80',
    network: 'Direct Partner Portal',
    signupUrl: 'https://partner.envirogrid.example/apply',
  },
  {
    id: 'off-2',
    name: 'HyperScale GPU Colocation Lease',
    category: 'Enterprise Tech',
    payout: 7200,
    commission: '12% contract value ($7.2k avg)',
    epc: 28.5,
    hot: true,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    network: 'DataCenter Alliance',
    signupUrl: 'https://hyperscale.example/partners',
  },
  {
    id: 'off-3',
    name: 'Apex B2B Payroll & HR Stack',
    category: 'B2B SaaS',
    payout: 850,
    commission: '$850 per 50+ seat referral',
    epc: 9.2,
    hot: false,
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    network: 'Impact / PartnerStack',
    signupUrl: 'https://apex.example/affiliates',
  },
  {
    id: 'off-4',
    name: 'Titan Equipment Leasing & Capex',
    category: 'Commercial Finance',
    payout: 4200,
    commission: '3.5% loan origination',
    epc: 19.4,
    hot: true,
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    network: 'Direct Lending Portal',
    signupUrl: 'https://titanleasing.example/brokers',
  },
];

export const INITIAL_AD_SPEND_REQUESTS: AdSpendRequest[] = [
  {
    id: 'req-1',
    agentId: 'agent-1',
    amount: 450,
    reason: 'Scale Google Ads keywords for GPU colocation bids in Dallas and Seattle',
    status: 'pending',
  },
  {
    id: 'req-2',
    agentId: 'agent-2',
    amount: 800,
    reason: 'Direct response paid social expansion for commercial solar inquiries in Austin',
    status: 'pending',
  },
];

export const INITIAL_HTTPS_LAYERS: HttpsLayer[] = [
  {
    id: 'layer-1',
    name: 'Cloudflare Edge Proxy Alpha',
    type: 'datacenter',
    ipAddress: '198.51.100.42',
    protectedSurface: 'dashboard',
    apiKeyRequired: true,
    status: 'active',
    trafficUsed: 1420,
    sslVersion: 'TLS 1.3',
    latency: 24,
  },
  {
    id: 'layer-2',
    name: 'Residential Scraping Gateway',
    type: 'residential',
    ipAddress: '203.0.113.88',
    protectedSurface: 'workflows',
    apiKeyRequired: false,
    status: 'active',
    trafficUsed: 4890,
    sslVersion: 'TLS 1.3',
    latency: 68,
  },
];

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-1',
    domain: 'api.affiliateagent.internal',
    issuer: "Let's Encrypt Authority X3",
    status: 'valid',
    expiryDate: '2026-12-31',
  },
  {
    id: 'cert-2',
    domain: 'app.affiliateagent.io',
    issuer: 'DigiCert Global Root CA',
    status: 'valid',
    expiryDate: '2027-04-15',
  },
];

export const INITIAL_MARKETING_PROJECTS: MarketingProject[] = [
  {
    id: 'proj-1',
    name: 'HubSpot Inbound Automation',
    platform: 'HubSpot',
    status: 'connected',
    webhookUrl: 'https://api.hubspot.example/v1/webhooks',
    hasToken: true,
  },
  {
    id: 'proj-2',
    name: 'Google Ads High-Ticket Search',
    platform: 'Google Ads',
    status: 'connected',
    webhookUrl: 'https://ads.google.example/webhooks',
    hasToken: true,
  },
];

export const INITIAL_AFFILIATE_SALES: AffiliateSale[] = [
  {
    id: 'sale-1',
    campaignName: 'Commercial Energy Storage PPA',
    product: '100kW Commercial Battery Array',
    amount: 68000,
    commission: 2400,
    status: 'approved',
    agentName: 'Commercial Solar Lead Gen',
  },
  {
    id: 'sale-2',
    campaignName: 'Enterprise Cloud Fleet Migration',
    product: 'Dedicated Compute Cluster (12 Mo)',
    amount: 92000,
    commission: 4800,
    status: 'paid',
    agentName: 'Scout Agent Alpha',
  },
];

export const INITIAL_WEBHOOKS: IncomingWebhook[] = [
  {
    id: 'wh-1',
    name: 'Zapier New Qualified Lead Ingestion',
    token: 'wh_sec_k9823hfsd98f7234',
    targetAgentId: 'agent-1',
    targetCampaignId: 'camp-1',
    status: 'active',
    triggerCount: 142,
    lastTriggeredAt: new Date(Date.now() - 3600000),
  },
];

export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    type: 'opportunity',
    status: 'awaiting_approval',
    title: 'Sell GPU Servers to AI Research Labs & Regional Data Centers',
    summary: 'High-ticket B2B server lease referrals with $5,000–$12,000 commission per closed hardware financing agreement.',
    data: {
      tier: 'high_ticket',
      vertical: 'GPU Colocation & Server Infrastructure',
      stacksWithClientBase: true,
      estimatedCommissionLow: 5000,
      estimatedCommissionHigh: 12000,
      payoutModel: 'reseller_margin',
      typicalTicket: '$45,000–$120,000 per rack',
      noveltyScore: 82,
      fitScore: 91,
      whyItPays: 'Data centers offer substantial finder fees for dedicated capacity commitments in low-energy cost zones.',
      salesCycle: '45–90 days',
      sourced: [
        'https://datacenterdynamics.example/colocation-rates',
        'https://partner.equinix.example/referral',
      ],
      hypothesis: [
        'Operators in Texas and Washington have excess megawatts ready to lease immediately.',
      ],
      risks: ['Long qualification cycles', 'Capital expenditure approval timelines'],
    },
    createdAt: new Date(),
    taskId: 'task-101',
  },
];

export const INITIAL_LOGS: WorkflowLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 120000),
    message: 'Scout Agent Alpha completed scan of 42 partner portals. 1 new proposal staged.',
    type: 'info',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 60000),
    message: 'Campaign "Commercial Energy Storage PPA" conversion verified (+$2,400 commission).',
    type: 'success',
  },
];
