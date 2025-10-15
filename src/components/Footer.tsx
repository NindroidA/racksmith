import packageJson from '../../package.json';

const version = packageJson.version;

/**
 * Global footer component displaying developer info and version.
 * Apple-style glassmorphic design with frosted glass effect.
 */
export default function Footer() {
  return (
    <footer className="w-full py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <div 
          className="rounded-2xl py-6 px-8 border"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderColor: 'rgba(255, 255, 255, 0.18)',
            boxShadow: `
              0 8px 32px 0 rgba(31, 38, 135, 0.37),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.15),
              0 0 0 1px rgba(255, 255, 255, 0.05)
            `,
          }}
        >
          <p className="text-center text-base text-gray-200">
            ⚒️ Developed by{' '}
            <span 
              className="font-semibold"
              style={{
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e9d5ff 50%, #f5d0fe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Andrew Curtis
            </span>
            {' '} • {' '}
            <span className="text-white">Version</span>{' '}
            <span className="font-medium gradient-text">v{version}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
