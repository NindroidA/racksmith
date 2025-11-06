import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Building, Calendar, Eye, Network, Trash2, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { NetworkPlanService } from '../services/api';
import type { NetworkPlan } from '../types/entities';

const SavedNetworkPlans: React.FC = () => {
  const [plans, setPlans] = useState<NetworkPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPlans = async () => {
    setIsLoading(true);
    const allPlans = await NetworkPlanService.list('-created_date');
    setPlans(allPlans);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleDelete = async (planId: string) => {
    if (window.confirm('Delete this network plan?')) {
      await NetworkPlanService.delete(planId);
      loadPlans();
    }
  };

  const facilityLabels = {
    small: 'Small (1-50 devices)',
    medium: 'Medium (50-500 devices)',
    large: 'Large (500-2000 devices)',
    enterprise: 'Enterprise (2000+ devices)'
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center glow">
                <BookMarked className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold gradient-text mb-3">Saved Network Plans</h1>
                <p className="text-gray-300 text-lg">View and manage your network infrastructure plans</p>
              </div>
            </div>
            <Link to={'/network/tools'}>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 glow-hover">
                <Network className="w-5 h-5 mr-2" />
                Create New Plan
              </Button>
            </Link>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-4">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card border-white/10 rounded-2xl p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center glass glow">
              <BookMarked className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No Network Plans Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first network plan using the Network Builder tool
            </p>
            <Link to={'network/tools'}>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Network className="w-4 h-4 mr-2" />
                Start Planning
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatePresence>
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card border-white/10 hover:border-white/20 transition-all group glow-hover">
                    <CardHeader className="border-b border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">{plan.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(plan.created_date!).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600">
                          {facilityLabels[plan.facility_size]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass-card border-white/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-gray-400">Total Devices</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{plan.total_devices || (plan.wired_devices + plan.wireless_devices)}</p>
                        </div>
                        <div className="glass-card border-white/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Building className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-gray-400">VLANs</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{plan.vlan_config?.length || 0}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {plan.wired_devices > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Wired Devices:</span>
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                              {plan.wired_devices}
                            </Badge>
                          </div>
                        )}
                        {plan.wireless_devices > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Wireless Devices:</span>
                            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                              {plan.wireless_devices}
                            </Badge>
                          </div>
                        )}
                        {plan.cameras! > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Cameras:</span>
                            <Badge variant="outline" className="border-green-500/30 text-green-400">
                              {plan.cameras}
                            </Badge>
                          </div>
                        )}
                        {plan.poe_budget! > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">PoE Budget:</span>
                            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                              {plan.poe_budget}W
                            </Badge>
                          </div>
                        )}
                      </div>

                      {plan.ip_scheme && (
                        <div className="glass-card border-blue-500/20 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-400 mb-2">Network</p>
                          <code className="text-sm text-blue-400 font-mono">{plan.ip_scheme.base}</code>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 glass border-white/10 hover:bg-white/10 text-white"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(plan.id)}
                          className="glass border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedNetworkPlans;