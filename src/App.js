import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Mic, FormInput, Activity, Compass, Zap, Layers, Upload, Check, X, Menu, Settings, TrendingUp, Cpu, BarChart3, Users, Globe, Lock, Code, AlertTriangle, MessageSquare, Briefcase, ChevronRight, CornerDownRight, BarChartHorizontal, Loader, Map, Clock, LogOut, Sun, Moon, MapPin, User, Mail
} from 'lucide-react';

// --- API CONFIGURATION AND UTILITIES ---
const API_KEY = "AIzaSyBH_ZOZElGBymq3uidj_0vtrIfd9LdSWtM"; // Placeholder for Gemini API Key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";

/**
 * Robust fetch function with exponential backoff for API calls.
 */
const fetchWithBackoff = async (url, options, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) { // Too many requests
        if (i === retries - 1) throw new Error('API request failed after multiple retries.');
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
};

// --- CONFIGURATION AND ASSETS ---
const APP_CONFIG = {
  brand: "PrioritizeIT",
  tagline: "AI-powered cyber incident intake, prioritization, and tamper-proof evidence.",
  colors: {
    // Shared Accents
    sky: '#38BDF8', // Sky Blue
    teal: '#22D3EE', // Teal
    violet: '#A78BFA', // Soft Violet
    amber: '#F59E0B', // Amber (Warning)
    success: '#10B981',
    danger: '#EF4444',

    // Dark Theme
    'dark-bg': '#0F172A',
    'dark-surface': '#1E293B',
    'dark-text': '#FFFFFF',
    'dark-text-secondary': '#CBD5E1', // slate-300
    'dark-glass': 'rgba(255,255,255,0.06)',

    // Light Theme
    'light-bg': '#F8FAFC',
    'light-surface': '#FFFFFF',
    'light-text': '#0F172A',
    'light-text-secondary': '#475569', // slate-600
    'light-glass': 'rgba(15, 23, 42, 0.05)',
  },
};

// --- DEMO DATA FOR INVESTIGATOR CONSOLE ---
const initialDemoCases = [
  { id: 'PIT-2025-001', title: 'Ransomware Targeting BFSI Server', tpr: 92, category: 'Ransomware', status: 'Triaged', source: 'API', icon: Cpu, isVoice: false, isOCR: true, isBlockchain: true, isAnomaly: true, sector: 'BFSI', city: 'Mumbai', time: '5m ago', description: 'A critical server within the BFSI environment was hit by a double-extortion ransomware variant. Initial compromise appears to be via RDP exploit. Logs show data exfiltration attempts before encryption. Requires immediate containment.' },
  { id: 'PIT-2025-002', title: 'Phishing Cluster - Gov Employees', tpr: 78, category: 'Phishing', status: 'Ongoing', source: 'Form', icon: Users, isVoice: false, isOCR: true, isBlockchain: true, isAnomaly: false, sector: 'Gov', city: 'Delhi', time: '1h ago', description: 'Multiple government employees reported receiving a highly personalized email claiming to be from the internal HR department regarding a "mandatory policy update." The link directs to a credential harvesting site. 15 accounts compromised so far.' },
  { id: 'PIT-2025-003', title: 'UPI Fraud Complaint', tpr: 55, category: 'UPI Fraud', status: 'New', source: 'Voice', icon: MessageSquare, isVoice: true, isOCR: false, isBlockchain: false, isAnomaly: false, sector: 'BFSI', city: 'Chennai', time: '3h ago', description: 'Citizen reported losing ₹50,000 after receiving a fraudulent call from a person claiming to be a bank manager. The caller used social engineering to convince the victim to share their UPI PIN and transaction details via voice. Transaction ID mentioned: 40019203...' },
  { id: 'PIT-2025-004', title: 'Account Takeover - E-commerce', tpr: 88, category: 'Account Takeover', status: 'Triaged', source: 'Form', icon: Lock, isVoice: false, isOCR: true, isBlockchain: true, isAnomaly: true, sector: 'Tech', city: 'Bengaluru', time: '5h ago', description: 'High-value customer account on our platform was compromised. Orders were placed and cancelled rapidly to test stolen credit cards. Source IP traced to a known proxy network. Password reset initiated, but damage assessment is required.' },
  { id: 'PIT-2025-005', title: 'Credential Stuffing Attempt', tpr: 42, category: 'Identity Theft', status: 'Closed', source: 'API', icon: Code, isVoice: false, isOCR: false, isBlockchain: true, isAnomaly: false, sector: 'Tech', city: 'Mumbai', time: '1d ago', description: 'Automated script attempted to log into 1,200 accounts using credentials leaked from a third-party breach. All attempts were blocked by MFA. Alert raised and accounts forced to reset passwords. Low risk due to successful mitigation.' },
  { id: 'PIT-2025-006', title: 'Spear Phishing - Tech Executive', tpr: 95, category: 'Phishing', status: 'Ongoing', source: 'Form', icon: Briefcase, isVoice: false, isOCR: true, isBlockchain: true, isAnomaly: true, sector: 'Tech', city: 'Delhi', time: '2d ago', description: 'CEO received an email impersonating the CFO, requesting an urgent wire transfer to an unknown overseas account. The email used highly accurate internal jargon. The transaction was stopped just prior to execution. High-profile, sensitive case.' },
];

// Helper to get color based on TPR
const getTprColor = (tpr) => {
  if (tpr > 80) return APP_CONFIG.colors.danger;
  if (tpr > 50) return APP_CONFIG.colors.amber;
  return APP_CONFIG.colors.sky;
};

// --- UI COMPONENTS ---

// Reusable Glassmorphism Card
const GlassCard = ({ children, className = '', glow = false, theme }) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? APP_CONFIG.colors['dark-glass'] : APP_CONFIG.colors['light-glass'];
  const borderColor = isDark ? 'border-white/10' : 'border-slate-200';
  const shadowColor = isDark ? 'shadow-black/20' : 'shadow-slate-300/30';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`
        backdrop-blur-md border ${borderColor} rounded-xl p-6 transition-all duration-300
        ${className}
        ${glow ? `shadow-lg shadow-[${APP_CONFIG.colors.sky}/30]` : `shadow-xl ${shadowColor}`}
      `}
    >
      {children}
    </div>
  );
};

// Custom Button
const PrimaryButton = ({ children, onClick, icon: Icon, secondary = false, className = '', disabled = false, theme }) => {
  const isDark = theme === 'dark';
  const primaryBg = APP_CONFIG.colors.sky;
  const primaryHover = APP_CONFIG.colors.teal;

  const bgColor = secondary
    ? (isDark ? APP_CONFIG.colors['dark-surface'] : APP_CONFIG.colors['light-surface'])
    : primaryBg;

  // Uses a known light gray hex value (#E2E8F0, slate-200) for light mode secondary hover.
  const hoverColor = secondary
    ? (isDark ? APP_CONFIG.colors.sky : '#E2E8F0')
    : primaryHover;

  const textColor = secondary
    ? primaryBg
    : APP_CONFIG.colors['light-text']; // Primary CTA text is always dark/navy for contrast

  const hoverText = secondary
    ? (isDark ? APP_CONFIG.colors.teal : APP_CONFIG.colors['light-text'])
    : APP_CONFIG.colors['light-text'];

  const borderClass = secondary && !isDark ? 'border border-slate-300' : 'border-transparent';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: bgColor, color: textColor }}
      className={`
        flex items-center justify-center space-x-2 px-6 py-3 rounded-full font-semibold ${borderClass}
        transition-all duration-300 ease-out active:scale-[0.98]
        ${disabled ? 'opacity-50 cursor-not-allowed' : `hover:bg-[${hoverColor}] hover:text-[${hoverText}] hover:shadow-lg hover:shadow-[${APP_CONFIG.colors.sky}/50]`}
        ${className}
      `}
    >
      {Icon && <Icon size={20} />}
      <span>{children}</span>
    </button>
  );
};

// TPR Badge Component (No theme change needed here as it uses fixed accent colors)
const TPRBadge = ({ tpr, size = 'md' }) => {
  const color = getTprColor(tpr);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-xl px-4 py-2',
  }[size];

  return (
    <span
      style={{ backgroundColor: color, color: APP_CONFIG.colors['light-text'] }}
      className={`inline-flex items-center font-bold rounded-full ${sizeClasses}`}
    >
      TPR {tpr}
    </span>
  );
};

// Innovation Chip (No theme change needed here as it uses fixed accent colors)
const InnovationChip = ({ icon: Icon, label, color = APP_CONFIG.colors.sky }) => (
  <div
    style={{ borderColor: color, color: color }}
    className="flex items-center space-x-1 text-xs border rounded-full px-2 py-1 bg-transparent/10 backdrop-blur-sm"
  >
    <Icon size={14} />
    <span>{label}</span>
  </div>
);

// --- GEMINI POWERED COMPONENTS ---

/**
 * Citizen Intake: AI-powered Transcript Analysis
 */
const TranscriptAnalyzer = ({ transcript, setSummary, setIocs, isSubmitting, theme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Adjusted text colors for light/dark mode
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-sky-400' : 'text-sky-600';

  const analyzeTranscript = async () => {
    setIsLoading(true);
    setError(null);
    setSummary('');
    setIocs([]);

    const systemPrompt = `You are an expert Cyber Security Intake Assistant. Analyze the user's incident report transcript. Extract a concise summary and a list of Indicators of Compromise (IOCs). IOCs must include specific data points like transaction IDs, account numbers, phone numbers, or URLs mentioned. Output the result ONLY as a single JSON object matching the schema.`;
    const userQuery = `Analyze the following incident report transcript:\n\n"${transcript}"`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING", description: "A concise, single-paragraph summary of the incident." },
            extractedIOCs: {
              type: "ARRAY",
              description: "A list of 3-5 critical indicators (e.g., transaction IDs, phone numbers, account handles) found in the text.",
              items: { type: "STRING" }
            }
          },
          propertyOrdering: ["summary", "extractedIOCs"]
        }
      }
    };

    try {
      const response = await fetchWithBackoff(GEMINI_API_URL + API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        setSummary(parsed.summary || 'Summary could not be generated.');
        setIocs(parsed.extractedIOCs || []);
      } else {
        throw new Error('Received empty response from AI.');
      }
    } catch (e) {
      console.error("Gemini API Error:", e);
      setError("AI analysis failed. Please check the transcript and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-4">
      <PrimaryButton
        icon={Cpu}
        onClick={analyzeTranscript}
        disabled={isLoading || !transcript || isSubmitting}
        className="text-sm px-4 py-2"
        secondary
        theme={theme}
      >
        {isLoading ? <Loader size={20} className="animate-spin" /> : "✨ Analyze Transcript"}
      </PrimaryButton>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      {isLoading && <p className={`${textSecondary} text-sm mt-2`}>AI is processing transcript...</p>}
    </div>
  );
};

/**
 * Investigator Console: AI-powered Action Plan Generation
 */
const CaseActionPlan = ({ caseDetails, theme }) => {
  const [actionPlan, setActionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-slate-700';
  const textPlaceholder = theme === 'dark' ? 'text-gray-500' : 'text-slate-400';

  const generateActionPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setActionPlan(null);

    const systemPrompt = `You are a Tier 2 Cyber Incident Responder. Based on the provided case details (Category, TPR, Sector, and Description), generate a professional, multi-step triage and investigation plan. The plan should be concise, highly actionable, and tailored to the severity. Output the result ONLY as a list of strings (action items).`;
    const userQuery = `Case Details:\nID: ${caseDetails.id}\nCategory: ${caseDetails.category}\nTPR: ${caseDetails.tpr}\nSector: ${caseDetails.sector}\nDescription: ${caseDetails.description}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            plan: {
              type: "ARRAY",
              description: "A list of 5-8 highly specific, numbered action items for investigation and containment.",
              items: { type: "STRING" }
            }
          }
        }
      }
    };

    try {
      const response = await fetchWithBackoff(GEMINI_API_URL + API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        setActionPlan(parsed.plan || ['Failed to generate plan.']);
      } else {
        throw new Error('Received empty response from AI.');
      }
    } catch (e) {
      console.error("Gemini API Error:", e);
      setError("AI Action Plan generation failed.");
    } finally {
      setIsLoading(false);
    }
  }, [caseDetails]);

  return (
    <GlassCard className="space-y-4" theme={theme}>
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-teal-400">AI-Powered Action Plan</h4>
        <PrimaryButton
          icon={Cpu}
          onClick={generateActionPlan}
          disabled={isLoading}
          className="text-sm px-4 py-2"
          theme={theme}
        >
          {isLoading ? <Loader size={18} className="animate-spin" /> : "✨ Generate Action Plan"}
        </PrimaryButton>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="pt-2">
        {actionPlan ? (
          <ol className={`list-decimal list-inside space-y-2 ${textSecondary}`}>
            {actionPlan.map((step, index) => (
              <li key={index} className="pl-1 text-sm">{step}</li>
            ))}
          </ol>
        ) : (
          <p className={`text-sm ${textPlaceholder}`}>Click "Generate Action Plan" to instantly receive recommended steps for triage and investigation.</p>
        )}
      </div>
    </GlassCard>
  );
};

/**
 * Investigator Console: Multi-Vector XAI Explanation
 */
const XaiExplanation = ({ caseDetails, theme }) => {
  const { tpr, sector, isAnomaly } = caseDetails;

  // Determine mock weight factors based on TPR
  const severityFactor = Math.min(60, Math.floor(tpr * 0.7)); // Up to 60 points
  const recurrenceFactor = (tpr > 75) ? 20 : (tpr > 50 ? 10 : 0);
  const geoRiskFactor = (sector === 'BFSI' || sector === 'Gov') ? 12 : 5;
  const anomalyFactor = isAnomaly ? 8 : 0;

  const totalWeightedScore = severityFactor + recurrenceFactor + geoRiskFactor + anomalyFactor;
  const finalTprDisplay = Math.min(100, totalWeightedScore); // Cap at 100

  const factors = [
    { label: "Severity (NLP/IOCs)", score: severityFactor, color: APP_CONFIG.colors.danger, reason: `High criticality based on descriptive language and extracted Indicators of Compromise.` },
    { label: "Recurrence / Actor Credibility", score: recurrenceFactor, color: APP_CONFIG.colors.amber, reason: `${recurrenceFactor > 0 ? 'Identical IOCs linked to previous incidents.' : 'No direct link to known prior threat actors or IOCs.'}` },
    { label: "Sector / Geographic Risk", score: geoRiskFactor, color: APP_CONFIG.colors.sky, reason: `Targeting a high-value sector (${sector}) in a major metropolitan area.` },
    { label: "AI Anomaly Detection", score: anomalyFactor, color: APP_CONFIG.colors.violet, reason: `Anomaly flagged due to unusually rapid submission time relative to incident date.` },
  ];

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-slate-700';
  const borderPrimary = isDark ? 'border-gray-700/50' : 'border-slate-300';


  return (
    <GlassCard className="space-y-4" theme={theme}>
      <div className='flex justify-between items-center border-b pb-3' style={{ borderColor: borderPrimary }}>
        <h4 className="text-lg font-semibold text-amber-400">Multi-Vector TPR Calculation ({finalTprDisplay})</h4>
        <TPRBadge tpr={caseDetails.tpr} size="sm" />
      </div>

      <div className="space-y-4">
        {factors.map((factor, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className={`${textPrimary} font-medium`}>{factor.label}</span>
              <span className="font-bold" style={{ color: factor.color }}>+{factor.score}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700/50 relative">
              <div
                style={{ width: `${(factor.score / 60) * 100}%`, backgroundColor: factor.color }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
            <p className={`text-xs ${textSecondary}`}>{factor.reason}</p>
          </div>
        ))}
      </div>

      <div className={`border-t ${borderPrimary} pt-4 mt-4 text-sm ${textSecondary}`}>
        <p><strong>Final TPR:</strong> {caseDetails.tpr} (Weighted Score: {finalTprDisplay})</p>
        <p className='text-xs text-amber-500 mt-1'>*Note: The final TPR is based on this multi-vector score plus external human input.</p>
      </div>
    </GlassCard>
  );
};

/**
 * Investigator Console: AI-powered Compliance Report Generation
 */
const ComplianceReportGenerator = ({ caseDetails, theme }) => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-slate-700';
  const textPlaceholder = isDark ? 'text-gray-500' : 'text-slate-400';

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    const systemPrompt = `You are a Compliance Officer responsible for preparing a CERT-In / NCIIPC incident report. Your primary duty is to anonymize all citizen PII (like names, contact details, specific monetary losses beyond category, and precise geographical addresses) while retaining all forensic data (IOCs, category, severity). Generate a formal report summary and a log of all redactions made. Output ONLY a single JSON object matching the schema.`;
    const userQuery = `Case Details:\nID: ${caseDetails.id}\nCategory: ${caseDetails.category}\nTPR: ${caseDetails.tpr}\nSector: ${caseDetails.sector}\nDescription: ${caseDetails.description}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sanitizedSummary: {
              type: "STRING",
              description: "A formal, compliance-ready summary of the incident, with all PII replaced by identifiers like [CITIZEN ID] or [AMOUNT REDACTED]."
            },
            redactionLog: {
              type: "ARRAY",
              description: "A list of PII elements that were detected and anonymized.",
              items: { type: "STRING" }
            }
          }
        }
      }
    };

    try {
      const response = await fetchWithBackoff(GEMINI_API_URL + API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        setReportData(parsed);
      } else {
        throw new Error('Received empty response from AI.');
      }
    } catch (e) {
      console.error("Gemini API Error:", e);
      setError("AI Compliance Report generation failed.");
    } finally {
      setIsLoading(false);
    }
  }, [caseDetails]);

  return (
    <GlassCard className="space-y-4" theme={theme}>
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-violet-400">Policy-Compliant Report</h4>
        <PrimaryButton
          icon={Upload}
          onClick={generateReport}
          disabled={isLoading}
          className="text-sm px-4 py-2"
          theme={theme}
        >
          {isLoading ? <Loader size={18} className="animate-spin" /> : "✨ Generate Compliant Report"}
        </PrimaryButton>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="pt-2 space-y-4">
        {reportData ? (
          <>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/70' : 'bg-slate-100'}`}>
              <h5 className={`font-semibold text-sm ${textPrimary} mb-1`}>Sanitized Report Summary (Ready for External Sharing):</h5>
              <p className={`text-sm ${textSecondary}`}>{reportData.sanitizedSummary}</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <span className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Redaction Log:</span>
              {reportData.redactionLog.map((log, index) => (
                <InnovationChip key={index} icon={Code} label={log} color={APP_CONFIG.colors.amber} />
              ))}
            </div>
          </>
        ) : (
          <p className={`text-sm ${textPlaceholder}`}>Click "Generate Compliant Report" to instantly anonymize PII and prepare a formal report for regulatory submission.</p>
        )}
      </div>
    </GlassCard>
  );
};


// --- PAGE COMPONENTS ---

// 0. Auth Page (Login/Signup)
const AuthPage = ({ onLogin, theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'citizen' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md space-y-6" theme={theme}>
        <div className="text-center space-y-2">
          <h2 className={`text-2xl font-bold ${textPrimary}`}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className={textSecondary}>{isLogin ? 'Enter your credentials to access.' : 'Join to report and track incidents.'}</p>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-gray-500" />
                <input required name="name" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-slate-300'} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-sky-500 outline-none`} />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
              <input required name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-slate-300'} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-sky-500 outline-none`} />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
              <input required name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-slate-300'} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-sky-500 outline-none`} />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-slate-300'} ${inputBg} ${textPrimary} focus:ring-2 focus:ring-sky-500 outline-none`}>
                <option value="citizen">Citizen</option>
                <option value="official">Cyber Official</option>
              </select>
            </div>
          )}

          <PrimaryButton type="submit" className="w-full" disabled={isLoading} theme={theme}>
            {isLoading ? <Loader size={20} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </PrimaryButton>
        </form>

        <div className="text-center text-sm">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sky-400 hover:underline">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

// 1. Landing / Hero
const LandingPage = ({ setPage, theme }) => {
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-slate-600';

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background Visual: Layered 3D Grid & Motion Chips (Simulated with Tailwind/CSS) */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="w-full h-full bg-grid-sky-500/[0.1] [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />
      </div>

      {/* Hero Content */}
      <div className="z-10 max-w-4xl space-y-8">
        <h1
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          className={`text-6xl md:text-8xl font-extrabold ${textPrimary} leading-tight transition-all duration-500`}
        >
          PrioritizeIT
        </h1>
        <p className={`text-xl md:text-2xl ${textSecondary} max-w-3xl mx-auto`}>
          {APP_CONFIG.tagline}
        </p>

        {/* Primary CTA for Citizen Portal */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 justify-center pt-4">
          <PrimaryButton icon={FormInput} onClick={() => setPage('intake')} theme={theme}>
            Report an Incident
          </PrimaryButton>
        </div>

        {/* Trust Badges Row */}
        <div className="pt-16 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <InnovationChip icon={Layers} label="Decentralized Storage" color={APP_CONFIG.colors.violet} />
          <InnovationChip icon={Lock} label="Blockchain Integrity" color={APP_CONFIG.colors.teal} />
          <InnovationChip icon={Cpu} label="AI Scoring" color={APP_CONFIG.colors.sky} />
          <InnovationChip icon={Globe} label="Govt. Interoperability" color={APP_CONFIG.colors.amber} />
        </div>
      </div>
    </div>
  );
}

// 2. Citizen Intake (Voice + Form)
const CitizenIntake = ({ setPage, theme }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("I was on WhatsApp when I received a call from someone claiming to be a bank manager. They asked for my UPI PIN. They mentioned the transaction ID 40019203...");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSealed, setIsSealed] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiIOCs, setAiIOCs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';
  const inputBorder = isDark ? 'border-sky-600/30' : 'border-slate-300';


  // Simplified Recording Toggle
  const toggleRecording = () => {
    setIsRecording(prev => !prev);
    if (!isRecording) {
      setTimeout(() => {
        setTranscript("I was on WhatsApp when I received a call from someone claiming to be a bank manager. They asked for my UPI PIN. They mentioned the transaction ID 40019203...");
        setIsRecording(false);
      }, 3000); // Simulate 3s recording
    }
  };

  // Simplified File Upload/Sealing
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFiles([{ name: file.name, hash: 'Pending' }]);
      setIsSealed(false);
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, hash: '0x32a76f...5c1b' } : f));
        setIsSealed(true);
      }, 1500); // Simulate blockchain sealing
    }
  };

  const submitCase = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Construct case payload
    // Note: For this demo, we are using the mock TPR and status. In a real app, backend assigns this.
    const newCase = {
      title: "Incident Report", // In a real app this might be generated or input
      description: transcript,
      category: document.getElementById('type').value,
      source: 'Form',
      sector: 'Retail', // Mock
      city: 'Unknown', // Mock
      tpr: 50, // Mock initial score
      evidence: uploadedFiles
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCase)
      });

      if (!res.ok) throw new Error('Submission failed');

      alert('Case submitted successfully!');
      setPage('success');
    } catch (err) {
      console.error(err);
      alert('Failed to submit case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <h2 className={`text-3xl font-bold ${textPrimary} border-b ${isDark ? 'border-gray-700' : 'border-slate-300'} pb-2`}>Report an Incident (Citizen Intake)</h2>

      {/* Voice-First Card */}
      <GlassCard className="!p-8 space-y-6" theme={theme}>
        <h3 className="text-xl font-semibold text-sky-400 flex items-center"><Mic size={24} className="mr-3" /> 1. Voice/Text Complaint</h3>
        <p className={textSecondary}>Hold the button to record your complaint, or type the details below.</p>

        {/* Record Button & Waveform (Simulated) */}
        <div className="flex flex-col items-center space-y-4">
          <div
            onClick={toggleRecording}
            className={`
              w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300
              ${isRecording ? 'bg-red-600 ring-8 ring-red-600/50' : `bg-sky-500 hover:ring-8 ring-sky-500/30`}
              active:scale-95
            `}
          >
            <Mic size={32} className={`text-white ${isRecording ? 'animate-pulse' : ''}`} />
          </div>
          <p className={`font-semibold ${isRecording ? 'text-red-400' : textSecondary}`}>
            {isRecording ? 'Recording... Release to stop' : 'Hold to record'}
          </p>
        </div>

        {/* Real-time Transcription Chip */}
        <div className="pt-4 space-y-2">
          <label className={`block text-sm font-medium ${textSecondary}`}>Editable Transcript (AI-Generated)</label>
          <textarea
            value={transcript}
            onChange={(e) => { setTranscript(e.target.value); setAiSummary(''); setAiIOCs([]); }}
            className={`w-full min-h-[120px] ${inputBg} border ${inputBorder} p-3 rounded-lg ${textPrimary} focus:ring-sky-500 focus:border-sky-500 transition-colors`}
            placeholder="Start typing your complaint details..."
          />

          <TranscriptAnalyzer
            transcript={transcript}
            setSummary={setAiSummary}
            setIocs={setAiIOCs}
            isSubmitting={isSubmitting}
            theme={theme}
          />

          {/* AI Structured Summary Output */}
          {aiSummary && (
            <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-violet-900/30 border-violet-500/50' : 'bg-violet-100 border-violet-300'} border space-y-2`}>
              <h4 className={`text-sm font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'} flex items-center`}><Cpu size={16} className='mr-2' /> AI Structured Analysis:</h4>
              <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>Summary: {aiSummary}</p>
              <div className='flex flex-wrap gap-2 pt-1'>
                {aiIOCs.map((ioc, index) => (
                  <InnovationChip key={index} icon={Code} label={ioc} color={APP_CONFIG.colors.teal} />
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Smart Form & Evidence Uploader */}
      <GlassCard theme={theme}>
        <form onSubmit={submitCase} className="space-y-6">
          <h3 className={`text-xl font-semibold text-violet-400 flex items-center`}><FormInput size={24} className="mr-3" /> 2. Incident Details</h3>

          {/* Incident Type */}
          <div>
            <label htmlFor="type" className={`block text-sm font-medium ${textSecondary} mb-1`}>Incident Type</label>
            <select id="type" className={`w-full ${inputBg} border ${isDark ? 'border-gray-700' : 'border-slate-300'} p-3 rounded-lg ${textPrimary} transition-colors`}>
              <option className={isDark ? 'bg-slate-900' : 'bg-white'}>Phishing</option>
              <option className={isDark ? 'bg-slate-900' : 'bg-white'}>Ransomware</option>
              <option className={isDark ? 'bg-slate-900' : 'bg-white'}>UPI Fraud</option>
              <option className={isDark ? 'bg-slate-900' : 'bg-white'}>Account Takeover</option>
            </select>
          </div>

          {/* Urgency Slider (Simplified) */}
          <div>
            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Urgency (1 = Low, 5 = Critical)</label>
            <input type="range" min="1" max="5" defaultValue="3" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>

          {/* Evidence Uploader */}
          <div className={`border-t ${isDark ? 'border-gray-700' : 'border-slate-300'} pt-6 space-y-4`}>
            <h4 className="text-lg font-medium text-teal-400 flex items-center"><Upload size={20} className="mr-2" /> 3. Evidence Uploader</h4>
            <p className={textSecondary}>Upload screenshots or documents. Evidence is secured with a tamper-proof Blockchain Seal.</p>
            <label className={`block w-full text-center py-4 border-2 border-dashed border-sky-500/50 rounded-lg cursor-pointer transition duration-150 ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
              <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*, application/pdf" />
              <span className="text-sky-400 font-semibold">Click to upload or drag files here</span>
            </label>

            {uploadedFiles.map((file, index) => (
              <div key={index} className={`flex justify-between items-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'} p-3 rounded-lg`}>
                <span className={textPrimary}>{file.name}</span>
                <div className="flex items-center space-x-2">
                  <InnovationChip
                    icon={isSealed ? Lock : Activity}
                    label={isSealed ? 'Blockchain Sealed' : 'Sealing...'}
                    color={isSealed ? APP_CONFIG.colors.success : APP_CONFIG.colors.teal}
                  />
                  {isSealed && <span className={`text-xs ${textSecondary}`}>{file.hash}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Final Submission */}
          <div className={`flex justify-between items-center border-t ${isDark ? 'border-gray-700' : 'border-slate-300'} pt-6`}>
            <p className={`text-xs ${textSecondary}`}>By submitting, you consent to our privacy policy and the evidence sealing process.</p>
            <PrimaryButton type="submit" icon={Check} className="px-8" disabled={isSubmitting} theme={theme}>
              {isSubmitting ? <Loader size={20} className="animate-spin" /> : 'Submit Complaint'}
            </PrimaryButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

// 3. Investigator Console (Dashboard)
const DashboardView = ({ cases, setPage, setCaseDetail, isDemoMode, theme }) => {
  const [filter, setFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';
  const inputPlaceholder = isDark ? 'placeholder-gray-500' : 'placeholder-slate-400';
  const cardBorder = isDark ? 'border-gray-700' : 'border-slate-300';


  const filteredCases = useMemo(() => {
    let result = cases;

    if (filter !== 'All') {
      result = result.filter(c => c.status === filter);
    }
    if (severityFilter) {
      const minTpr = severityFilter === 'Critical' ? 80 : severityFilter === 'High' ? 60 : 0;
      const maxTpr = severityFilter === 'Critical' ? 100 : severityFilter === 'High' ? 79 : 59;
      result = result.filter(c => c.tpr >= minTpr && c.tpr <= maxTpr);
    }
    if (searchTerm) {
      result = result.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return result.sort((a, b) => b.tpr - a.tpr); // Sort by TPR descending
  }, [cases, filter, severityFilter, searchTerm]);

  const kpis = useMemo(() => {
    const newCases = cases.filter(c => c.status === 'New').length;
    const avgTpr = (cases.reduce((sum, c) => sum + c.tpr, 0) / cases.length) || 0;
    const highRisk = cases.filter(c => c.tpr > 80).length;
    return { newCases, avgTpr: avgTpr.toFixed(0), highRisk };
  }, [cases]);

  // Mock Chart Data
  const sourceData = useMemo(() => {
    const counts = cases.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(source => ({ source, count: counts[source] }));
  }, [cases]);

  const categoryData = useMemo(() => {
    const counts = cases.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(category => ({ category, count: counts[category] })).sort((a, b) => b.count - a.count);
  }, [cases]);


  const statusFilters = ['All', 'New', 'Triaged', 'Ongoing', 'Closed'];
  const severityFilters = ['All', 'Critical', 'High', 'Medium'];

  const handleViewDetail = (caseItem) => {
    setCaseDetail(caseItem);
    setPage('detail');
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h2 className={`text-3xl font-bold ${textPrimary} border-b ${cardBorder} pb-2 flex items-center justify-between`}>
        Investigator Console Overview
        <span className={`text-sm font-normal px-3 py-1 rounded-full ${isDemoMode ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
          {isDemoMode ? 'Demo Mode Active' : 'Live Data'}
        </span>
      </h2>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="space-y-2" theme={theme}>
          <p className={`text-sm ${textSecondary} flex items-center`}><Activity size={16} className="mr-2 text-sky-400" /> New Cases (24h)</p>
          <p className="text-4xl font-bold text-sky-400 transition duration-500">{kpis.newCases}</p>
        </GlassCard>
        <GlassCard className="space-y-2" theme={theme}>
          <p className={`text-sm ${textSecondary} flex items-center`}><TrendingUp size={16} className="mr-2 text-violet-400" /> Avg TPR</p>
          <p className="text-4xl font-bold text-violet-400 transition duration-500">{kpis.avgTpr}</p>
        </GlassCard>
        <GlassCard className="space-y-2" theme={theme}>
          <p className={`text-sm ${textSecondary} flex items-center`}><AlertTriangle size={16} className="mr-2 text-red-500" /> High-Risk Cases</p>
          <p className="text-4xl font-bold text-red-500 transition duration-500">{kpis.highRisk}</p>
        </GlassCard>
        <GlassCard className="space-y-2" theme={theme}>
          <p className={`text-sm ${textSecondary} flex items-center`}><ChevronRight size={16} className="mr-2 text-teal-400" /> Time-to-Triage</p>
          <p className="text-4xl font-bold text-teal-400 transition duration-500">4.5h</p>
        </GlassCard>
      </div>

      {/* Charts and Map Mock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intake Sources Donut (Mock) */}
        <GlassCard className="col-span-1 space-y-4" theme={theme}>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>Intake Sources</h3>
          <div className="h-40 flex items-center justify-center">
            <BarChart3 size={90} className="text-sky-500/50" />
            <div className={`absolute flex flex-col text-sm space-y-1 ${textSecondary}`}>
              {sourceData.map(d => (
                <div key={d.source} className="flex justify-between w-24">
                  <span>{d.source}:</span> <span className={`font-medium ${textPrimary}`}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Sector-wise Distribution (Mock) */}
        <GlassCard className="col-span-1 space-y-4" theme={theme}>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>Top Categories</h3>
          <div className="space-y-3 h-40 pt-4">
            {categoryData.slice(0, 3).map((d, i) => (
              <div key={d.category} className="flex items-center space-x-2">
                <BarChartHorizontal size={16} className={i === 0 ? 'text-red-500' : i === 1 ? 'text-amber-500' : 'text-sky-500'} />
                <span className={`text-sm ${textSecondary}`}>{d.category}</span>
                <div className={`flex-grow h-2 rounded-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                  <div
                    style={{ width: `${(d.count / cases.length) * 100}%`, backgroundColor: getTprColor(90 - i * 15) }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* IOC Network Mini-Graph Mock */}
        <GlassCard className="col-span-1 space-y-4" theme={theme}>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>IOC Network Graph</h3>
          <div className={`h-40 flex items-center justify-center relative rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <Layers size={100} className="text-violet-500/50 animate-pulse" />
            <div className={`absolute text-center ${textSecondary}`}>
              <p className="text-sm">Mock Graph:</p>
              <p className={`font-bold ${textPrimary}`}>15 IPs, 8 Domains, 4 Hashes</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Case List Filters and Search */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
        <input
          type="text"
          placeholder="Search Case ID or Title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full md:w-1/3 ${inputBg} border ${cardBorder} p-3 rounded-lg ${textPrimary} ${inputPlaceholder}`}
        />

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-sm rounded-full transition duration-150 ${filter === s ? 'bg-sky-500 text-black font-semibold' : `${isDark ? 'bg-slate-700/50 text-gray-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}`}
            >
              {s} ({s === 'All' ? cases.length : cases.filter(c => c.status === s).length})
            </button>
          ))}
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {severityFilters.map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s === 'All' ? null : s)}
              className={`px-4 py-2 text-sm rounded-full transition duration-150 ${severityFilter === s ? 'bg-violet-500 text-black font-semibold' : `${isDark ? 'bg-slate-700/50 text-gray-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Case Cards Grid */}
      <div className="space-y-4">
        {filteredCases.length === 0 && (
          <GlassCard className="text-center py-10" theme={theme}>
            <Zap size={48} className="mx-auto text-amber-500 mb-3" />
            <p className={`text-xl font-semibold ${textPrimary}`}>No incidents match your filters.</p>
            <p className={textSecondary}>Try expanding time or severity, or check if the Demo Mode is active.</p>
          </GlassCard>
        )}

        {filteredCases.map((caseItem) => (
          <GlassCard key={caseItem.id} className="flex flex-col md:flex-row items-start md:items-center justify-between transition-shadow hover:shadow-sky-400/30" theme={theme}>
            {/* Left Section: ID, Title, Category */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-3/5">
              <p className="text-sm font-semibold text-sky-400 min-w-[120px]">{caseItem.id}</p>
              <div className="space-y-1">
                <h4 className={`text-lg font-bold ${textPrimary} flex items-center`}>{caseItem.title}</h4>
                <p className={`text-xs ${textSecondary} flex items-center space-x-2`}>
                  <CornerDownRight size={12} className="text-violet-400" />
                  <span>{caseItem.category} - {caseItem.sector} - {caseItem.city}</span>
                </p>
              </div>
            </div>

            {/* Right Section: Badges, Status, Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-6 pt-4 md:pt-0 w-full md:w-2/5 justify-end">
              <div className="flex items-center space-x-2">
                <TPRBadge tpr={caseItem.tpr} size="md" />
                <span className={`text-sm font-medium rounded-full px-3 py-1 ${caseItem.status === 'New' ? 'bg-violet-500/20 text-violet-300' :
                  caseItem.status === 'Triaged' ? 'bg-sky-500/20 text-sky-300' :
                    caseItem.status === 'Ongoing' ? 'bg-teal-500/20 text-teal-300' :
                      'bg-gray-500/20 text-gray-300'
                  }`}>
                  {caseItem.status}
                </span>
              </div>
              <div className="flex space-x-2">
                {caseItem.isVoice && <InnovationChip icon={Mic} label="Voice Intake" color={APP_CONFIG.colors.teal} />}
                {caseItem.isBlockchain && <InnovationChip icon={Lock} label="Sealed" color={APP_CONFIG.colors.success} />}
                {caseItem.isAnomaly && <InnovationChip icon={AlertTriangle} label="AI Anomaly" color={APP_CONFIG.colors.danger} />}
              </div>
              <button
                className={`text-sky-400 hover:${textPrimary} transition duration-150 text-sm font-medium`}
                onClick={() => handleViewDetail(caseItem)}
              >
                View Detail &rarr;
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

    </div>
  );
};

// 4. Geospatial View
const GeoSpatialView = ({ theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-600';
  const iframeStyle = isDark ?
    'filter: grayscale(100%) invert(92%) contrast(80%) sepia(20%) hue-rotate(180deg) brightness(85%);'
    : 'filter: grayscale(10%);';

  // Mock data for display
  const cities = [
    { name: "Chennai", count: 3, color: APP_CONFIG.colors.danger },
    { name: "Mumbai", count: 4, color: APP_CONFIG.colors.amber },
    { name: "Delhi", count: 5, color: APP_CONFIG.colors.sky },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h2 className={`text-3xl font-bold ${textPrimary} border-b ${isDark ? 'border-gray-700' : 'border-slate-300'} pb-2`}>
        Geospatial View (India)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Panel (Realism via iFrame) */}
        <GlassCard className="col-span-1 lg:col-span-3 h-[70vh] p-0 overflow-hidden" theme={theme}>
          <iframe
            title="India Cyber Threat Map"
            // Using a high-contrast style map to simulate a real GIS view.
            // Coordinates centered near India: 20.5937, 78.9629
            src="https://maps.google.com/maps?q=India&t=&z=5&ie=UTF8&iwloc=&output=embed"
            style={{ border: 0, width: '100%', height: '100%', borderRadius: '12px', ...iframeStyle }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </GlassCard>

        {/* Filters and Heatmap Legend */}
        <div className="col-span-1 lg:col-span-1 space-y-6">
          <GlassCard theme={theme} className='space-y-4'>
            <h3 className={`text-xl font-semibold ${textPrimary} flex items-center`}><MapPin size={20} className='mr-2 text-red-400' /> Live Heatmap Legend</h3>
            <div className="space-y-3">
              {cities.map(city => (
                <div key={city.name} className='flex items-center justify-between text-sm'>
                  <div className='flex items-center space-x-2'>
                    <div style={{ backgroundColor: city.color }} className={`w-3 h-3 rounded-full animate-pulse`} />
                    <span className={textSecondary}>{city.name} Clusters</span>
                  </div>
                  <span className={`font-bold ${textPrimary}`}>{city.count} Cases</span>
                </div>
              ))}
            </div>
            <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-slate-300'}`}>
              <p className={`text-sm font-semibold text-amber-400`}>Filters:</p>
              <p className={`text-xs ${textSecondary}`}>Sector (BFSI, Gov), Severity, Time Range (Mocked)</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};


// 7. Case Detail (Forensics View)
const CaseDetail = ({ caseDetail, setPage, theme }) => {
  if (!caseDetail) return null;

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-slate-700';
  const textTertiary = isDark ? 'text-gray-400' : 'text-slate-600';
  const borderPrimary = isDark ? 'border-gray-700/50' : 'border-slate-300';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <button onClick={() => setPage('console')} className="text-sky-400 hover:text-white transition duration-150 flex items-center mb-6">
        <ChevronRight size={20} className="transform rotate-180 mr-2" /> Back to Console
      </button>

      {/* Header */}
      <GlassCard className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0" theme={theme}>
        <div className='space-y-1'>
          <h2 className={`text-3xl font-bold ${textPrimary} flex items-center space-x-3`}>
            {caseDetail.title}
          </h2>
          <p className="text-lg text-sky-400 font-mono">{caseDetail.id}</p>
        </div>
        <div className="flex items-center space-x-4">
          <TPRBadge tpr={caseDetail.tpr} size="lg" />
          <span className={`text-lg font-medium rounded-full px-4 py-1 ${caseDetail.status === 'New' ? 'bg-violet-500/20 text-violet-300' :
            caseDetail.status === 'Triaged' ? 'bg-sky-500/20 text-sky-300' :
              caseDetail.status === 'Ongoing' ? 'bg-teal-500/20 text-teal-300' :
                'bg-gray-500/20 text-gray-300'
            }`}>
            {caseDetail.status}
          </span>
        </div>
      </GlassCard>

      {/* Body: Analysis & Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="space-y-4" theme={theme}>
            <h4 className="text-lg font-semibold text-violet-400">Incident Summary</h4>
            <p className={`text-sm ${textSecondary}`}>{caseDetail.description}</p>
            <div className={`flex flex-wrap gap-3 pt-3 border-t ${borderPrimary}`}>
              <InnovationChip icon={Briefcase} label={caseDetail.sector} color={APP_CONFIG.colors.violet} />
              <InnovationChip icon={Globe} label={caseDetail.city} color={APP_CONFIG.colors.teal} />
              <InnovationChip icon={MessageSquare} label={`Source: ${caseDetail.source}`} color={APP_CONFIG.colors.sky} />
            </div>
          </GlassCard>

          <CaseActionPlan caseDetails={caseDetail} theme={theme} />
          <XaiExplanation caseDetails={caseDetail} theme={theme} />
        </div>

        {/* Side Panel - Evidence Mock & New Report Generator */}
        <div className="lg:col-span-1 space-y-6">

          {/* Compliance Report Generator (New LLM Feature) */}
          <ComplianceReportGenerator caseDetails={caseDetail} theme={theme} />

          <GlassCard className="space-y-4 border-l-4 border-l-green-500" theme={theme}>
            <h4 className={`text-lg font-semibold ${textPrimary} flex items-center`}><Lock size={20} className="mr-2 text-green-500" /> Evidence Integrity</h4>
            <p className={`text-xs ${textTertiary}`}>Immutable chain-of-custody log.</p>
            <div className="space-y-2 text-sm">
              <p className={textSecondary}>Hash: <span className="font-mono text-sky-400 text-xs">0x1a3b...c5f8</span></p>
              <p className={textSecondary}>Block Index: <span className="font-mono text-sky-400 text-xs">1239845</span></p>
              <p className={textSecondary}>Files: <span className={`font-medium ${textPrimary}`}>4 attached files</span></p>
            </div>
          </GlassCard>

          <PrimaryButton icon={Zap} className="w-full" theme={theme}>
            Assign to Investigator
          </PrimaryButton>
          {/* The old Export Report button is replaced by the ComplianceReportGenerator */}
        </div>
      </div>
    </div>
  );
}

// 8. Timelines, Reports, Settings (Mock Views)
const MockView = ({ title, icon: Icon, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-600';
  return (
    <div className="p-4 md:p-8 space-y-8">
      <h2 className={`text-3xl font-bold ${textPrimary} border-b ${isDark ? 'border-gray-700' : 'border-slate-300'} pb-2`}>
        {title}
      </h2>
      <GlassCard theme={theme} className='text-center py-20 space-y-4'>
        <Icon size={64} className={`mx-auto ${isDark ? 'text-sky-400/50' : 'text-sky-600/50'}`} />
        <p className={`text-xl font-semibold ${textPrimary}`}>{title} Module (In Development)</p>
        <p className={textSecondary}>This view will feature interactive {title.toLowerCase()} and dedicated management dashboards.</p>
      </GlassCard>
    </div>
  )
}

// --- MAIN APP COMPONENT ---
const App = () => {
  const [page, setPage] = useState('landing');
  const [caseDetail, setCaseDetail] = useState(initialDemoCases[0]); // Default to first case for detail view
  const [isDemoMode, setIsDemoMode] = useState(false); // Default false for real backend
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [portal, setPortal] = useState('citizen'); // 'citizen' or 'investigator'
  const [theme, setTheme] = useState('dark'); // New theme state

  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Initialize data
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  // Fetch cases when in console view and logged in
  useEffect(() => {
    if (token && (page === 'console' || page === 'detail')) {
      fetchCases();
    }
  }, [page, token]);

  const fetchCases = async () => {
    if (isDemoMode) {
      setCases(initialDemoCases);
      return;
    }
    try {
      const res = await fetch('/api/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCases(data);
      }
    } catch (err) {
      console.error("Failed to fetch cases", err);
    }
  };

  const handleLogin = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userData.token);
    setUser(userData);

    if (userData.role === 'official') {
      setPortal('investigator');
      setPage('console');
    } else {
      setPortal('citizen');
      setPage('landing');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPage('landing');
    setPortal('citizen');
  };

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
    if (!isDemoMode) { // Turning ON demo mode
      setCases(initialDemoCases);
    } else { // Turning OFF
      fetchCases();
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Centralized page change handler to manage portal state
  const handlePageChange = (newPageId) => {
    // Auth Check for Protected Routes
    if (['console', 'map', 'timelines', 'reports', 'settings', 'detail'].includes(newPageId)) {
      if (!user) {
        setPage('auth');
        setIsNavOpen(false);
        return;
      }
    }

    if (['landing', 'intake', 'success'].includes(newPageId)) {
      setPortal('citizen');
    } else if (newPageId === 'auth') {
      // Keep current portal or default
    } else {
      setPortal('investigator');
    }
    setPage(newPageId);
    setIsNavOpen(false);
  };

  const citizenNavItems = [
    { id: 'landing', label: 'Home', icon: Shield },
    { id: 'intake', label: 'Report Incident', icon: FormInput },
  ];

  const investigatorNavItems = [
    { id: 'console', label: 'Overview', icon: Compass },
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'timelines', label: 'Timelines (Mock)', icon: Clock },
    { id: 'reports', label: 'Reports (Mock)', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const NavLink = ({ item }) => {
    const isActive = (item.id === page) || (item.id === 'console' && page === 'detail');
    const isDark = theme === 'dark';
    return (
      <button
        onClick={() => handlePageChange(item.id)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${isActive
            ? `text-sky-400 bg-sky-500/10 shadow-lg shadow-sky-400/20`
            : `${isDark ? 'text-gray-300 hover:text-white hover:bg-slate-700/50' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'}`
          }
        `}
      >
        <item.icon size={20} />
        <span>{item.label}</span>
      </button>
    );
  };

  const renderPage = useCallback(() => {
    switch (page) {
      case 'intake':
        return <CitizenIntake setPage={handlePageChange} theme={theme} />;
      case 'console':
        return <DashboardView cases={cases} setPage={handlePageChange} setCaseDetail={setCaseDetail} isDemoMode={isDemoMode} theme={theme} />;
      case 'map':
        return <GeoSpatialView theme={theme} />;
      case 'timelines':
        return <MockView title="Timelines & Correlations" icon={Clock} theme={theme} />;
      case 'reports':
        return <MockView title="Reports Module" icon={BarChart3} theme={theme} />;
      case 'settings':
        return <MockView title="Settings & Roles" icon={Settings} theme={theme} />;
      case 'detail':
        return <CaseDetail caseDetail={caseDetail} setPage={handlePageChange} theme={theme} />;
      case 'success':
        return (
          <div className="max-w-xl mx-auto p-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
            <GlassCard glow theme={theme}>
              <Check size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Incident Reported Successfully!</h2>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'} mt-2`}>Your Case ID is: <span className="text-sky-400 font-mono">PIT-2025-0103-B</span></p>
              <p className={` ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'} mt-4`}>We've sealed the evidence on-chain and assigned a Threat Priority Rank (TPR). You can track the status using your Case ID.</p>
              <PrimaryButton icon={Shield} className="mt-8" onClick={() => handlePageChange('landing')} theme={theme}>
                Back to Home
              </PrimaryButton>
            </GlassCard>
          </div>
        );
      case 'landing':
        return <LandingPage setPage={handlePageChange} theme={theme} />;
      case 'auth':
        return <AuthPage onLogin={handleLogin} theme={theme} />;
      default:
        return <LandingPage setPage={handlePageChange} theme={theme} />;
    }
  }, [page, cases, isDemoMode, caseDetail, theme]);

  const CurrentNavItems = portal === 'citizen' ? citizenNavItems : investigatorNavItems;
  const isDark = theme === 'dark';
  const themeBg = isDark ? APP_CONFIG.colors['dark-bg'] : APP_CONFIG.colors['light-bg'];
  const themeText = isDark ? APP_CONFIG.colors['dark-text'] : APP_CONFIG.colors['light-text'];
  const themeGlass = isDark ? APP_CONFIG.colors['dark-glass'] : APP_CONFIG.colors['light-glass'];
  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <div
      style={{
        backgroundColor: themeBg,
        color: themeText,
        fontFamily: "'Inter', sans-serif",
      }}
      className="min-h-screen transition-colors duration-500"
    >
      {/* Global Header/Navigation */}
      <header className="sticky top-0 z-50">
        <div
          style={{ backgroundColor: themeGlass }}
          className={`backdrop-blur-lg border-b ${isDark ? 'border-white/10' : 'border-slate-300'} shadow-xl shadow-black/30 p-4`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo and Portal Title */}
            <div className="flex items-center space-x-4">
              <div
                className="text-2xl font-extrabold cursor-pointer"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: themeText }}
                onClick={() => handlePageChange('landing')}
              >
                <span className="text-sky-400">P</span>rioritize<span className="text-sky-400">IT</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${portal === 'citizen' ? 'bg-sky-500/20 text-sky-300' : 'bg-violet-500/20 text-violet-300'}`}>
                {portal === 'citizen' ? 'Citizen Portal' : 'Investigator Portal'}
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-6">
              {CurrentNavItems.map(item => <NavLink key={item.id} item={item} />)}

              {/* Portal Switch / Theme Toggle / Settings */}
              <div className='flex items-center space-x-4'>
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition-all duration-300 hover:scale-[1.03] ${isDark ? 'bg-slate-700/50 text-white' : 'bg-slate-200 text-slate-800'}`}
                  title="Toggle Theme"
                >
                  <ThemeIcon size={18} />
                </button>

                {portal === 'citizen' ? (
                  <PrimaryButton icon={Briefcase} onClick={() => handlePageChange('console')} secondary theme={theme}>
                    Investigator Login
                  </PrimaryButton>
                ) : (
                  <>
                    <div
                      onClick={toggleDemoMode}
                      className={`flex items-center space-x-2 p-2 rounded-full cursor-pointer transition-all duration-300 ${isDemoMode ? 'bg-amber-500/20' : isDark ? 'bg-gray-700/50' : 'bg-slate-200'} hover:scale-[1.03]`}
                    >
                      <Settings size={18} className={`${isDemoMode ? 'text-amber-300' : isDark ? 'text-gray-400' : 'text-slate-600'}`} />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'} hidden lg:inline`}>{isDemoMode ? 'Demo Mode ON' : 'Real Data'}</span>
                    </div>
                    <PrimaryButton icon={LogOut} onClick={handleLogout} secondary className='!px-4 !py-2' theme={theme}>
                      Logout
                    </PrimaryButton>
                  </>
                )}
                {!user && portal === 'citizen' && (
                  <PrimaryButton icon={User} onClick={() => setPage('auth')} className='!px-4 !py-2' theme={theme}>
                    Login
                  </PrimaryButton>
                )}
              </div>

            </nav>

            {/* Mobile Menu Button */}
            <button className={`md:hidden ${themeText}`} onClick={() => setIsNavOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 ${isDark ? 'bg-slate-900' : 'bg-white'} z-[60] shadow-2xl transition-transform duration-300 transform ${isNavOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}
      >
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsNavOpen(false)} className={themeText}>
              <X size={24} />
            </button>
          </div>
          <button
            onClick={toggleTheme}
            className={`flex items-center space-x-3 p-3 rounded-lg w-full transition-all duration-300 ${isDark ? 'bg-slate-700/50 text-white' : 'bg-slate-200 text-slate-800'}`}
          >
            <ThemeIcon size={20} />
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          {CurrentNavItems.map(item => <NavLink key={item.id} item={item} />)}
          {portal === 'citizen' ? (
            <PrimaryButton icon={Briefcase} onClick={() => handlePageChange('console')} secondary className='w-full' theme={theme}>
              Investigator Login
            </PrimaryButton>
          ) : (
            <>
              <div
                onClick={toggleDemoMode}
                className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all duration-300 ${isDemoMode ? 'bg-amber-500/20' : isDark ? 'bg-gray-700/50' : 'bg-slate-200'}`}
              >
                <Settings size={20} className={`${isDemoMode ? 'text-amber-300' : isDark ? 'text-gray-400' : 'text-slate-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Demo Mode: {isDemoMode ? 'ON' : 'OFF'}</span>
              </div>
              <PrimaryButton icon={LogOut} onClick={handleLogout} secondary className='w-full' theme={theme}>
                Logout
              </PrimaryButton>
            </>
          )}
          {!user && portal === 'citizen' && (
            <PrimaryButton icon={User} onClick={() => setPage('auth')} className='w-full' theme={theme}>
              Login
            </PrimaryButton>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto min-h-[calc(100vh-64px)] py-4">
        {renderPage()}
      </main>

      {/* Footer Ribbon */}
      <footer className={`w-full ${isDark ? 'bg-slate-900/50 border-t border-white/10' : 'bg-slate-100 border-t border-slate-300'} mt-8 py-3 text-center text-xs ${isDark ? 'text-gray-500' : 'text-slate-600'}`}>
        SDG Impact: SDG 8 (Operational Efficiency) and SDG 9 (Secure Digital Infrastructure)
      </footer>
    </div>
  );
};

export default App;