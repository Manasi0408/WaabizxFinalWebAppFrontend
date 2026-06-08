import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { fetchActivePlans } from "../services/planService";

const PLAN_PRICING = {
  monthly: { basic: 1245, pro: 3040, enterprise: 6490 },
  quarterly: { basic: 3540, pro: 8650, enterprise: 16245 },
  yearly: { basic: 13200, pro: 32500, enterprise: 69000 },
};

const PLAN_DISCOUNT_LABEL = {
  monthly: "",
  quarterly: "(5% Off)",
  yearly: "(10% Off)",
};

const PLAN_FEATURES = {
  basic: ["Upto 1 Agent", "Upto 5 Custom Attributes", "Template Message APIs", "1200 messages/month"],
  pro: ["All in Basic", "Upto 10 Tags", "Campaign click tracking", "Project APIs"],
  enterprise: ["Unlimited tags", "Dedicated account manager", "Highest messaging speed", "Upto 10GB cloud storage"],
};

const buildFallbackCatalog = () =>
  ["basic", "pro", "enterprise"].map((slug, idx) => ({
    id: idx + 1,
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    price_monthly: PLAN_PRICING.monthly[slug],
    price_quarterly: PLAN_PRICING.quarterly[slug],
    price_yearly: PLAN_PRICING.yearly[slug],
    users_limit: slug === "basic" ? 1 : slug === "pro" ? 5 : 50,
    messages_limit: slug === "basic" ? 1200 : slug === "pro" ? 10000 : 100000,
    features: PLAN_FEATURES[slug] || [],
    is_active: true,
    sort_order: idx + 1,
  }));

const WCC_GST_RATE = 0.18;

const wccGstAmount = (base) => Math.round(Math.max(0, Number(base) || 0) * WCC_GST_RATE * 100) / 100;

const wccPayableTotal = (base) => {
  const b = Math.max(0, Number(base) || 0);
  return Math.round((b + wccGstAmount(b)) * 100) / 100;
};

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function PlanGstBreakdown({ subtotal }) {
  const base = Math.max(0, Number(subtotal) || 0);
  const gst = wccGstAmount(base);
  const total = wccPayableTotal(base);
  return (
    <div className="rounded-xl border border-sky-100/90 bg-sky-50/40 px-3 py-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2 text-gray-700">
        <span>Plan amount</span>
        <span className="font-semibold tabular-nums">₹ {formatInr(base)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-gray-600">
        <span>GST (18%)</span>
        <span className="font-semibold tabular-nums">₹ {formatInr(gst)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-sky-200/80 text-gray-900">
        <span className="font-semibold">Total payable (incl. GST)</span>
        <span className="font-bold text-emerald-700 tabular-nums">₹ {formatInr(total)}</span>
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">Payment is charged inclusive of 18% GST.</p>
    </div>
  );
}

const COUNTRY_CODES = ["+971", "+91", "+65", "+44", "+1"];

const splitWhatsappNumber = (value = "", fallbackCountryCode = "+91") => {
  const cleaned = String(value || "").replace(/\s+/g, "");
  const fallback = String(fallbackCountryCode || "+91").trim();
  const fallbackDigits = fallback.replace(/\D/g, "");

  if (!cleaned) {
    return { countryCode: fallback || "+91", localNumber: "" };
  }

  const matchedCode = COUNTRY_CODES.find((code) => cleaned.startsWith(code));
  if (matchedCode) {
    return {
      countryCode: matchedCode,
      localNumber: cleaned.slice(matchedCode.length).replace(/\D/g, ""),
    };
  }

  const digits = cleaned.replace(/\D/g, "");
  if (fallbackDigits && digits.startsWith(fallbackDigits) && digits.length > fallbackDigits.length) {
    return {
      countryCode: fallback || "+91",
      localNumber: digits.slice(fallbackDigits.length),
    };
  }

  return {
    countryCode: fallback || "+91",
    localNumber: digits,
  };
};

const addMonthsIso = (fromDate, monthsToAdd) => {
  const d = new Date(fromDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Number(monthsToAdd || 0));
  return d.toISOString();
};

const WA_META_LIVE_PREFIX = "wa_wb_meta_live_";
const META_POPUP_STORAGE_KEY = "waabiz-meta-popup-result";

const readMetaLiveFromStorage = (clientId, projectId = null) => {
  const cid = Number(clientId);
  const pid = projectId != null ? Number(projectId) : null;
  if (!Number.isInteger(cid) || cid <= 0 || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    const raw = localStorage.getItem(`${WA_META_LIVE_PREFIX}${cid}_p${pid}`);
    if (!raw) return false;
    const pack = JSON.parse(raw);
    return Boolean(pack?.snapshot?.onboardingCompleted);
  } catch (_) {
    return false;
  }
};

const PROJECT_PROFILE_PREFIX = "waabiz_project_profile_";

const readProjectProfile = (projectId) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    const raw = localStorage.getItem(`${PROJECT_PROFILE_PREFIX}${pid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
};

const writeProjectProfile = (projectId, profile) => {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid <= 0) return;
  try {
    localStorage.setItem(`${PROJECT_PROFILE_PREFIX}${pid}`, JSON.stringify(profile));
  } catch (_) {
    /* ignore */
  }
};

const resolveProjectLogo = (project, profile) => {
  const custom = profile?.logo != null ? String(profile.logo).trim() : "";
  if (custom) return custom;
  const candidates = [
    project?.logo,
    project?.project_logo,
    project?.logoUrl,
    project?.logo_url,
    project?.brand_logo,
    project?.brandLogo,
    project?.image,
    project?.image_url,
  ];
  for (const c of candidates) {
    const s = c != null ? String(c).trim() : "";
    if (s) return s;
  }
  return "";
};

function AgentRightPanel({
  user = null,
  selectedProject = null,
  conversationQuota = null,
  loadingQuota = false,
  onRefreshConversationQuota,
  isWhatsAppApiLive = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const API_URL = `${API_BASE.replace(/\/$/, "")}`;
  const [metaOnboardingLive, setMetaOnboardingLive] = useState(() =>
    readMetaLiveFromStorage(
      (() => {
        try {
          const raw = localStorage.getItem("user");
          return raw ? JSON.parse(raw)?.id : null;
        } catch (_) {
          return null;
        }
      })(),
      selectedProject?.id
    )
  );

  const paymentJsonHeaders = () => {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const pid =
      selectedProject?.id != null && String(selectedProject.id).trim() !== ""
        ? String(selectedProject.id).trim()
        : null;
    if (pid) {
      headers["x-project-id"] = pid;
    } else {
      try {
        const raw = localStorage.getItem("selectedProject");
        const id = raw ? JSON.parse(raw)?.id : null;
        if (id != null && String(id).trim() !== "") headers["x-project-id"] = String(id).trim();
      } catch (e) {
        /* ignore */
      }
    }
    return headers;
  };

  const [showWccModal, setShowWccModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [wccAmount, setWccAmount] = useState(100);
  const [catalogPlans, setCatalogPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [adsAmount, setAdsAmount] = useState(1500);
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargeAmount, setAutoRechargeAmount] = useState(500);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [projectWhatsappNumber, setProjectWhatsappNumber] = useState("");
  /** Same approval rule as ProjectCard: only then show the business line on the dashboard. */
  const [projectPhoneApproved, setProjectPhoneApproved] = useState(false);
  const [projectPhoneLoaded, setProjectPhoneLoaded] = useState(false);
  const [matchedProject, setMatchedProject] = useState(null);
  const [accountProfile, setAccountProfile] = useState(null);
  const [showAccountEditModal, setShowAccountEditModal] = useState(false);
  const [accountEditForm, setAccountEditForm] = useState({
    name: "",
    category: "",
    countryCode: "+91",
    phone: "",
    logo: "",
  });
  const logoFileInputRef = useRef(null);
  const [planInfo, setPlanInfo] = useState(null);

  const [planStep, setPlanStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState("quarterly");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [flowBuilderEnabled, setFlowBuilderEnabled] = useState(false);
  const [agentSeatCount, setAgentSeatCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlansLoading(true);
      try {
        const list = await fetchActivePlans();
        if (!cancelled) {
          setCatalogPlans(list.length ? list : buildFallbackCatalog());
        }
      } catch {
        if (!cancelled) setCatalogPlans(buildFallbackCatalog());
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const selectedProjectId = Number(selectedProject?.id);
    if (!Number.isInteger(selectedProjectId) || selectedProjectId <= 0) {
      setProjectWhatsappNumber("");
      setProjectPhoneApproved(false);
      setMatchedProject(null);
      setAccountProfile(null);
      setProjectPhoneLoaded(true);
      return;
    }

    const savedProfile = readProjectProfile(selectedProjectId);
    setAccountProfile(savedProfile);

    let mounted = true;
    (async () => {
      if (mounted) setProjectPhoneLoaded(false);
      try {
        const res = await axios.get("/projects/list");
        const projects = Array.isArray(res?.data?.projects) ? res.data.projects : [];
        const matched = projects.find((p) => Number(p?.id) === selectedProjectId);
        const statusNorm = String(matched?.status || "").toLowerCase();
        const isApproved =
          matched?.whatsappApproved === true ||
          ["approved", "active", "live", "verified"].includes(statusNorm);
        const trimStr = (v) =>
          v != null && String(v).trim() !== "" ? String(v).trim() : "";
        const waNum = trimStr(matched?.whatsappNumber);
        const billingNum = trimStr(matched?.paymentPhone);
        const wAlt = trimStr(matched?.whatsapp_number);
        const pPhone = trimStr(matched?.phone);
        const m1 = trimStr(matched?.mobileNumber);
        const m2 = trimStr(matched?.mobile_number);
        // Same resolution order as ProjectCard `projectNumber` (omit literal "--").
        const displayLine = waNum || billingNum || wAlt || pPhone || m1 || m2 || "";
        const profilePhone = savedProfile?.phone ? String(savedProfile.phone).replace(/\D/g, "") : "";
        const profileCc = String(savedProfile?.countryCode || "+91").trim();
        const profileLine = profilePhone ? `${profileCc}${profilePhone}` : "";
        if (mounted) {
          setMatchedProject(matched || null);
          setProjectPhoneApproved(isApproved || Boolean(profilePhone));
          setProjectWhatsappNumber(profileLine || displayLine);
        }
      } catch (_) {
        if (mounted) {
          setProjectPhoneApproved(Boolean(savedProfile?.phone));
          setProjectWhatsappNumber(
            savedProfile?.phone
              ? `${String(savedProfile.countryCode || "+91").trim()}${String(savedProfile.phone).replace(/\D/g, "")}`
              : ""
          );
          setMatchedProject(null);
        }
      } finally {
        if (mounted) setProjectPhoneLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedProject?.id]);

  const refreshWhatsAppLiveStatus = useCallback(async () => {
    const clientId = Number(user?.id);
    const projectId =
      selectedProject?.id != null && String(selectedProject.id).trim() !== ""
        ? String(selectedProject.id).trim()
        : null;

    if (!Number.isInteger(clientId) || clientId <= 0 || !projectId) {
      setMetaOnboardingLive(false);
      return;
    }

    setMetaOnboardingLive(readMetaLiveFromStorage(clientId, projectId));

    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      let url = `${API_BASE.replace(/\/$/, "")}/meta/onboarding-status?client_id=${clientId}`;
      url += `&projectId=${encodeURIComponent(projectId)}`;
      headers["x-project-id"] = projectId;
      const res = await fetch(url, { headers });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || !res.ok) {
        setMetaOnboardingLive(readMetaLiveFromStorage(clientId, projectId));
        return;
      }
      const live = Boolean(data?.success !== false && data?.onboardingCompleted);
      setMetaOnboardingLive(live || readMetaLiveFromStorage(clientId, projectId));
    } catch (_) {
      setMetaOnboardingLive(readMetaLiveFromStorage(clientId, projectId));
    }
  }, [API_BASE, user?.id, selectedProject?.id]);

  useEffect(() => {
    refreshWhatsAppLiveStatus();
    const intervalId = window.setInterval(refreshWhatsAppLiveStatus, 10000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshWhatsAppLiveStatus();
    };
    const onFocus = () => refreshWhatsAppLiveStatus();
    const onStorage = (event) => {
      const key = String(event?.key || "");
      if (
        key.startsWith(WA_META_LIVE_PREFIX) ||
        key.startsWith(PROJECT_PROFILE_PREFIX) ||
        key === META_POPUP_STORAGE_KEY ||
        key === "selectedProject"
      ) {
        refreshWhatsAppLiveStatus();
        const pid = Number(selectedProject?.id);
        if (Number.isInteger(pid) && pid > 0) {
          setAccountProfile(readProjectProfile(pid));
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshWhatsAppLiveStatus, location.pathname, selectedProject?.id]);

  useEffect(() => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      setPlanInfo(null);
      return;
    }
    try {
      const raw = localStorage.getItem(`planInfo:${userId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      setPlanInfo(parsed && parsed.active ? parsed : null);
    } catch (_) {
      setPlanInfo(null);
    }
  }, [user?.id]);

  const businessName =
    (accountProfile?.name && String(accountProfile.name).trim()) ||
    matchedProject?.project_name ||
    selectedProject?.project_name ||
    user?.name ||
    user?.displayName ||
    "Business";
  const businessCategory = (
    accountProfile?.category ||
    matchedProject?.category ||
    selectedProject?.category ||
    user?.industry ||
    "BUSINESS"
  )
    .toString()
    .trim()
    .toUpperCase()
    .slice(0, 32);
  const accountLogoUrl = resolveProjectLogo(matchedProject, accountProfile);
  const businessInitial = String(businessName).trim().charAt(0).toUpperCase() || "B";
  const fallbackCc = (user?.countryCode || user?.country_code || "+91").toString().trim();

  const profilePhoneOverride = accountProfile?.phone
    ? `${String(accountProfile.countryCode || "+91").trim()}${String(accountProfile.phone).replace(/\D/g, "")}`
    : "";

  let phoneDisplay;
  let businessPhoneDigits = "";
  /** True only when we show a real formatted line (matches project card data, not profile fallback). */
  let showBusinessPhoneNumber = false;
  if (!projectPhoneLoaded) {
    phoneDisplay = "…";
  } else if (profilePhoneOverride) {
    const splitPhone = splitWhatsappNumber(profilePhoneOverride, fallbackCc);
    const cc = splitPhone.countryCode || "+91";
    businessPhoneDigits = splitPhone.localNumber || "";
    phoneDisplay = businessPhoneDigits ? `${cc} ${businessPhoneDigits}` : "—";
    showBusinessPhoneNumber = Boolean(businessPhoneDigits);
  } else if (!projectPhoneApproved) {
    phoneDisplay = "—";
  } else {
    const rawPhone = projectWhatsappNumber;
    const splitPhone = splitWhatsappNumber(rawPhone, fallbackCc);
    const cc = splitPhone.countryCode || "+91";
    businessPhoneDigits = splitPhone.localNumber || "";
    if (businessPhoneDigits) {
      phoneDisplay = `${cc} ${businessPhoneDigits}`;
      showBusinessPhoneNumber = true;
    } else {
      phoneDisplay = "—";
    }
  }

  const openEditAccountModal = () => {
    const split = splitWhatsappNumber(
      profilePhoneOverride || projectWhatsappNumber || phoneDisplay,
      fallbackCc
    );
    setAccountEditForm({
      name: businessName,
      category: businessCategory,
      countryCode: accountProfile?.countryCode || split.countryCode || fallbackCc,
      phone: accountProfile?.phone || split.localNumber || "",
      logo: accountLogoUrl || "",
    });
    setShowAccountEditModal(true);
  };

  const handleAccountLogoFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file for the logo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAccountEditForm((prev) => ({ ...prev, logo: result }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const saveAccountProfile = () => {
    const pid = Number(selectedProject?.id);
    if (!Number.isInteger(pid) || pid <= 0) {
      alert("Select a workspace project before saving account details.");
      return;
    }
    const name = String(accountEditForm.name || "").trim();
    if (!name) {
      alert("Business name is required.");
      return;
    }
    const countryCode = String(accountEditForm.countryCode || "+91").trim();
    const phone = String(accountEditForm.phone || "").replace(/\D/g, "");
    const category = String(accountEditForm.category || "BUSINESS")
      .trim()
      .toUpperCase()
      .slice(0, 32);
    const profile = {
      name,
      category,
      countryCode,
      phone,
      logo: String(accountEditForm.logo || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    writeProjectProfile(pid, profile);
    setAccountProfile(profile);
    if (phone) {
      setProjectWhatsappNumber(`${countryCode}${phone}`);
      setProjectPhoneApproved(true);
    }
    try {
      const raw = localStorage.getItem("selectedProject");
      if (raw) {
        const sp = JSON.parse(raw);
        if (Number(sp?.id) === pid) {
          localStorage.setItem(
            "selectedProject",
            JSON.stringify({ ...sp, project_name: name, category })
          );
        }
      }
    } catch (_) {
      /* ignore */
    }
    setShowAccountEditModal(false);
  };

  const userMobileDigits = String(
    user?.mobileNumber ||
      user?.mobile_number ||
      user?.mobile ||
      user?.phone ||
      user?.phoneNumber ||
      user?.dataValues?.mobileNumber ||
      ""
  ).replace(/\D/g, "");

  const paymentContactDigits = businessPhoneDigits || userMobileDigits;

  const whatsappConnected = Boolean(
    isWhatsAppApiLive || metaOnboardingLive
  );

  const planPricing = useMemo(() => {
    const cycles = { monthly: {}, quarterly: {}, yearly: {} };
    catalogPlans.forEach((p) => {
      const slug = p.slug;
      if (!slug) return;
      cycles.monthly[slug] = Number(p.price_monthly) || 0;
      cycles.quarterly[slug] = Number(p.price_quarterly) || 0;
      cycles.yearly[slug] = Number(p.price_yearly) || 0;
    });
    return cycles;
  }, [catalogPlans]);

  const planFeaturesMap = useMemo(() => {
    const map = {};
    catalogPlans.forEach((p) => {
      if (p.slug) map[p.slug] = Array.isArray(p.features) ? p.features : [];
    });
    return map;
  }, [catalogPlans]);

  useEffect(() => {
    if (!catalogPlans.length) return;
    const slugs = catalogPlans.map((p) => p.slug).filter(Boolean);
    if (!slugs.includes(selectedPlan)) setSelectedPlan(slugs[0]);
  }, [catalogPlans, selectedPlan]);

  const basePlanPrice = Number(planPricing[billingCycle]?.[selectedPlan]) || 0;
  const flowBuilderPrice = billingCycle === "quarterly" ? 7125 : billingCycle === "yearly" ? 24900 : 2499;
  const agentSeatPrice = billingCycle === "quarterly" ? 1200 : billingCycle === "yearly" ? 4200 : 450;
  const addonPrice = (flowBuilderEnabled ? flowBuilderPrice : 0) + agentSeatCount * agentSeatPrice;
  const grandTotal = basePlanPrice + addonPrice;
  const planGst = wccGstAmount(grandTotal);
  const planTotalPayable = wccPayableTotal(grandTotal);
  const planStep1Gst = wccGstAmount(basePlanPrice);
  const planStep1Payable = wccPayableTotal(basePlanPrice);
  const wccBalance =
    conversationQuota != null && !loadingQuota ? Number(conversationQuota.wccCredits ?? 0) : null;
  const wccBaseAmount = Math.max(0, Number(wccAmount) || 0);
  const wccGst = wccGstAmount(wccBaseAmount);
  const wccTotalPayable = wccPayableTotal(wccBaseAmount);
  const wccPurchaseDisabled = paymentLoading || wccBaseAmount < 100;
  const hasActivePlan = Boolean(planInfo?.active);
  const renewDateLabel = planInfo?.renewsOn
    ? new Date(planInfo.renewsOn).toLocaleDateString()
    : null;

  const planSummaryText = useMemo(() => {
    if (billingCycle === "monthly") return "Renews every month";
    if (billingCycle === "quarterly") return "Renews every 3 months";
    return "Renews every 12 months";
  }, [billingCycle]);

  const copyPhone = () => {
    if (!showBusinessPhoneNumber || !businessPhoneDigits) return;
    const digits = phoneDisplay.replace(/\D/g, "");
    if (digits && navigator.clipboard?.writeText) navigator.clipboard.writeText(digits);
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay || document.getElementById("razorpay-checkout-js")) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay script"));
      document.body.appendChild(script);
    });

  const openRazorpayCheckout = async ({ amount, purpose, description, metadata = {}, onSuccess }) => {
    if (paymentLoading) return;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please login again.");
      return;
    }
    setPaymentLoading(true);
    try {
      const createOrderRes = await fetch(`${API_URL}/api/payments/create-order`, {
        method: "POST",
        headers: paymentJsonHeaders(),
        body: JSON.stringify({ amount, purpose, metadata }),
      });
      const createOrderData = await createOrderRes.json();
      if (!createOrderRes.ok || !createOrderData.success) {
        throw new Error(createOrderData.message || "Failed to create Razorpay order");
      }

      await loadRazorpayScript();
      const options = {
        key: createOrderData.keyId,
        amount: String(createOrderData.amount),
        currency: createOrderData.currency,
        name: "Waabizx",
        description,
        order_id: createOrderData.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: paymentContactDigits || "",
        },
        theme: { color: "#0284c7" },
        modal: {
          ondismiss: () => setPaymentLoading(false),
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/payments/verify-payment`, {
              method: "POST",
              headers: paymentJsonHeaders(),
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || "Payment verification failed");
            if (typeof onSuccess === "function") onSuccess();
          } catch (e) {
            alert(e.message || "Payment verification failed");
          } finally {
            setPaymentLoading(false);
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        const msg = resp?.error?.description || resp?.error?.reason || "Payment failed";
        setPaymentLoading(false);
        alert(msg);
      });
      rzp.open();
    } catch (e) {
      setPaymentLoading(false);
      alert(e.message || "Payment failed");
    }
  };

  const purchaseWcc = () => {
    if (wccBaseAmount < 100) {
      alert("Minimum amount of 100 credits is allowed.");
      return;
    }
    return openRazorpayCheckout({
      amount: wccTotalPayable,
      purpose: "wcc",
      description: "Purchase WhatsApp Conversation Credits (WCC)",
      metadata: { projectId: selectedProject?.id || null, wccCredits: wccBaseAmount },
      onSuccess: async () => {
        setShowWccModal(false);
        setPaymentLoading(false);
        if (typeof onRefreshConversationQuota === "function") {
          await onRefreshConversationQuota();
        }
        alert("WCC purchased successfully!");
      },
    });
  };

  const purchaseAdsCredits = () =>
    openRazorpayCheckout({
      amount: adsAmount,
      purpose: "ads_credits",
      description: "Purchase AiSensy Ads Credits",
      metadata: { projectId: selectedProject?.id || null },
      onSuccess: () => {
        setShowAdsModal(false);
        setPaymentLoading(false);
        alert("Ads credits purchased successfully!");
      },
    });

  const purchasePlan = () =>
    openRazorpayCheckout({
      amount: planTotalPayable,
      purpose: "plan_purchase",
      description: `${selectedPlan.toUpperCase()} plan (${billingCycle})`,
      metadata: {
        cycle: billingCycle,
        plan: selectedPlan,
        planId: catalogPlans.find((p) => p.slug === selectedPlan)?.id ?? null,
        flowBuilderEnabled,
        agentSeatCount,
        basePlanPrice,
        addonPrice,
        planSubtotal: grandTotal,
      },
      onSuccess: () => {
        const nowIso = new Date().toISOString();
        const renewsOn =
          billingCycle === "monthly"
            ? addMonthsIso(nowIso, 1)
            : billingCycle === "quarterly"
              ? addMonthsIso(nowIso, 3)
              : addMonthsIso(nowIso, 12);
        const nextPlanInfo = {
          active: true,
          plan: selectedPlan,
          cycle: billingCycle,
          purchasedAt: nowIso,
          renewsOn,
        };
        setPlanInfo(nextPlanInfo);
        const uid = Number(user?.id);
        if (Number.isInteger(uid) && uid > 0) {
          localStorage.setItem(`planInfo:${uid}`, JSON.stringify(nextPlanInfo));
        }
        setShowPlanModal(false);
        setPlanStep(1);
        setPaymentLoading(false);
        alert("Plan purchased successfully!");
      },
    });

  const cardShell =
    "relative overflow-hidden rounded-2xl border border-gray-100/90 bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-200/35 ring-1 ring-gray-100/80";

  return (
    <div className="space-y-3 md:space-y-4 motion-stagger-children">
      <div className={`${cardShell} p-3.5 md:p-4`}>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-semibold text-sky-800">
          <button type="button" onClick={() => navigate("/analytics")} className="hover:text-sky-950 transition-colors">
            Analytics Dashboard
          </button>
        </div>
      </div>

      <div className={`${cardShell} p-4 md:p-5 motion-card-rich motion-hover-lift transition-all duration-300 hover:border-sky-200/60 hover:shadow-xl hover:shadow-sky-500/10`}>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent" aria-hidden />
        <div className="relative flex gap-3">
          <div className="shrink-0">
            {accountLogoUrl ? (
              <img
                src={accountLogoUrl}
                alt={`${businessName} logo`}
                className="h-14 w-14 rounded-xl object-cover border border-sky-100/90 bg-white shadow-sm ring-1 ring-sky-100/80"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-lg font-bold text-white shadow-md shadow-sky-600/25 ring-2 ring-white/80"
                aria-hidden
              >
                {businessInitial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 tracking-tight text-sm md:text-base truncate">{businessName}</h3>
              <button
                type="button"
                onClick={openEditAccountModal}
                className="shrink-0 rounded-lg border border-sky-200/90 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition"
              >
                Edit
              </button>
            </div>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600/90">{businessCategory}</p>
            <div className="mt-3 flex items-center gap-2">
              <p
                className={`font-semibold text-sm md:text-base tabular-nums truncate ${
                  showBusinessPhoneNumber && businessPhoneDigits ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {phoneDisplay}
              </p>
              <button
                type="button"
                onClick={copyPhone}
                disabled={!showBusinessPhoneNumber || !businessPhoneDigits}
                className={`shrink-0 p-1.5 rounded-lg border border-gray-200/90 bg-white transition ${
                  !showBusinessPhoneNumber || !businessPhoneDigits
                    ? "text-gray-300 cursor-not-allowed opacity-60"
                    : "text-sky-700 hover:bg-sky-50 hover:border-sky-200"
                }`}
                title={
                  showBusinessPhoneNumber && businessPhoneDigits
                    ? "Copy number"
                    : "Number shown after project WhatsApp is approved"
                }
                aria-label="Copy WhatsApp number"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={openEditAccountModal}
              className="mt-3 text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              Edit account details <span className="text-[10px]">▾</span>
            </button>
          </div>
        </div>
      </div>

      {showAccountEditModal &&
        createPortal(
          <div className="fixed inset-0 z-[305] flex items-center justify-center overscroll-contain p-4">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
              onClick={() => setShowAccountEditModal(false)}
              aria-label="Close edit account"
            />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-sky-900/15 ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-sky-100/90 bg-gradient-to-r from-sky-50 via-white to-blue-50 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Edit account</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">Update logo, name, category, and phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccountEditModal(false)}
                  className="w-9 h-9 rounded-xl text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition"
                  aria-label="Close"
                >
                  &#x2715;
                </button>
              </div>
              <div className="max-h-[min(70vh,520px)] overflow-y-auto p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {accountEditForm.logo ? (
                    <img
                      src={accountEditForm.logo}
                      alt="Logo preview"
                      className="h-16 w-16 rounded-xl object-cover border border-sky-100 ring-1 ring-sky-100/80"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-xl font-bold text-white">
                      {String(accountEditForm.name || businessName).trim().charAt(0).toUpperCase() || "B"}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAccountLogoFile}
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition"
                    >
                      Upload logo
                    </button>
                    {accountEditForm.logo ? (
                      <button
                        type="button"
                        onClick={() => setAccountEditForm((prev) => ({ ...prev, logo: "" }))}
                        className="text-left text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Remove logo
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Business name</label>
                  <input
                    type="text"
                    value={accountEditForm.name}
                    onChange={(e) => setAccountEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Category</label>
                  <input
                    type="text"
                    value={accountEditForm.category}
                    onChange={(e) => setAccountEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 outline-none"
                  />
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Code</label>
                    <select
                      value={accountEditForm.countryCode}
                      onChange={(e) => setAccountEditForm((prev) => ({ ...prev, countryCode: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border-2 border-gray-200 px-2 py-2.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 outline-none"
                    >
                      {COUNTRY_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Phone number</label>
                    <input
                      type="tel"
                      value={accountEditForm.phone}
                      onChange={(e) =>
                        setAccountEditForm((prev) => ({
                          ...prev,
                          phone: e.target.value.replace(/[^\d\s-]/g, ""),
                        }))
                      }
                      className="mt-1.5 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm tabular-nums focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 outline-none"
                      placeholder="WhatsApp number"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowAccountEditModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAccountProfile}
                  className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/25 hover:from-sky-500 hover:to-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className={`${cardShell} p-4 md:p-5 motion-card-rich motion-hover-lift`}>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-sky-500/5" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Free Service Conversation</p>
          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-gray-500">
            <span>0</span>
            <span>Unlimited</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-gray-100 border border-gray-200/80 overflow-hidden">
            <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 shadow-sm" />
          </div>
        </div>
      </div>

      <div className={`${cardShell} p-4 md:p-5 motion-card-rich motion-hover-lift`}>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5" aria-hidden />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-emerald-800/90 uppercase tracking-wide">Connect</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">WhatsApp Business API</p>
            {whatsappConnected ? (
              <>
                <p className="text-[10px] text-emerald-700 mt-1 font-semibold leading-snug">Your WhatsApp Business API is live.</p>
                <span className="inline-flex items-center mt-2 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-bold ring-1 ring-emerald-200/80">
                  LIVE
                </span>
              </>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1 leading-snug">Link your Meta account to send campaigns and templates.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!whatsappConnected) navigate("/connect-whatsapp");
            }}
            disabled={whatsappConnected}
            aria-disabled={whatsappConnected}
            className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              whatsappConnected
                ? "text-emerald-800 bg-emerald-50 border border-emerald-200/90 cursor-not-allowed opacity-90 pointer-events-none"
                : "text-white bg-gradient-to-r from-emerald-600 to-green-600 shadow-md shadow-emerald-600/25 hover:from-emerald-500 hover:to-green-500"
            }`}
          >
            {whatsappConnected ? "Connected" : "Connect"}
          </button>
        </div>
      </div>

      <div className={`${cardShell} p-4 md:p-5 motion-card-rich motion-hover-lift`}>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/8 to-blue-500/5" aria-hidden />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 leading-snug">WhatsApp Conversation Credits (WCC)</p>
            <p className="mt-1 text-lg md:text-xl font-bold text-gray-900 tabular-nums">
              {loadingQuota ? "…" : wccBalance != null ? `${wccBalance.toLocaleString()} left` : "—"}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 leading-snug">
              Meta-style pricing: one debit per <span className="font-semibold text-gray-600">24-hour conversation</span>{" "}
              in India is typically ~₹0.3–₹1.5 (category-dependent).{" "}
              <span className="font-semibold text-gray-600">1 credit = ₹1</span> from top-ups (e.g. ₹100 → 100 credits).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setWccAmount(100);
              setPaymentLoading(false);
              setShowWccModal(true);
            }}
            className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-slate-800 to-slate-900 shadow-md shadow-slate-900/25 hover:from-slate-700 hover:to-slate-800 transition"
          >
            Buy More
          </button>
        </div>
      </div>

      <div className={`${cardShell} p-4 md:p-5 motion-card-rich motion-hover-lift`}>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/8 to-blue-500/5" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Plan</p>
          <h3 className="mt-1.5 font-bold text-base md:text-lg bg-gradient-to-r from-sky-700 to-blue-800 bg-clip-text text-transparent tracking-tight">
            {hasActivePlan ? String(planInfo?.plan || "basic").toUpperCase() : "BASIC"}
          </h3>
          {hasActivePlan && renewDateLabel ? (
            <p className="mt-2 text-[11px] text-gray-500 leading-snug">Renews on {renewDateLabel}</p>
          ) : (
            <p className="mt-2 text-[11px] text-gray-500 leading-snug">Upgrade anytime from billing when you need higher limits.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setPlanStep(1);
              setPaymentLoading(false);
              setShowPlanModal(true);
            }}
            className="mt-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition"
          >
            {hasActivePlan ? "Upgrade Now" : "Get Plan"}
          </button>
        </div>
      </div>

      {showAdsModal &&
        createPortal(
          <div className="fixed inset-0 z-[310] flex justify-end overscroll-contain">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
              onClick={() => {
                setShowAdsModal(false);
                setPaymentLoading(false);
              }}
              aria-label="Close overlay"
            />
            <div className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white/95 backdrop-blur-md border-l border-gray-200/80 shadow-2xl shadow-sky-900/15 ring-1 ring-black/5">
              <div className="p-5 border-b border-sky-100/90 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-blue-50">
                <div>
                  <h3 className="text-base font-bold bg-gradient-to-r from-slate-900 to-sky-800 bg-clip-text text-transparent">Purchase AiSensy Ads Credits</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Fund ad campaigns with instant top-up</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdsModal(false);
                    setPaymentLoading(false);
                  }}
                  className="w-9 h-9 rounded-xl text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition"
                >
                  &#x2715;
                </button>
              </div>
              <div className="p-5 bg-gradient-to-b from-white to-sky-50/30">
                <div className="rounded-2xl border border-sky-100/90 bg-white p-4 ring-1 ring-sky-100/80 shadow-lg shadow-sky-100/30">
                  <p className="text-xs text-gray-600 leading-relaxed">These ad credits can be used to create and run ads only from AiSensy&apos;s Ads Manager.</p>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-800">Enter Amount</label>
                    <p className="text-xs text-gray-500 mt-1">Minimum purchase of 1500 credits is allowed</p>
                    <div className="mt-2 flex items-center">
                      <span className="px-3 py-2.5 border-2 border-r-0 border-sky-200 rounded-l-xl bg-sky-50 text-sky-700 font-semibold text-sm">₹</span>
                      <input
                        type="number"
                        value={adsAmount}
                        min={1500}
                        step={500}
                        onChange={(e) => setAdsAmount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border-2 border-sky-200 rounded-r-xl text-sm focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 outline-none border-l-0 bg-white"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[2500, 5000, 10000, 50000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAdsAmount(amt)}
                          className={`px-2 py-2 text-xs rounded-xl font-semibold transition border-2 ${
                            adsAmount === amt
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md"
                              : "bg-white text-gray-700 border-sky-100 hover:border-sky-300 hover:bg-sky-50/80"
                          }`}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={purchaseAdsCredits}
                      disabled={paymentLoading}
                      className="mt-4 w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentLoading ? "Opening…" : "Purchase Now"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showWccModal &&
        createPortal(
          <div className="motion-enter fixed inset-0 z-[300] flex justify-end overscroll-contain">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
              onClick={() => {
                setShowWccModal(false);
                setPaymentLoading(false);
              }}
              aria-label="Close overlay"
            />
            <div className="motion-pop relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-white/95 backdrop-blur-md border-l border-gray-200/80 shadow-2xl shadow-sky-900/15 ring-1 ring-black/5">
              <div className="p-5 border-b border-sky-100/90 flex items-start justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-blue-50">
                <div>
                  <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-slate-900 to-sky-800 bg-clip-text text-transparent">Purchase WhatsApp Conversation Credits (WCC)</h3>
                  <p className="text-xs text-slate-500 mt-1">Keep conversations running with instant recharge</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowWccModal(false);
                    setPaymentLoading(false);
                  }}
                  className="w-9 h-9 rounded-xl text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition"
                  aria-label="Close"
                >
                  &#x2715;
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-white to-sky-50/30">
                <div className="rounded-2xl p-4 md:p-5 border-2 border-sky-100/90 bg-gradient-to-br from-white to-sky-50/40 shadow-inner ring-1 ring-sky-100/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">Enter WCC Amount</p>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-semibold ring-1 ring-sky-200/80">Min 100</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum amount of 100 credits is allowed.</p>

                  <div className="mt-3 flex items-center">
                    <span className="px-3 py-2.5 border-2 border-r-0 border-sky-200 rounded-l-xl bg-sky-50 text-sky-700 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      value={wccAmount}
                      min={100}
                      step={100}
                      onChange={(e) => setWccAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border-2 border-sky-200 rounded-r-xl text-sm focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 outline-none border-l-0 bg-white"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[100, 500, 1000, 2500].map((amt) => {
                      const isDisabled = amt < 100;
                      return (
                        <button
                          key={amt}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setWccAmount(amt)}
                          className={`px-2 py-2 text-xs rounded-xl font-semibold transition border-2 ${
                            isDisabled
                              ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                              : wccAmount === amt
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md"
                                : "bg-white text-gray-700 border-sky-100 hover:border-sky-300 hover:bg-sky-50/80"
                          }`}
                        >
                          {amt.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl border border-sky-100/90 bg-sky-50/40 px-3 py-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 text-gray-700">
                      <span>WCC amount</span>
                      <span className="font-semibold tabular-nums">₹ {formatInr(wccBaseAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-600">
                      <span>GST (18%)</span>
                      <span className="font-semibold tabular-nums">₹ {formatInr(wccGst)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-sky-200/80 text-gray-900">
                      <span className="font-semibold">Total payable (incl. GST)</span>
                      <span className="font-bold text-emerald-700 tabular-nums">₹ {formatInr(wccTotalPayable)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      You will receive {formatInr(wccBaseAmount)} WCC credits. Payment is charged inclusive of 18% GST.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={purchaseWcc}
                    disabled={wccPurchaseDisabled}
                    className="mt-4 w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? "Opening…" : `Purchase Now — ₹ ${formatInr(wccTotalPayable)}`}
                  </button>
                </div>

                <div className="rounded-2xl p-4 md:p-5 border-2 border-sky-100/90 bg-white/85 ring-1 ring-sky-100/80 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Enable WCC auto-recharge</p>
                      <p className="text-xs text-gray-500 mt-1">Auto-recharge when your WCC goes below the threshold.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                      <input type="checkbox" checked={autoRechargeEnabled} onChange={(e) => setAutoRechargeEnabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                      <span className="text-sm font-semibold text-gray-700">On</span>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-800">Enter auto-recharge amount</label>
                    <div className="mt-2 flex items-center">
                      <span className="px-3 py-2.5 border-2 border-r-0 border-gray-200 rounded-l-xl bg-gray-50/80 text-gray-700 font-semibold text-sm">₹</span>
                      <input
                        type="number"
                        value={autoRechargeAmount}
                        min={100}
                        step={100}
                        disabled={!autoRechargeEnabled}
                        onChange={(e) => setAutoRechargeAmount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-r-xl text-sm focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 outline-none border-l-0 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <button type="button" disabled={!autoRechargeEnabled} className="mt-4 w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      Start
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showPlanModal &&
        createPortal(
          <div className="fixed inset-0 z-[320] flex justify-end overscroll-contain">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
              onClick={() => {
                setShowPlanModal(false);
                setPaymentLoading(false);
              }}
              aria-label="Close overlay"
            />
            <div className="relative z-10 h-full w-full max-w-4xl overflow-y-auto bg-white/95 backdrop-blur-md border-l border-gray-200/80 shadow-2xl shadow-sky-900/15 ring-1 ring-black/5">
              <div className="p-5 border-b border-sky-100/90 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-blue-50">
                <div>
                  <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-slate-900 to-sky-800 bg-clip-text text-transparent">Purchase Plan</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Choose plan and add-ons that fit your team</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    setPaymentLoading(false);
                  }}
                  className="w-9 h-9 rounded-xl text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition"
                >
                  &#x2715;
                </button>
              </div>
              <div className="p-5 space-y-5 bg-gradient-to-b from-white to-sky-50/30">
                {planStep === 1 ? (
                  <>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm">
                      <p className="text-sm font-semibold text-emerald-800">Upgrade your plan to unlock this feature</p>
                      <p className="text-xs text-emerald-700 mt-1">Get advanced features to elevate your marketing game</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-sky-50/90 p-1.5 ring-1 ring-sky-100/80">
                      {["monthly", "quarterly", "yearly"].map((cycle) => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() => setBillingCycle(cycle)}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                            billingCycle === cycle ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow" : "bg-transparent text-slate-700 hover:bg-white"
                          }`}
                        >
                          {cycle.charAt(0).toUpperCase() + cycle.slice(1)} {PLAN_DISCOUNT_LABEL[cycle]}
                        </button>
                      ))}
                    </div>
                    {plansLoading ? (
                      <div className="py-8 flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {catalogPlans.map((plan) => {
                        const slug = plan.slug;
                        const price = Number(planPricing[billingCycle]?.[slug]) || 0;
                        const features = planFeaturesMap[slug] || [];
                        return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => setSelectedPlan(slug)}
                          className={`text-left rounded-2xl border-2 p-4 transition ${
                            selectedPlan === slug
                              ? "border-emerald-400 ring-2 ring-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white shadow-md"
                              : "border-gray-200 bg-white hover:border-sky-200 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-bold text-slate-900 uppercase">{plan.name || slug}</h4>
                            {selectedPlan === slug ? <span className="text-[10px] font-bold text-emerald-700">CHOSEN</span> : null}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-emerald-700">₹ {price.toLocaleString("en-IN")}/{billingCycle === "monthly" ? "month" : billingCycle === "quarterly" ? "quarter" : "year"}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{plan.users_limit} users · {Number(plan.messages_limit || 0).toLocaleString("en-IN")} messages</p>
                          <ul className="mt-3 space-y-1">
                            {features.map((f) => (
                              <li key={f} className="text-[11px] text-gray-600">
                                • {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                        );
                      })}
                    </div>
                    )}
                    <PlanGstBreakdown subtotal={basePlanPrice} />
                    <div className="rounded-2xl border border-sky-100/90 p-4 bg-white ring-1 ring-sky-100/70 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Total</p>
                          <p className="text-xs text-slate-500">{planSummaryText}</p>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 tabular-nums">₹ {formatInr(planStep1Payable)}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Incl. GST ₹ {formatInr(planStep1Gst)} on plan ₹ {formatInr(basePlanPrice)}
                      </p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setPlanStep(2)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition shadow-md shadow-emerald-500/25">
                          Continue
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-sky-100/90 p-4 space-y-4 bg-white ring-1 ring-sky-100/70 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Flow Builder Add-on</p>
                          <p className="text-xs text-slate-500">Drag & drop chatbot builder, catalogs, and checkout support.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFlowBuilderEnabled((v) => !v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            flowBuilderEnabled ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {flowBuilderEnabled ? "Remove Add-on" : "Select Add-on"}
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700">
                        ₹ {flowBuilderPrice.toLocaleString()}/{billingCycle === "monthly" ? "month" : billingCycle === "quarterly" ? "quarter" : "year"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-100/90 p-4 space-y-4 bg-white ring-1 ring-sky-100/70 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Agent Seats Add-on</p>
                          <p className="text-xs text-slate-500">Multi-agent collaboration with role-based access control.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {[-1, 1, 5, 10].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => setAgentSeatCount((prev) => Math.max(0, prev + delta))}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-slate-700 hover:bg-sky-50"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-600">No. of agent seats: {agentSeatCount}</p>
                        <p className="text-sm font-semibold text-emerald-700">
                          ₹ {(agentSeatCount * agentSeatPrice).toLocaleString()}/{billingCycle === "monthly" ? "month" : billingCycle === "quarterly" ? "quarter" : "year"}
                        </p>
                      </div>
                    </div>

                    <PlanGstBreakdown subtotal={grandTotal} />
                    <div className="rounded-2xl border border-sky-100/90 p-4 bg-white ring-1 ring-sky-100/70 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="rounded-xl border border-gray-200 p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing Address</p>
                          <p className="mt-1 text-sm text-slate-700">Pune, Maharashtra, IN</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</p>
                          <p className="mt-1 text-sm text-slate-700">Add card and pay securely via Razorpay</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Total</p>
                          <p className="text-xs text-slate-500">{planSummaryText}</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                          ₹ {formatInr(planTotalPayable)}
                          <span className="text-sm font-semibold text-slate-500">
                            /{billingCycle === "monthly" ? "month" : billingCycle === "quarterly" ? "quarter" : "year"}
                          </span>
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-3">
                        Incl. GST ₹ {formatInr(planGst)} on subtotal ₹ {formatInr(grandTotal)}
                      </p>
                      <div className="flex justify-between gap-2">
                        <button type="button" onClick={() => setPlanStep(1)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-slate-700 hover:bg-gray-50">
                          Back
                        </button>
                        <button type="button" onClick={purchasePlan} disabled={paymentLoading} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/25">
                          {paymentLoading ? "Opening…" : `Purchase Now — ₹ ${formatInr(planTotalPayable)}`}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default AgentRightPanel;
