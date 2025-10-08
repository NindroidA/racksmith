import { BookMarked, ChevronLeft, ChevronRight, Layers, LayoutGrid, Library, Map, Server, Wrench } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Rack Configurations", url: "/racks", icon: Layers },
  { title: "Device Library", url: "/devices/library", icon: Library },
  { title: "Device Options", url: "/devices/options", icon: Server },
  { title: "Floor Plan", url: "/network/floor-plan", icon: Map },
  { title: "Network Tools", url: "/network/tools", icon: Wrench },
  { title: "Saved Plans", url: "/network/plans", icon: BookMarked },
];

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <style>{`
        body { background: #0d1117; margin: 0; padding: 0; }
        
        .glass {
          background: rgba(20, 25, 35, 0.7);
          backdrop-filter: blur(24px) saturate(200%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
        }
        
        .glass-card {
          background: linear-gradient(135deg, rgba(25, 30, 40, 0.75) 0%, rgba(20, 25, 35, 0.85) 100%);
          backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
        }
        
        .glass-sidebar {
          background: linear-gradient(180deg, rgba(13, 17, 23, 0.95) 0%, rgba(22, 27, 34, 0.98) 100%);
          backdrop-filter: blur(24px) saturate(180%);
          border-right: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 4px 0 24px 0 rgba(0, 0, 0, 0.4);
        }

        .glass-button {
          background: rgba(20, 25, 35, 0.6);
          backdrop-filter: blur(20px) saturate(200%);
          border: 1px solid rgba(148, 163, 184, 0.25);
          transition: all 0.3s ease;
        }

        .glass-button:hover {
          background: rgba(30, 35, 45, 0.7);
          border-color: rgba(148, 163, 184, 0.35);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #06b6d4 70%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        
        @keyframes shimmer {
          to { background-position: 200% center; }
        }
        
        .glow {
          box-shadow: 0 0 20px rgba(96, 165, 250, 0.4), 0 0 40px rgba(167, 139, 250, 0.2);
        }
        
        .glow-hover:hover {
          box-shadow: 0 0 30px rgba(96, 165, 250, 0.6), 0 0 60px rgba(167, 139, 250, 0.3);
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(20, 25, 35, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        }
        
        .frosted {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <div className="min-h-screen flex w-full" style={{ background: '#0d1117' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50 rounded-r-xl px-2 py-6 hover:opacity-90 transition-all duration-300 group glass-sidebar border-l-0"
          style={{ borderLeft: 'none', marginLeft: sidebarOpen ? '256px' : '0px', transition: 'margin-left 0.3s ease' }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors" style={{ writingMode: 'vertical-rl' }}>MENU</div>
            {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />}
          </div>
        </button>

        <aside className="fixed left-0 top-0 bottom-0 w-64 glass-sidebar z-40 transition-transform duration-300 ease-in-out" style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
          <div className="flex flex-col h-full">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg glow relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  <Layers className="w-6 h-6 text-white relative z-10" />
                </div>
                <div>
                  <h2 className="font-bold text-xl gradient-text">RackSmith</h2>
                  <p className="text-xs text-gray-400">Network Manager</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 overflow-auto p-3 custom-scrollbar">
              <ul className="space-y-1">
                {navigationItems.map((item) => (
                  <li key={item.title}>
                    <Link to={item.url} className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${location.pathname === item.url ? 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <main className="flex-1 flex flex-col transition-all duration-300 ease-in-out" style={{ marginLeft: sidebarOpen ? '256px' : '0px' }}>
          <div className="flex-1 overflow-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </>
  );
}