import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Moon, Sun, LogOut, User, Menu, ChartLine, List, LayoutDashboard, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Logo } from '../Logo';
import { AvatarFallback } from '@/components/ui/avatar';
import {
  HeaderContainer,
  NavMenu,
  NavItem,
  HeaderActions,
  IconButton,
  StyledAvatar,
  NavItemIconButton,
} from './styles';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getActiveNav = (): string => {
    if (location.pathname === '/dashboard') {
      return 'dashboard';
    }
    if (location.pathname === '/transactions') {
      return 'transactions';
    }
    if (location.pathname === '/analytics') {
      return 'analytics';
    }
    if (location.pathname === '/investments') {
      return 'investments';
    }
    return 'dashboard';
  };

  const activeNav = getActiveNav();

  const handleNavClick = (nav: string) => {
    if (nav === 'dashboard') {
      navigate('/dashboard');
    } else if (nav === 'transactions') {
      navigate('/transactions');
    } else if (nav === 'analytics') {
      navigate('/analytics');
    } else if (nav === 'investments') {
      navigate('/investments');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <HeaderContainer>
      <button type="button" onClick={() => navigate('/dashboard')}>
        <Logo size="large" />
      </button>

      <NavItemIconButton type="button" aria-label="Menu">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Menu size={20} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleNavClick('dashboard')}>
              <LayoutDashboard size={20} />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavClick('transactions')}>
              <List size={20} />
              Transações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavClick('analytics')}>
              <ChartLine size={20} />
              Análises
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavClick('account')}>
              <User size={20} />
              Conta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme} aria-label="Trocar tema">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              Trocar tema
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut size={20} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </NavItemIconButton>
      <NavMenu>
        <NavItem
          $active={activeNav === 'dashboard'}
          onClick={() => handleNavClick('dashboard')}
        >
          Dashboard
        </NavItem>
        <NavItem
          $active={activeNav === 'transactions'}
          onClick={() => handleNavClick('transactions')}
        >
          Transações
        </NavItem>
        <NavItem
          $active={activeNav === 'analytics'}
          onClick={() => handleNavClick('analytics')}
        >
          Análises
        </NavItem>
        {/* <NavItem
          $active={activeNav === 'investments'}
          onClick={() => handleNavClick('investments')}
        >
          Investimentos
        </NavItem> */}
      </NavMenu>
      <HeaderActions>
        <IconButton
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
          }
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </IconButton>
        {/* <IconButton type="button" aria-label="Notificações">
          <Bell size={20} />
        </IconButton> */}
        <DropdownMenu aria-label="Configurações">
          <DropdownMenuTrigger>
            <IconButton type="button" aria-label="Configurações">
              <Settings size={20} />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <User size={20} />
              Conta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/cards')}>
              <CreditCard size={20} />
              Cartões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut size={20} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <StyledAvatar>
          <AvatarFallback>
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </StyledAvatar>
      </HeaderActions>
    </HeaderContainer>
  );
}
