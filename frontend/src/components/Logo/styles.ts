import styled from 'styled-components';

export const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const LogoImage = styled.img`
  height: 6rem;
  width: auto;
`;

export interface LogoTextProps {
  $fontSize: number;
}

export const LogoText = styled.h1<LogoTextProps>`
  font-size: ${(props) => `${props.$fontSize}rem`};
  font-weight: 600;
  margin-left: -3rem;

  .my {
    color: #4ade80;
  }

  .finance {
    color: #3b82f6;
  }
`;
