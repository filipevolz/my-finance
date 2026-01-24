import styled from 'styled-components';
import { Avatar } from '@/components/ui/avatar';

export const HeaderContainer = styled.header`
  background-color: ${(props) => props.theme.surface};
  padding: 3rem 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 0.0625rem solid ${(props) => props.theme.border};
  box-shadow: 0 0.0625rem 0.1875rem ${(props) => props.theme.shadow};
  transition:
  background-color 0.3s ease,
  border-color 0.3s ease;

  @media (max-width: 768px) {
    padding: 1.5rem 2rem;
  }
`;

export const NavMenu = styled.nav`
  display: flex;
  gap: 2rem;
  align-items: center;
  flex: 1;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const NavItemIconButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.textSecondary};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: none;

  @media (max-width: 768px) {
    display: flex;
  }
`;

export const NavItem = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${(props) =>
    props.$active ? props.theme.primary : props.theme.textSecondary};
  font-size: 1rem;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  cursor: pointer;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s;

  &:hover {
    color: ${(props) => props.theme.primary};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.25rem;
    border-radius: 0.25rem;
  }

  ${(props) =>
    props.$active &&
    `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 0.1875rem;
      background-color: ${props.theme.primary};
    }
  `}
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.textSecondary};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s,
    color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceSecondary};
    color: ${(props) => props.theme.text};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

export const StyledAvatar = styled(Avatar)`
  border-radius: 50%;
  overflow: hidden;

  [data-slot='avatar-fallback'] {
    background-color: ${(props) => props.theme.primary};
    color: ${(props) => props.theme.text};
    font-weight: 600;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;
