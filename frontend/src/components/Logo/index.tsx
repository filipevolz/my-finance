import logoImage from '../../assets/logo.png';
import { LogoContainer, LogoImage, LogoText } from './styles';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ size = 'medium' }: LogoProps) {
  const sizes = {
    small: { img: 2, text: 1.5 },
    medium: { img: 3, text: 2 },
    large: { img: 4, text: 2.5 },
  };

  const currentSize = sizes[size];

  return (
    <LogoContainer>
      <LogoImage src={logoImage} alt="MyFinance Logo" />
      <LogoText $fontSize={currentSize.text}>
        <span className="my">My</span>
        <span className="finance">Finance</span>
      </LogoText>
    </LogoContainer>
  );
}
