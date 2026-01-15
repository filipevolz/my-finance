import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bell, Moon, Sun } from 'lucide-react';
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
} from './styles';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
      <Logo size="medium" />
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
        <NavItem
          $active={activeNav === 'investments'}
          onClick={() => handleNavClick('investments')}
        >
          Investimentos
        </NavItem>
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
        <IconButton type="button" aria-label="Notificações">
          <Bell size={20} />
        </IconButton>
        <IconButton type="button" aria-label="Configurações">
          <Settings size={20} />
        </IconButton>
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
