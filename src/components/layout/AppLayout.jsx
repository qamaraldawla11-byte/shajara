import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TreePine, LayoutDashboard, LogOut, Users, MessageSquare, ChevronDown, Menu, X as CloseIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getUserFamilies } from '../../services/familyService';
import { reportError } from '../../services/errorService';

export default function AppLayout() {
  const { user, userDoc, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [families, setFamilies] = useState([]);
  const [showFamilies, setShowFamilies] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadFamilies();
    } else {
      setFamilies([]);
    }
  }, [user?.id, userDoc?.updated_at]);

  async function loadFamilies() {
    try {
      const data = await getUserFamilies();
      setFamilies(data);
    } catch (err) {
      reportError(err, 'Load sidebar families');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`app-layout ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Nav Header */}
      <div className="mobile-nav-header">
        <div className="sidebar-brand">
          <TreePine size={24} />
          <span>Shajara</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar / Drawer */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand desktop-only">
          <TreePine size={28} />
          <span>Shajara</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>{t('common.dashboard')}</span>
          </NavLink>

          {families.length > 0 && (
            <div className="sidebar-section">
              <button 
                className="sidebar-section-header" 
                onClick={() => setShowFamilies(!showFamilies)}
              >
                <Users size={18} />
                <span>{t('dashboard.families')}</span>
                <ChevronDown size={14} style={{ transform: showFamilies ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              
              {showFamilies && (
                <div className="sidebar-section-content">
                  {families.map(family => (
                    <NavLink 
                      key={family.id} 
                      to={`/family/${family.id}`} 
                      className={({ isActive }) => `sidebar-link sub-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="dot" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                      <span>{family.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <MessageSquare size={18} />
            <span>{t('common.chat')}</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {userDoc?.photo_url || user?.user_metadata?.avatar_url ? (
              <img src={userDoc?.photo_url || user?.user_metadata?.avatar_url} alt="" className="avatar" />
            ) : (
              <div className="avatar avatar-placeholder">{userDoc?.display_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0]}</div>
            )}
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{userDoc?.display_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0]}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Sign out" id="logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
