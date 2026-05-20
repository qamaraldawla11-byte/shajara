import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GitBranch, HeartHandshake, Lock, MessageSquare, Share2, ShieldCheck, Sparkles, TreePine, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ui/ThemeToggle';

const features = [
  {
    icon: TreePine,
    title: 'Beautiful family trees',
    text: 'Create a living map of parents, children, spouses, and generations in one private workspace.',
  },
  {
    icon: Users,
    title: 'Collaborative profiles',
    text: 'Invite relatives to help complete names, photos, stories, and key family details.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    text: 'Family spaces are protected behind member access, roles, and invite-only collaboration.',
  },
];

const steps = [
  'Create a private family workspace',
  'Add relatives, photos, and relationships',
  'Invite trusted family members to collaborate',
];

const trustSignals = [
  { icon: ShieldCheck, label: 'Invite-only access' },
  { icon: Lock, label: 'Role-based permissions' },
  { icon: HeartHandshake, label: 'Built for family stewardship' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const primaryTarget = isAuthenticated ? '/dashboard' : '/login';

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary">
        <Link to="/" className="landing-brand">
          <TreePine size={30} />
          <span>Shajara</span>
        </Link>
        <div className="landing-nav-actions">
          <ThemeToggle className="public-theme-toggle" />
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to={primaryTarget} className="btn btn-primary">
            {isAuthenticated ? 'Open dashboard' : 'Get started'}
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-kicker">
            <Sparkles size={16} />
            Private family network
          </div>
          <h1>Preserve your family story in one beautiful, shared place.</h1>
          <p>
            Shajara brings your family tree, memories, and trusted relatives together
            in a private space built for heritage that lasts.
          </p>
          <div className="landing-hero-actions">
            <Link to={primaryTarget} className="btn btn-primary btn-lg">
              {isAuthenticated ? 'Go to dashboard' : 'Start your tree'}
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Continue with Google</Link>
          </div>
          <p className="landing-hero-note">
            Start with one person, then let parents, siblings, cousins, and stories find their place.
          </p>
        </div>

        <div className="landing-preview" aria-label="Family tree preview">
          <div className="preview-header">
            <div>
              <span>Al Noor Family</span>
              <small>Private heritage workspace</small>
            </div>
            <span className="badge badge-primary">Live tree</span>
          </div>
          <div className="preview-tree">
            <div className="preview-person root">Grandparents</div>
            <div className="preview-line"></div>
            <div className="preview-row">
              <div className="preview-person">Amina</div>
              <div className="preview-person accent">Omar</div>
            </div>
            <div className="preview-line"></div>
            <div className="preview-row small">
              <div className="preview-person">Maya</div>
              <div className="preview-person">Yusuf</div>
              <div className="preview-person">Nour</div>
            </div>
          </div>
          <div className="preview-stats">
            <div>
              <strong>84</strong>
              <span>Members</span>
            </div>
            <div>
              <strong>5</strong>
              <span>Generations</span>
            </div>
            <div>
              <strong>12</strong>
              <span>Invites</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-feature-grid" aria-label="Features">
        {features.map(({ icon: Icon, title, text }) => (
          <article className="landing-feature-card" key={title}>
            <div className="landing-feature-icon">
              <Icon size={22} />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="landing-workflow">
        <div>
          <span className="landing-section-label">Built for real families</span>
          <h2>From first member to full family network.</h2>
        </div>
        <div className="landing-workflow-list">
          <div>
            <GitBranch size={20} />
            <span>Create structured trees</span>
          </div>
          <div>
            <Share2 size={20} />
            <span>Share invite codes safely</span>
          </div>
          <div>
            <MessageSquare size={20} />
            <span>Keep family conversations close</span>
          </div>
        </div>
      </section>

      <section className="landing-onboarding" aria-label="How Shajara works">
        <div className="landing-onboarding-copy">
          <span className="landing-section-label">Simple beginning</span>
          <h2>Start with one person. Let the story grow with everyone.</h2>
          <p>
            Shajara is designed for families who want privacy first, but still need an
            easy way for relatives to help fill in the people, places, and memories that matter.
          </p>
        </div>
        <div className="landing-step-list">
          {steps.map((step, index) => (
            <div className="landing-step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-trust" aria-label="Trust and privacy">
        {trustSignals.map(({ icon: Icon, label }) => (
          <div className="landing-trust-item" key={label}>
            <Icon size={18} />
            <span>{label}</span>
          </div>
        ))}
        <Link to={primaryTarget} className="btn btn-primary">
          {isAuthenticated ? 'Continue building' : 'Create your private tree'}
          <CheckCircle2 size={16} />
        </Link>
      </section>
    </main>
  );
}
