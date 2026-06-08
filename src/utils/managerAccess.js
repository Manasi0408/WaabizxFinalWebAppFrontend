export const MANAGER_MODULE_OPTIONS = [
  { key: "campaign", label: "Campaign" },
  { key: "broadcast", label: "Broadcast" },
  { key: "template", label: "Template" },
  { key: "analytics", label: "Analytics" },
  { key: "flows", label: "Flows" },
  { key: "contacts", label: "Contacts" },
  { key: "inbox", label: "Inbox" },
  { key: "reports", label: "Reports" },
  { key: "manage", label: "Manage" },
  { key: "myProjects", label: "My Projects" },
];

const EMPTY_MANAGER_PERMISSIONS = MANAGER_MODULE_OPTIONS.reduce((acc, item) => {
  acc[item.key] = false;
  return acc;
}, {});

export const normalizeRole = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

export const normalizeManagerPermissions = (value) => {
  const normalized = { ...EMPTY_MANAGER_PERMISSIONS };

  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(normalized, key)) {
        normalized[key] = true;
      }
    });
    return normalized;
  }

  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch (_) {
      candidate = null;
    }
  }

  if (!candidate || typeof candidate !== "object") {
    return normalized;
  }

  MANAGER_MODULE_OPTIONS.forEach(({ key }) => {
    normalized[key] = Boolean(candidate[key]);
  });

  return normalized;
};

export const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const hasManagerModuleAccess = (moduleKey, user = readStoredUser()) => {
  if (!moduleKey) return true;
  const role = normalizeRole(user?.role || localStorage.getItem("role"));
  if (role !== "manager") return true;
  const permissions = normalizeManagerPermissions(user?.permissions);
  return Boolean(permissions[moduleKey]);
};

export const getManagerFallbackRoute = (user = readStoredUser()) => {
  const permissions = normalizeManagerPermissions(user?.permissions);

  if (permissions.myProjects) return "/project-dashboard";
  if (permissions.campaign) return "/campaigns";
  if (permissions.broadcast) return "/broadcast";
  if (permissions.template) return "/templates";
  if (permissions.analytics) return "/analytics";
  if (permissions.flows) return "/flows";
  if (permissions.contacts) return "/contacts";
  if (permissions.inbox) return "/inbox";
  if (permissions.reports) return "/reports";
  if (permissions.manage) return "/manage";
  return "/dashboard";
};

export const getEnabledManagerPermissionLabels = (permissions) => {
  const normalized = normalizeManagerPermissions(permissions);
  return MANAGER_MODULE_OPTIONS.filter(({ key }) => normalized[key]).map(({ label }) => label);
};
