import api from './api';

const teamService = {
  getOverview: async (search) => {
    const params = search ? { search } : {};
    return api.get('/team/overview', { params });
  },
};

export default teamService;
