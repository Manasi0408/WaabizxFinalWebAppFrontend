import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPlan,
  deletePlan,
  fetchAdminPlans,
  updatePlan,
} from '../services/planService';

const emptyForm = () => ({
  id: null,
  slug: '',
  name: '',
  price_monthly: '',
  price_quarterly: '',
  price_yearly: '',
  users_limit: '',
  messages_limit: '',
  featuresText: '',
  trial_days: '0',
  is_active: true,
  sort_order: '0',
});

const formatInr = (n) => Number(n || 0).toLocaleString('en-IN');

function SuperAdminPlansPanel() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const loadPlans = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const list = await fetchAdminPlans();
      setPlans(list);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.is_active).length;
    const lowest = plans.length
      ? Math.min(...plans.map((p) => Number(p.price_monthly) || 0).filter((n) => n > 0))
      : 0;
    return { total: plans.length, active, lowest };
  }, [plans]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
    setSuccess('');
    setError('');
  };

  const openEdit = (plan) => {
    setForm({
      id: plan.id,
      slug: plan.slug || '',
      name: plan.name || '',
      price_monthly: String(plan.price_monthly ?? ''),
      price_quarterly: String(plan.price_quarterly ?? ''),
      price_yearly: String(plan.price_yearly ?? ''),
      users_limit: String(plan.users_limit ?? ''),
      messages_limit: String(plan.messages_limit ?? ''),
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      trial_days: String(plan.trial_days ?? 0),
      is_active: Boolean(plan.is_active),
      sort_order: String(plan.sort_order ?? 0),
    });
    setShowForm(true);
    setSuccess('');
    setError('');
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      slug: form.slug.trim() || undefined,
      name: form.name.trim(),
      price_monthly: Number(form.price_monthly) || 0,
      price_quarterly: Number(form.price_quarterly) || 0,
      price_yearly: Number(form.price_yearly) || 0,
      users_limit: Number(form.users_limit) || 0,
      messages_limit: Number(form.messages_limit) || 0,
      features: form.featuresText,
      trial_days: Number(form.trial_days) || 0,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      if (form.id) {
        await updatePlan(form.id, payload);
        setSuccess('Plan updated successfully.');
      } else {
        await createPlan(payload);
        setSuccess('Plan created successfully.');
      }
      setShowForm(false);
      setForm(emptyForm());
      await loadPlans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (plan) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      await loadPlans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update plan');
    }
  };

  const onDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await deletePlan(plan.id);
      setSuccess('Plan deleted.');
      await loadPlans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete plan');
    }
  };

  return (
    <div className="motion-enter space-y-6">
      {/* Hero strip — matches SuperAdmin dashboard */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-100/90 bg-white/95 p-5 md:p-6 shadow-lg shadow-gray-200/35 ring-1 ring-gray-100/80 backdrop-blur-sm">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-600"
          aria-hidden
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-800 ring-1 ring-sky-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Subscription pricing
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              <span className="bg-gradient-to-r from-gray-900 via-sky-800 to-blue-900 bg-clip-text text-transparent">
                Manage plans
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
              Plans you publish here appear instantly in the admin <strong className="font-semibold text-gray-800">Get Plan</strong> popup with live pricing and features.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition motion-hover-lift"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add new plan
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-gray-100/90 bg-white/90 p-4 shadow-lg shadow-gray-200/30 ring-1 ring-gray-100/80 motion-hover-lift">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total plans</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 shadow-lg shadow-emerald-100/30 ring-1 ring-emerald-100/60 motion-hover-lift">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70">Active on website</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-sky-100/90 bg-gradient-to-br from-sky-500/10 via-white to-blue-500/10 p-4 shadow-lg shadow-sky-200/25 ring-1 ring-sky-100/60 motion-hover-lift">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800/70">From (monthly)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sky-800">
            {stats.lowest > 0 ? `₹ ${formatInr(stats.lowest)}` : '—'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200/90 rounded-2xl text-sm text-red-700 ring-1 ring-red-100/50">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-sm text-emerald-800 ring-1 ring-emerald-100/50">
          {success}
        </div>
      ) : null}

      {/* Plan cards grid */}
      <section className="rounded-2xl border border-gray-100/90 bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-200/35 ring-1 ring-gray-100/80 overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-gray-100/90 bg-gradient-to-r from-white via-sky-50/40 to-white flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900">All subscription plans</h3>
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
          ) : null}
        </div>

        <div className="p-4 md:p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <p className="text-sm text-gray-500">Loading plans…</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-gray-700">No plans yet</p>
              <p className="text-xs text-gray-500 mt-1">Create your first plan to show it on the admin dashboard.</p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600"
              >
                Add plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 motion-stagger-children">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className="group relative flex flex-col rounded-2xl border border-gray-100/90 bg-white/90 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:border-sky-200/80 motion-hover-lift"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-emerald-500 to-blue-500 opacity-80" />

                  <div className="p-4 md:p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                          {plan.name}
                        </h4>
                        <span className="mt-1 inline-block text-[10px] font-mono text-sky-800/80 bg-sky-50 px-2 py-0.5 rounded-md ring-1 ring-sky-100">
                          {plan.slug}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ring-1 ${
                          plan.is_active
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/90'
                            : 'bg-gray-100 text-gray-600 ring-gray-200/80'
                        }`}
                      >
                        {plan.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 rounded-xl bg-gradient-to-br from-sky-50/90 to-white p-3 ring-1 ring-sky-100/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Monthly</span>
                        <span className="font-bold text-emerald-700 tabular-nums">₹ {formatInr(plan.price_monthly)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Quarterly</span>
                        <span className="font-bold text-gray-800 tabular-nums">₹ {formatInr(plan.price_quarterly)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Yearly</span>
                        <span className="font-bold text-gray-800 tabular-nums">₹ {formatInr(plan.price_yearly)}</span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">{plan.users_limit}</span> users ·{' '}
                      <span className="font-semibold text-gray-700">{formatInr(plan.messages_limit)}</span> messages
                      {plan.trial_days > 0 ? (
                        <span className="text-sky-700"> · {plan.trial_days}-day trial</span>
                      ) : null}
                    </p>

                    {Array.isArray(plan.features) && plan.features.length > 0 ? (
                      <ul className="mt-3 flex-1 space-y-1.5">
                        {plan.features.slice(0, 5).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[11px] text-gray-600 leading-snug">
                            <span className="mt-0.5 text-emerald-600 shrink-0" aria-hidden>
                              ✓
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[11px] text-gray-400 italic">No features listed</p>
                    )}
                  </div>

                  <div className="px-4 pb-4 pt-0 flex flex-wrap gap-2 border-t border-gray-50 mt-auto">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="flex-1 min-w-[5rem] px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sm transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(plan)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                      {plan.is_active ? 'Hide' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(plan)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200/90 ring-1 ring-black/5 flex flex-col">
            <div className="shrink-0 px-5 py-4 border-b border-sky-100/90 bg-gradient-to-r from-sky-50 via-white to-blue-50 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-gray-900">{form.id ? 'Edit plan' : 'Add new plan'}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Visible on admin Get Plan when active</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                }}
                className="w-9 h-9 rounded-xl text-gray-500 hover:bg-white border border-transparent hover:border-gray-200 transition"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={onSave} className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Plan name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none"
                  />
                </label>
                <label className="block col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Slug</span>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="auto from name"
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['price_monthly', 'Monthly ₹'],
                  ['price_quarterly', 'Quarterly ₹'],
                  ['price_yearly', 'Yearly ₹'],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border-2 border-gray-200 px-2 py-2 text-sm focus:border-sky-400 outline-none"
                    />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Users limit</span>
                  <input
                    type="number"
                    min={0}
                    value={form.users_limit}
                    onChange={(e) => setForm((f) => ({ ...f, users_limit: e.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Messages limit</span>
                  <input
                    type="number"
                    min={0}
                    value={form.messages_limit}
                    onChange={(e) => setForm((f) => ({ ...f, messages_limit: e.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Features (one per line)</span>
                <textarea
                  rows={4}
                  value={form.featuresText}
                  onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
                  className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 outline-none"
                  placeholder={'Unlimited Contacts\nWhatsApp API\nTeam Inbox'}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Trial days</span>
                  <input
                    type="number"
                    min={0}
                    value={form.trial_days}
                    onChange={(e) => setForm((f) => ({ ...f, trial_days: e.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Sort order</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-800">Publish on admin Get Plan</span>
              </label>
              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm());
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SuperAdminPlansPanel;
