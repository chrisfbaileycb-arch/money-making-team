import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, setDoc, getDoc,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';
import {
  INITIAL_SECURITY_HEADERS,
  INITIAL_AGENTS,
  INITIAL_CAMPAIGNS,
  INITIAL_OFFERS,
  INITIAL_AD_SPEND_REQUESTS,
  INITIAL_HTTPS_LAYERS,
  INITIAL_CERTIFICATES,
  INITIAL_MARKETING_PROJECTS,
  INITIAL_AFFILIATE_SALES,
  INITIAL_WEBHOOKS,
  INITIAL_PROPOSALS,
  INITIAL_LOGS,
} from './mockData';

// ---------------------------------------------------------------------------
// Types the pages depend on. Every persisted record carries ownerUid so the
// Firestore rules can scope everything to one operator.
// ---------------------------------------------------------------------------
export interface Agent {
  id: string; name: string; status: 'active' | 'idle' | 'paused' | 'running'; efficiency: number; campaignId?: string;
  schedule?: 'nightly' | 'off'; mode?: 'vertical' | 'scout'; vertical?: string; region?: string; minPayout?: number; notes?: string; intel?: string; channels?: string[];
}
export interface Campaign { id: string; name: string; budget: number; payout: number; status: 'active' | 'paused'; bannerUrl?: string }
export interface Offer {
  id: string; name: string; category: string; payout: number; commission: string; epc: number | null; hot: boolean; imageUrl: string;
  signupUrl?: string; network?: string; status?: string; payoutUnit?: string;
}
export interface AdSpendRequest { id: string; agentId: string; amount: number; reason: string; status: 'pending' | 'approved' | 'denied' }
export type ProtectedSurface = 'dashboard' | 'campaigns' | 'workflows';
export interface HttpsLayer {
  id: string; name: string; type: 'residential' | 'datacenter' | 'mobile'; ipAddress: string; protectedSurface: ProtectedSurface;
  apiKeyRequired: boolean; status: 'active' | 'paused'; trafficUsed: number; sslVersion: string; latency: number;
}
export interface Certificate { id: string; domain: string; issuer: string; status: 'valid' | 'expiring' | 'expired'; expiryDate: string }
export interface MarketingProject {
  id: string; name: string; platform: 'Shopify' | 'HubSpot' | 'Meta Ads' | 'Google Ads' | 'Custom Webhook';
  status: 'connected' | 'disconnected'; webhookUrl?: string; hasToken: boolean;
}
export interface AffiliateSale {
  id: string; campaignName: string; product: string; amount: number; commission: number; status: 'pending' | 'approved' | 'paid'; agentName: string;
}
export interface WorkflowLog { id: string; timestamp: Date; message: string; type: 'info' | 'success' | 'warning' | 'error' }
export interface IncomingWebhook {
  id: string; name: string; token: string; targetAgentId: string; targetCampaignId: string; status: 'active' | 'paused';
  triggerCount: number; lastTriggeredAt: Date | null;
}
export interface Proposal {
  id: string; type: 'opportunity' | 'affiliate_program' | 'marketing_content'; status: 'awaiting_approval' | 'approved' | 'rejected' | 'applied';
  title: string; summary: string; data: any; createdAt: Date | null; taskId: string; agentId?: string;
}
export type SecurityHeaders = Record<string, boolean>;

interface AppContextType {
  user: User | null; loading: boolean; signIn: () => Promise<void>; signOutUser: () => Promise<void>;
  agents: Agent[]; campaigns: Campaign[]; offers: Offer[]; adSpendRequests: AdSpendRequest[];
  httpsLayers: HttpsLayer[]; certificates: Certificate[]; securityHeaders: SecurityHeaders;
  marketingProjects: MarketingProject[]; affiliateSales: AffiliateSale[]; workflowLogs: WorkflowLog[];
  incomingWebhooks: IncomingWebhook[]; proposals: Proposal[];
  scoutDiscoveryFilters: { minimumPayout: number; maximumPayout: number };
  addAgent: (name: string, extra?: Partial<Agent>) => Promise<void>; deleteAgent: (id: string) => Promise<void>;
  updateAgent: (id: string, patch: Partial<Agent>) => Promise<void>;
  requestAdSpend: (agentId: string, amount: number, reason: string) => Promise<void>;
  approveAdSpend: (id: string) => Promise<void>; denyAdSpend: (id: string) => Promise<void>;
  addCampaign: (name: string, budget: number, payout: number) => Promise<void>; toggleCampaignStatus: (id: string) => Promise<void>;
  toggleHttpsLayer: (id: string) => Promise<void>; toggleLayerApiKeyRequirement: (id: string) => Promise<void>;
  addHttpsLayer: (name: string, type: HttpsLayer['type'], ip: string, surface: ProtectedSurface, apiKeyRequired: boolean) => Promise<void>;
  addCertificate: (domain: string, issuer: string) => Promise<void>; toggleSecurityHeader: (key: string) => Promise<void>;
  connectProject: (name: string, platform: MarketingProject['platform'], apiToken: string, webhookUrl?: string) => Promise<void>;
  disconnectProject: (id: string) => Promise<void>;
  addAffiliateSale: (sale: Omit<AffiliateSale, 'id'>) => Promise<void>;
  addWorkflowLog: (type: WorkflowLog['type'], message: string) => void; clearWorkflowLogs: () => void;
  addIncomingWebhook: (name: string, agentId: string, campaignId: string) => Promise<void>;
  deleteIncomingWebhook: (id: string) => Promise<void>; toggleIncomingWebhookStatus: (id: string) => Promise<void>;
  recordWebhookTrigger: (id: string) => Promise<void>;
  decideProposal: (id: string, status: Proposal['status']) => Promise<void>;
  enqueueTask: (task: { skill: string; agentId?: string; campaignId?: string; input: Record<string, unknown>; dryRun?: boolean }) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_HEADERS: SecurityHeaders = INITIAL_SECURITY_HEADERS;

const DEMO_USER: User = {
  uid: 'owner-operator-uid',
  email: 'chrisfbailey.CB@gmail.com',
  displayName: 'Chris Bailey (Operator)',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  photoURL: null,
  providerId: 'google.com',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`affiliate_agent_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`affiliate_agent_${key}`, JSON.stringify(val));
  } catch {
    // ignore
  }
}

/** Subscribe to an owner-scoped collection when real Firebase is active. */
function useOwnedCollection<T extends { id: string }>(uid: string | undefined, name: string, order?: string) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured || !uid) { return; }
    const base = collection(db, name);
    const q = order
      ? query(base, where('ownerUid', '==', uid), orderBy(order, 'desc'))
      : query(base, where('ownerUid', '==', uid));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => {
        const data = d.data();
        const norm: Record<string, unknown> = { id: d.id, ...data };
        for (const k of ['createdAt', 'lastTriggeredAt', 'decidedAt']) {
          const v = data[k];
          if (v && typeof v.toDate === 'function') norm[k] = v.toDate();
        }
        return norm as T;
      }));
    }, (err) => console.error(`snapshot ${name}:`, err));
  }, [uid, name, order]);
  return items;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (isFirebaseConfigured) return null;
    const saved = localStorage.getItem('affiliate_agent_signed_in');
    return saved === 'false' ? null : DEMO_USER;
  });
  const [loading, setLoading] = useState(isFirebaseConfigured);

  // Fallback standalone local state
  const [localAgents, setLocalAgents] = useState<Agent[]>(() => getStorage('agents', INITIAL_AGENTS));
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(() => getStorage('campaigns', INITIAL_CAMPAIGNS));
  const [localOffers] = useState<Offer[]>(() => getStorage('offers', INITIAL_OFFERS));
  const [localAdSpendRequests, setLocalAdSpendRequests] = useState<AdSpendRequest[]>(() => getStorage('adSpendRequests', INITIAL_AD_SPEND_REQUESTS));
  const [localHttpsLayers, setLocalHttpsLayers] = useState<HttpsLayer[]>(() => getStorage('httpsLayers', INITIAL_HTTPS_LAYERS));
  const [localCertificates, setLocalCertificates] = useState<Certificate[]>(() => getStorage('certificates', INITIAL_CERTIFICATES));
  const [localMarketingProjects, setLocalMarketingProjects] = useState<MarketingProject[]>(() => getStorage('marketingProjects', INITIAL_MARKETING_PROJECTS));
  const [localAffiliateSales, setLocalAffiliateSales] = useState<AffiliateSale[]>(() => getStorage('affiliateSales', INITIAL_AFFILIATE_SALES));
  const [localIncomingWebhooks, setLocalIncomingWebhooks] = useState<IncomingWebhook[]>(() => getStorage('incomingWebhooks', INITIAL_WEBHOOKS));
  const [localProposals, setLocalProposals] = useState<Proposal[]>(() => getStorage('proposals', INITIAL_PROPOSALS));

  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>(INITIAL_LOGS);
  const [securityHeaders, setSecurityHeaders] = useState<SecurityHeaders>(() => getStorage('securityHeaders', DEFAULT_HEADERS));
  const uid = user?.uid;

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    const ref = doc(db, 'users', uid);
    getDoc(ref).then((s) => {
      if (!s.exists()) setDoc(ref, { ownerUid: uid, securityHeaders: DEFAULT_HEADERS, createdAt: serverTimestamp() });
    });
    return onSnapshot(ref, (s) => { const d = s.data(); if (d?.securityHeaders) setSecurityHeaders(d.securityHeaders); });
  }, [uid]);

  // Firestore collections (active when real Firebase is present)
  const remoteAgents = useOwnedCollection<Agent>(uid, 'agents');
  const remoteCampaigns = useOwnedCollection<Campaign>(uid, 'campaigns');
  const remoteOffers = useOwnedCollection<Offer>(uid, 'offers');
  const remoteAdSpendRequests = useOwnedCollection<AdSpendRequest>(uid, 'adSpendRequests');
  const remoteHttpsLayers = useOwnedCollection<HttpsLayer>(uid, 'httpsLayers');
  const remoteCertificates = useOwnedCollection<Certificate>(uid, 'certificates');
  const remoteMarketingProjects = useOwnedCollection<MarketingProject>(uid, 'marketingProjects');
  const remoteAffiliateSales = useOwnedCollection<AffiliateSale>(uid, 'affiliateSales');
  const remoteIncomingWebhooks = useOwnedCollection<IncomingWebhook>(uid, 'incomingWebhooks');
  const remoteProposals = useOwnedCollection<Proposal>(uid, 'proposals', 'createdAt');

  // Resolved collections based on configuration
  const agents = isFirebaseConfigured ? remoteAgents : localAgents;
  const campaigns = isFirebaseConfigured ? remoteCampaigns : localCampaigns;
  const offers = isFirebaseConfigured ? remoteOffers : localOffers;
  const adSpendRequests = isFirebaseConfigured ? remoteAdSpendRequests : localAdSpendRequests;
  const httpsLayers = isFirebaseConfigured ? remoteHttpsLayers : localHttpsLayers;
  const certificates = isFirebaseConfigured ? remoteCertificates : localCertificates;
  const marketingProjects = isFirebaseConfigured ? remoteMarketingProjects : localMarketingProjects;
  const affiliateSales = isFirebaseConfigured ? remoteAffiliateSales : localAffiliateSales;
  const incomingWebhooks = isFirebaseConfigured ? remoteIncomingWebhooks : localIncomingWebhooks;
  const proposals = isFirebaseConfigured ? remoteProposals : localProposals;

  const own = useCallback(() => {
    if (!uid) throw new Error('Sign in first');
    return uid;
  }, [uid]);

  const add = useCallback(async (col: string, data: Record<string, unknown>) => {
    const ref = await addDoc(collection(db, col), { ...data, ownerUid: own(), createdAt: serverTimestamp() });
    return ref.id;
  }, [own]);

  const patch = useCallback((col: string, id: string, data: Record<string, unknown>) => updateDoc(doc(db, col, id), data as any), []);
  const remove = useCallback((col: string, id: string) => deleteDoc(doc(db, col, id)), []);

  const value: AppContextType = useMemo(() => ({
    user, loading,
    signIn: async () => {
      if (isFirebaseConfigured) {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } else {
        localStorage.setItem('affiliate_agent_signed_in', 'true');
        setUser(DEMO_USER);
      }
    },
    signOutUser: async () => {
      if (isFirebaseConfigured) {
        await signOut(auth);
      } else {
        localStorage.setItem('affiliate_agent_signed_in', 'false');
        setUser(null);
      }
    },
    agents, campaigns, offers, adSpendRequests, httpsLayers, certificates, securityHeaders,
    marketingProjects, affiliateSales, workflowLogs, incomingWebhooks, proposals,
    scoutDiscoveryFilters: { minimumPayout: 100, maximumPayout: 10000 },

    addAgent: async (name, extra = {}) => {
      if (isFirebaseConfigured) {
        await add('agents', { name, status: 'active', efficiency: 0, schedule: 'off', ...extra });
      } else {
        const newAgent: Agent = {
          id: `agent-${Date.now()}`,
          name,
          status: 'active',
          efficiency: 0,
          schedule: 'off',
          ...extra,
        };
        setLocalAgents((prev) => {
          const next = [newAgent, ...prev];
          setStorage('agents', next);
          return next;
        });
      }
    },
    deleteAgent: async (id) => {
      if (isFirebaseConfigured) {
        await remove('agents', id);
      } else {
        setLocalAgents((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setStorage('agents', next);
          return next;
        });
      }
    },
    updateAgent: async (id, p) => {
      if (isFirebaseConfigured) {
        await patch('agents', id, p);
      } else {
        setLocalAgents((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, ...p } : x));
          setStorage('agents', next);
          return next;
        });
      }
    },
    requestAdSpend: async (agentId, amount, reason) => {
      if (isFirebaseConfigured) {
        await add('adSpendRequests', { agentId, amount, reason, status: 'pending' });
      } else {
        const newReq: AdSpendRequest = {
          id: `req-${Date.now()}`,
          agentId,
          amount,
          reason,
          status: 'pending',
        };
        setLocalAdSpendRequests((prev) => {
          const next = [newReq, ...prev];
          setStorage('adSpendRequests', next);
          return next;
        });
      }
    },
    approveAdSpend: async (id) => {
      if (isFirebaseConfigured) {
        await patch('adSpendRequests', id, { status: 'approved' });
      } else {
        setLocalAdSpendRequests((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status: 'approved' as const } : x));
          setStorage('adSpendRequests', next);
          return next;
        });
      }
    },
    denyAdSpend: async (id) => {
      if (isFirebaseConfigured) {
        await patch('adSpendRequests', id, { status: 'denied' });
      } else {
        setLocalAdSpendRequests((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status: 'denied' as const } : x));
          setStorage('adSpendRequests', next);
          return next;
        });
      }
    },

    addCampaign: async (name, budget, payout) => {
      if (isFirebaseConfigured) {
        await add('campaigns', { name, budget, payout, status: 'active' });
      } else {
        const newCamp: Campaign = {
          id: `camp-${Date.now()}`,
          name,
          budget,
          payout,
          status: 'active',
          bannerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        };
        setLocalCampaigns((prev) => {
          const next = [newCamp, ...prev];
          setStorage('campaigns', next);
          return next;
        });
      }
    },
    toggleCampaignStatus: async (id) => {
      if (isFirebaseConfigured) {
        const c = campaigns.find((x) => x.id === id);
        if (c) await patch('campaigns', id, { status: c.status === 'active' ? 'paused' : 'active' });
      } else {
        setLocalCampaigns((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status: x.status === 'active' ? 'paused' as const : 'active' as const } : x));
          setStorage('campaigns', next);
          return next;
        });
      }
    },

    toggleHttpsLayer: async (id) => {
      if (isFirebaseConfigured) {
        const l = httpsLayers.find((x) => x.id === id);
        if (l) await patch('httpsLayers', id, { status: l.status === 'active' ? 'paused' : 'active' });
      } else {
        setLocalHttpsLayers((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status: x.status === 'active' ? 'paused' as const : 'active' as const } : x));
          setStorage('httpsLayers', next);
          return next;
        });
      }
    },
    toggleLayerApiKeyRequirement: async (id) => {
      if (isFirebaseConfigured) {
        const l = httpsLayers.find((x) => x.id === id);
        if (l) await patch('httpsLayers', id, { apiKeyRequired: !l.apiKeyRequired });
      } else {
        setLocalHttpsLayers((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, apiKeyRequired: !x.apiKeyRequired } : x));
          setStorage('httpsLayers', next);
          return next;
        });
      }
    },
    addHttpsLayer: async (name, type, ipAddress, protectedSurface, apiKeyRequired) => {
      if (isFirebaseConfigured) {
        await add('httpsLayers', { name, type, ipAddress, protectedSurface, apiKeyRequired, status: 'active', trafficUsed: 0, sslVersion: 'TLS 1.3', latency: 0 });
      } else {
        const newLayer: HttpsLayer = {
          id: `layer-${Date.now()}`,
          name,
          type,
          ipAddress,
          protectedSurface,
          apiKeyRequired,
          status: 'active',
          trafficUsed: 0,
          sslVersion: 'TLS 1.3',
          latency: 18,
        };
        setLocalHttpsLayers((prev) => {
          const next = [newLayer, ...prev];
          setStorage('httpsLayers', next);
          return next;
        });
      }
    },
    addCertificate: async (domain, issuer) => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      const expiryDate = expiry.toISOString().slice(0, 10);
      if (isFirebaseConfigured) {
        await add('certificates', { domain, issuer, status: 'valid', expiryDate });
      } else {
        const newCert: Certificate = {
          id: `cert-${Date.now()}`,
          domain,
          issuer,
          status: 'valid',
          expiryDate,
        };
        setLocalCertificates((prev) => {
          const next = [newCert, ...prev];
          setStorage('certificates', next);
          return next;
        });
      }
    },
    toggleSecurityHeader: async (key) => {
      const next = { ...securityHeaders, [key]: !securityHeaders[key] };
      setSecurityHeaders(next);
      setStorage('securityHeaders', next);
      if (isFirebaseConfigured && uid) {
        await setDoc(doc(db, 'users', own()), { securityHeaders: next }, { merge: true });
      }
    },

    connectProject: async (name, platform, apiToken, webhookUrl) => {
      if (isFirebaseConfigured) {
        await add('marketingProjects', { name, platform, status: 'connected', apiToken, webhookUrl: webhookUrl || '', hasToken: !!apiToken });
      } else {
        const newProj: MarketingProject = {
          id: `proj-${Date.now()}`,
          name,
          platform,
          status: 'connected',
          webhookUrl: webhookUrl || '',
          hasToken: !!apiToken,
        };
        setLocalMarketingProjects((prev) => {
          const next = [newProj, ...prev];
          setStorage('marketingProjects', next);
          return next;
        });
      }
    },
    disconnectProject: async (id) => {
      if (isFirebaseConfigured) {
        await remove('marketingProjects', id);
      } else {
        setLocalMarketingProjects((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setStorage('marketingProjects', next);
          return next;
        });
      }
    },

    addAffiliateSale: async (sale) => {
      if (isFirebaseConfigured) {
        await add('affiliateSales', sale);
      } else {
        const newSale: AffiliateSale = { id: `sale-${Date.now()}`, ...sale };
        setLocalAffiliateSales((prev) => {
          const next = [newSale, ...prev];
          setStorage('affiliateSales', next);
          return next;
        });
      }
    },
    addWorkflowLog: (type, message) => setWorkflowLogs((l) => [...l, { id: crypto.randomUUID(), timestamp: new Date(), type, message }]),
    clearWorkflowLogs: () => setWorkflowLogs([]),

    addIncomingWebhook: async (name, targetAgentId, targetCampaignId) => {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      if (isFirebaseConfigured) {
        await add('incomingWebhooks', { name, token, targetAgentId, targetCampaignId, status: 'active', triggerCount: 0, lastTriggeredAt: null });
      } else {
        const newWh: IncomingWebhook = {
          id: `wh-${Date.now()}`,
          name,
          token,
          targetAgentId,
          targetCampaignId,
          status: 'active',
          triggerCount: 0,
          lastTriggeredAt: null,
        };
        setLocalIncomingWebhooks((prev) => {
          const next = [newWh, ...prev];
          setStorage('incomingWebhooks', next);
          return next;
        });
      }
    },
    deleteIncomingWebhook: async (id) => {
      if (isFirebaseConfigured) {
        await remove('incomingWebhooks', id);
      } else {
        setLocalIncomingWebhooks((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setStorage('incomingWebhooks', next);
          return next;
        });
      }
    },
    toggleIncomingWebhookStatus: async (id) => {
      if (isFirebaseConfigured) {
        const w = incomingWebhooks.find((x) => x.id === id);
        if (w) await patch('incomingWebhooks', id, { status: w.status === 'active' ? 'paused' : 'active' });
      } else {
        setLocalIncomingWebhooks((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status: x.status === 'active' ? 'paused' as const : 'active' as const } : x));
          setStorage('incomingWebhooks', next);
          return next;
        });
      }
    },
    recordWebhookTrigger: async (id) => {
      if (isFirebaseConfigured) {
        const w = incomingWebhooks.find((x) => x.id === id);
        if (w) await patch('incomingWebhooks', id, { triggerCount: (w.triggerCount || 0) + 1, lastTriggeredAt: serverTimestamp() });
      } else {
        setLocalIncomingWebhooks((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, triggerCount: (x.triggerCount || 0) + 1, lastTriggeredAt: new Date() } : x));
          setStorage('incomingWebhooks', next);
          return next;
        });
      }
    },

    decideProposal: async (id, status) => {
      if (isFirebaseConfigured) {
        await patch('proposals', id, { status, decidedAt: serverTimestamp() });
      } else {
        setLocalProposals((prev) => {
          const next = prev.map((x) => (x.id === id ? { ...x, status } : x));
          setStorage('proposals', next);
          return next;
        });
      }
    },
    enqueueTask: async (task) => {
      const taskId = `task-${Date.now()}`;
      if (isFirebaseConfigured) {
        return await add('workflow_tasks', { ...task, status: 'pending', progress: 0 });
      } else {
        setWorkflowLogs((l) => [
          ...l,
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            type: 'info',
            message: `Task queued [${taskId}]: executing ${task.skill} (${task.dryRun ? 'dry run' : 'live'})`,
          },
        ]);
        return taskId;
      }
    },
  }), [
    user, uid, loading, agents, campaigns, offers, adSpendRequests, httpsLayers, certificates, securityHeaders,
    marketingProjects, affiliateSales, workflowLogs, incomingWebhooks, proposals, add, patch, remove, own,
  ]);

  return <AppContext.Provider value={value}>{!loading && children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
export const useAppContext = useApp;
