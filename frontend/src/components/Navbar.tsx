import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { FaGithub } from 'react-icons/fa';

export default function Navbar() {
  return (
    <nav className="h-16 flex items-center justify-between px-6 border-b border-panel-border bg-bg-main/80 backdrop-blur-md z-50 sticky top-0">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-accent transition-colors">
          VizLang
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          to="/editor" 
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Editor
        </Link>

        <ThemeToggle />

        <a 
          href="https://github.com/s4nj1th/vizlang" 
          target="_blank" 
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <FaGithub size={18} />
        </a>
      </div>
    </nav>
  );
}
