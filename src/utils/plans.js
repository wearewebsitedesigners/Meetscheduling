const PLAN_FEATURES = {
  free: {
    maxEventTypes: 1,
  },
  pro: {
    maxEventTypes: Infinity,
  },
};

function getPlanFeatures(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

module.exports = {
  PLAN_FEATURES,
  getPlanFeatures,
};

