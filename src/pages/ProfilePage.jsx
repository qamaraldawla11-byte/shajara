import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Link as LinkIcon, LogOut, Save, Shield, Unlink, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getUserFamilies } from '../services/familyService';
import { getMembers, updateMember } from '../services/memberService';
import { updateAccountPassword, updateUserProfile } from '../services/authService';
import { uploadProfilePhoto } from '../services/storageService';
import { getErrorMessage, reportError } from '../services/errorService';
import { withTimeout } from '../utils/asyncTimeout';
import { LoadingState } from '../components/ui/AsyncState';

export default function ProfilePage() {
  const { user, userDoc, refreshUserDoc, logout } = useAuth();
  const { theme, setTheme, options } = useTheme();
  const { i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(userDoc?.display_name || '');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [saving, setSaving] = useState(false);

  const providers = user?.app_metadata?.providers || [];
  const canChangePassword = providers.includes('email') || user?.aud === 'authenticated';
  const linkedMember = useMemo(() => members.find((member) => member.linkedUserId === user?.id), [members, user?.id]);

  useEffect(() => {
    setDisplayName(userDoc?.display_name || user?.user_metadata?.full_name || user?.email || '');
  }, [userDoc?.display_name, user?.email, user?.user_metadata?.full_name]);

  useEffect(() => {
    loadFamilies();
  }, [user?.id]);

  useEffect(() => {
    if (selectedFamilyId) loadMembers(selectedFamilyId);
  }, [selectedFamilyId]);

  async function loadFamilies() {
    if (!user?.id) return;
    try {
      setLoadingLinks(true);
      const data = await withTimeout(getUserFamilies(), 10000, 'Loading profile families');
      setFamilies(data);
      setSelectedFamilyId((current) => current || data[0]?.id || '');
    } catch (error) {
      reportError(error, 'Profile families');
      toast.error(getErrorMessage(error, 'Failed to load your families.'));
    } finally {
      setLoadingLinks(false);
    }
  }

  async function loadMembers(familyId) {
    try {
      setLoadingLinks(true);
      const data = await withTimeout(getMembers(familyId), 10000, 'Loading family members');
      setMembers(data);
    } catch (error) {
      reportError(error, 'Profile members');
      toast.error(getErrorMessage(error, 'Failed to load family members.'));
    } finally {
      setLoadingLinks(false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);
    try {
      let photoUrl;
      if (photoFile) {
        photoUrl = await uploadProfilePhoto({ userId: user.id, file: photoFile });
      }
      await updateUserProfile(user.id, { displayName, photoUrl });
      await refreshUserDoc();
      setPhotoFile(null);
      toast.success('Profile updated.');
    } catch (error) {
      reportError(error, 'Update profile');
      toast.error(getErrorMessage(error, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await updateAccountPassword(password);
      setPassword('');
      toast.success('Password updated.');
    } catch (error) {
      reportError(error, 'Update password');
      toast.error(getErrorMessage(error, 'Failed to update password.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLink(member) {
    try {
      await updateMember(selectedFamilyId, member.id, { linkedUserId: user.id });
      await loadMembers(selectedFamilyId);
      toast.success('Account linked to tree member.');
    } catch (error) {
      reportError(error, 'Link member');
      toast.error(getErrorMessage(error, 'You may not have permission to link this member.'));
    }
  }

  async function handleUnlink(member) {
    try {
      await updateMember(selectedFamilyId, member.id, { linkedUserId: null });
      await loadMembers(selectedFamilyId);
      toast.success('Account unlinked from member.');
    } catch (error) {
      reportError(error, 'Unlink member');
      toast.error(getErrorMessage(error, 'You may not have permission to unlink this member.'));
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="profile-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Settings</h1>
          <p className="page-subtitle">Manage your account, preferences, and tree identity.</p>
        </div>
      </div>

      <div className="profile-grid">
        <form className="card profile-panel" onSubmit={handleSaveProfile}>
          <div className="profile-avatar-row">
            {userDoc?.photo_url || user?.user_metadata?.avatar_url ? (
              <img className="avatar avatar-xl" src={userDoc?.photo_url || user?.user_metadata?.avatar_url} alt="" />
            ) : (
              <div className="avatar avatar-xl avatar-placeholder"><UserRound size={30} /></div>
            )}
            <label className="btn btn-secondary btn-sm">
              <Camera size={15} />
              Photo
              <input type="file" accept="image/*" hidden onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
            </label>
          </div>

          <label className="form-label">Display name</label>
          <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />

          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || ''} readOnly />

          <button className="btn btn-primary" disabled={saving || !displayName.trim()}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        <div className="card profile-panel">
          <h3><Shield size={18} /> Security</h3>
          {canChangePassword ? (
            <form onSubmit={handlePasswordChange} className="profile-form-stack">
              <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
              <button className="btn btn-secondary" disabled={saving || !password}>Change password</button>
            </form>
          ) : (
            <p className="text-muted">Password changes are managed by your sign-in provider.</p>
          )}
          <button className="btn btn-ghost danger-action" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>

        <div className="card profile-panel">
          <h3>Preferences</h3>
          <label className="form-label">Theme</label>
          <select className="form-input" value={theme} onChange={(event) => setTheme(event.target.value)}>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <label className="form-label">Language</label>
          <select className="form-input" value={i18n.language?.startsWith('ar') ? 'ar' : 'en'} onChange={(event) => i18n.changeLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>

        <div className="card profile-panel profile-link-panel">
          <h3><LinkIcon size={18} /> Link account to tree member</h3>
          {families.length > 0 && (
            <select className="form-input" value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)}>
              {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
          )}
          {loadingLinks ? (
            <LoadingState label="Loading tree members..." />
          ) : members.length === 0 ? (
            <p className="text-muted">No members found in this family.</p>
          ) : (
            <div className="profile-member-list">
              {members.map((member) => {
                const isLinkedToUser = member.linkedUserId === user.id;
                const isLinkedToOther = member.linkedUserId && !isLinkedToUser;
                const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
                return (
                  <div className="profile-member-row" key={member.id}>
                    <span dir="auto">{fullName}</span>
                    {isLinkedToUser ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUnlink(member)}><Unlink size={14} /> Unlink</button>
                    ) : (
                      <button className="btn btn-secondary btn-sm" disabled={isLinkedToOther || !!linkedMember} onClick={() => handleLink(member)}>
                        <LinkIcon size={14} /> {isLinkedToOther ? 'Linked' : 'Link'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
