import { Activity, BookMarked, ChevronLeft, ChevronRight, Layers, LayoutGrid, Library, LogOut, Map, Server, User, Wrench } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { LayoutProps } from '../types/components';
import Footer from './Footer';

/* Navigation Items */
const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
  { title: 'Rack Configurations', url: '/racks', icon: Layers },
  { title: 'Device Library', url: '/devices/library', icon: Library },
  { title: 'Device Options', url: '/devices/options', icon: Server },
  { title: 'Floor Plan', url: '/network/floor-plan', icon: Map },
  { title: 'Network Tools', url: '/network/tools', icon: Wrench },
  { title: 'Saved Plans', url: '/network/plans', icon: BookMarked },
  { title: 'Activity History', url: '/activity', icon: Activity },
  { title: 'User Profile', url: '/profile', icon: User },
];

/**
 * Main layout component with global navigation sidebar.
 * Provides consistent layout across all protected routes.
 */
export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { menuSidebarOpen, setMenuSidebarOpen } = useSidebar();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex w-full" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)' }}>
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setMenuSidebarOpen(!menuSidebarOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[70] rounded-r-xl px-2 py-6 hover:opacity-90 transition-all duration-300 group glass-menu-sidebar border-l-0"
        style={{
          borderLeft: 'none',
          marginLeft: menuSidebarOpen ? '256px' : '0px',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors" style={{ writingMode: 'vertical-rl' }}>
            MENU
          </div>
          {menuSidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          )}
        </div>
      </button>

      {/* Main Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-64 z-[60] transition-transform duration-300 ease-in-out glass-menu-sidebar"
        style={{ transform: menuSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg glow relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                <Layers className="w-6 h-6 text-white relative z-10" />
              </div>
              <div>
                <h2 className="font-bold text-xl gradient-text-linear">RackSmith</h2>
                <p className="text-xs text-slate-400">Network Manager</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
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
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
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

          {/* Sign Out Button */}
          <div className="border-t border-white/10 p-3">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-red-500/15 hover:text-red-400 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: menuSidebarOpen ? '256px' : '0px' }}
      >
        <div className="flex-1 overflow-auto">
          {children || <Outlet />}
        </div>
        <Footer />
      </main>
    </div>
  );
}