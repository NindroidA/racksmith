import { BookMarked, ChevronLeft, ChevronRight, Layers, LayoutGrid, Library, Map, Server, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutProps } from '../types/components';

const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
  { title: 'Rack Configurations', url: '/racks', icon: Layers },
  { title: 'Device Library', url: '/devices/library', icon: Library },
  { title: 'Device Options', url: '/devices/options', icon: Server },
  { title: 'Floor Plan', url: '/network/floor-plan', icon: Map },
  { title: 'Network Tools', url: '/network/tools', icon: Wrench },
  { title: 'Saved Plans', url: '/network/plans', icon: BookMarked },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <div className="min-h-screen flex w-full" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)' }}>
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
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <li key={item.title}>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-400' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
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