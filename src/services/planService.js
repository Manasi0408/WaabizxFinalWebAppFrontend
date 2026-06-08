import axios from '../api/axios';

export const fetchActivePlans = async () => {
  const res = await axios.get('/plans');
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.plans)) return data.plans;
  return [];
};

export const fetchAdminPlans = async () => {
  const res = await axios.get('/admin/plans');
  return Array.isArray(res?.data?.plans) ? res.data.plans : [];
};

export const createPlan = async (payload) => {
  const res = await axios.post('/admin/plans', payload);
  return res?.data;
};

export const updatePlan = async (id, payload) => {
  const res = await axios.put(`/admin/plans/${id}`, payload);
  return res?.data;
};

export const deletePlan = async (id) => {
  const res = await axios.delete(`/admin/plans/${id}`);
  return res?.data;
};
