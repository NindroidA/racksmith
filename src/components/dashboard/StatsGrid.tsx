import { motion } from "framer-motion";
import { Activity, Layers, Server, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="glass-card border-white/10 overflow-hidden group hover:border-white/20 glow-hover cursor-pointer">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className={`w-full h-full bg-gradient-to-br ${color} rounded-full blur-3xl`} />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">{label}</p>
            <p className="text-4xl font-bold text-white mb-1">{value}</p>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <TrendingUp className="w-3 h-3" />
              <span>+12% from last month</span>
            </div>
          </div>
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} group-hover:scale-110 transition-transform duration-300 glow relative overflow-hidden`}>
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
            <Icon className="w-7 h-7 text-white relative z-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface StatsGridProps {
  totalRacks: number;
  totalDevices: number;
  utilizationPercent: number;
  isLoading: boolean;
}

const StatsGrid: React.FC<StatsGridProps> = ({ totalRacks, totalDevices, utilizationPercent, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-white/10">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={Layers}
        label="Total Racks"
        value={totalRacks}
        color="from-blue-500 to-blue-600"
        delay={0}
      />
      <StatCard
        icon={Server}
        label="Total Devices"
        value={totalDevices}
        color="from-purple-500 to-purple-600"
        delay={0.1}
      />
      <StatCard
        icon={Activity}
        label="Utilization"
        value={`${utilizationPercent}%`}
        color="from-cyan-500 to-cyan-600"
        delay={0.2}
      />
      <StatCard
        icon={TrendingUp}
        label="Efficiency"
        value={totalRacks > 0 ? "Optimal" : "—"}
        color="from-green-500 to-emerald-600"
        delay={0.3}
      />
    </div>
  );
}

export default StatsGrid;